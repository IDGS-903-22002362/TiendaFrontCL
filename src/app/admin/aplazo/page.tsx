"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle,
  Clock3,
  Plus,
  QrCode,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { fetchProducts } from "@/lib/api/storefront";
import { paymentsApi } from "@/lib/api/payments";
import {
  getAplazoPaymentErrorMessage,
  getApiErrorMessage,
} from "@/lib/api/errors";
import {
  getAplazoStatusDescription,
  getAplazoStatusLabel,
  isAplazoRetryableStatus,
  normalizeAplazoStatus,
} from "@/lib/aplazo";
import type {
  AplazoInStoreCreatePayload,
  AplazoInStoreCreateResponse,
  AplazoPaymentStatusResponse,
  Product,
} from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  EntityPicker,
  type EntityOption,
} from "@/components/admin/entity-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type InStoreItemDraft = {
  productoId: string;
  label: string;
  cantidad: number;
  tallaId?: string;
};

function getStatusVariant(status?: string) {
  if (normalizeAplazoStatus(status) === "PAID") {
    return "default";
  }
  if (isAplazoRetryableStatus(status)) {
    return "destructive";
  }
  return "secondary";
}

function getStatusIcon(status?: string) {
  if (normalizeAplazoStatus(status) === "PAID") {
    return CheckCircle;
  }
  if (isAplazoRetryableStatus(status)) {
    return AlertCircle;
  }
  return Clock3;
}

export default function AdminAplazoPage() {
  const { role, user } = useAuth();
  const { toast } = useToast();

  const canUseAplazo = role === "ADMIN" || role === "EMPLEADO";

  const [products, setProducts] = useState<Product[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const [posSessionId, setPosSessionId] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [cajaId, setCajaId] = useState("");
  const [sucursalId, setSucursalId] = useState("");
  const [vendedorUid, setVendedorUid] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [commChannel, setCommChannel] = useState("q");

  const [productQuery, setProductQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedQuantity, setSelectedQuantity] = useState("1");
  const [selectedTallaId, setSelectedTallaId] = useState("");
  const [items, setItems] = useState<InStoreItemDraft[]>([]);

  const [attempt, setAttempt] = useState<AplazoInStoreCreateResponse | null>(null);
  const [paymentStatus, setPaymentStatus] =
    useState<AplazoPaymentStatusResponse | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);

  useEffect(() => {
    if (!vendedorUid && typeof user?.uid === "string" && user.uid) {
      setVendedorUid(user.uid);
    }
  }, [user?.uid, vendedorUid]);

  useEffect(() => {
    if (!canUseAplazo) {
      return;
    }

    let isCancelled = false;

    const loadCatalog = async () => {
      setCatalogLoading(true);
      try {
        const nextProducts = await fetchProducts();
        if (!isCancelled) {
          setProducts(nextProducts);
        }
      } catch (error) {
        if (!isCancelled) {
          toast({
            variant: "destructive",
            title: "No se pudo cargar el catálogo",
            description: getApiErrorMessage(error),
          });
        }
      } finally {
        if (!isCancelled) {
          setCatalogLoading(false);
        }
      }
    };

    void loadCatalog();

    return () => {
      isCancelled = true;
    };
  }, [canUseAplazo, toast]);

  const productOptions: EntityOption[] = useMemo(
    () =>
      products.map((product) => ({
        id: product.id,
        label: product.name,
        subtitle: product.description,
      })),
    [products],
  );

  const currentStatus = paymentStatus?.status ?? attempt?.status;
  const currentAttemptId =
    paymentStatus?.paymentAttemptId ?? attempt?.paymentAttemptId ?? "";
  const currentExpiresAt = paymentStatus?.expiresAt ?? attempt?.expiresAt ?? null;
  const StatusIcon = getStatusIcon(currentStatus);

  const syncPaymentStatus = useCallback(
    async (paymentAttemptId: string) => {
      const nextStatus = await paymentsApi.getAplazoPaymentStatus(paymentAttemptId);
      setPaymentStatus(nextStatus);
      setStatusError("");
      return nextStatus;
    },
    [],
  );

  useEffect(() => {
    if (!attempt?.paymentAttemptId) {
      return;
    }

    let isCancelled = false;
    let timeoutId: number | undefined;

    const pollStatus = async () => {
      try {
        const nextStatus = await syncPaymentStatus(attempt.paymentAttemptId);
        if (isCancelled) {
          return;
        }

        if (!nextStatus.isTerminal) {
          timeoutId = window.setTimeout(
            () => void pollStatus(),
            nextStatus.nextPollAfterMs ?? 3000,
          );
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setStatusError(getAplazoPaymentErrorMessage(error, "in_store"));
      }
    };

    void pollStatus();

    return () => {
      isCancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [attempt?.paymentAttemptId, syncPaymentStatus]);

  const handleAddItem = () => {
    const quantity = Number(selectedQuantity);
    const selectedProduct = products.find(
      (product) => product.id === selectedProductId,
    );

    if (!selectedProductId || !selectedProduct) {
      toast({
        variant: "destructive",
        title: "Producto requerido",
        description: "Selecciona un producto antes de agregarlo al intento.",
      });
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast({
        variant: "destructive",
        title: "Cantidad inválida",
        description: "La cantidad debe ser mayor a cero.",
      });
      return;
    }

    setItems((currentItems) => {
      const existingIndex = currentItems.findIndex(
        (item) =>
          item.productoId === selectedProductId &&
          (item.tallaId ?? "") === selectedTallaId.trim(),
      );

      if (existingIndex === -1) {
        return [
          ...currentItems,
          {
            productoId: selectedProductId,
            label: selectedProduct.name,
            cantidad: Math.trunc(quantity),
            tallaId: selectedTallaId.trim() || undefined,
          },
        ];
      }

      return currentItems.map((item, index) =>
        index === existingIndex
          ? {
              ...item,
              cantidad: item.cantidad + Math.trunc(quantity),
            }
          : item,
      );
    });

    setSelectedProductId("");
    setSelectedQuantity("1");
    setSelectedTallaId("");
  };

  const handleRemoveItem = (indexToRemove: number) => {
    setItems((currentItems) =>
      currentItems.filter((_, index) => index !== indexToRemove),
    );
  };

  const handleCreateAttempt = async () => {
    if (!canUseAplazo) {
      return;
    }

    if (
      !posSessionId.trim() ||
      !deviceId.trim() ||
      !cajaId.trim() ||
      !sucursalId.trim() ||
      !vendedorUid.trim()
    ) {
      setSubmitError(
        "Completa los identificadores POS obligatorios antes de crear el intento.",
      );
      return;
    }

    if (items.length === 0) {
      setSubmitError("Agrega al menos un producto antes de crear el intento.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    setStatusError("");

    const customerPayload = {
      ...(customerName.trim() ? { name: customerName.trim() } : {}),
      ...(customerEmail.trim() ? { email: customerEmail.trim() } : {}),
      ...(customerPhone.trim() ? { phone: customerPhone.trim() } : {}),
    };

    const payload: AplazoInStoreCreatePayload = {
      posSessionId: posSessionId.trim(),
      deviceId: deviceId.trim(),
      cajaId: cajaId.trim(),
      sucursalId: sucursalId.trim(),
      vendedorUid: vendedorUid.trim(),
      ...(Object.keys(customerPayload).length > 0
        ? { customer: customerPayload }
        : {}),
      items: items.map((item) => ({
        productoId: item.productoId,
        cantidad: item.cantidad,
        ...(item.tallaId ? { tallaId: item.tallaId } : {}),
      })),
      metadata: commChannel ? { commChannel } : undefined,
    };

    try {
      const nextAttempt = await paymentsApi.createAplazoInStoreAttempt(
        payload,
        crypto.randomUUID(),
      );

      setAttempt(nextAttempt);
      setPaymentStatus(null);
      toast({
        title: "Intento Aplazo creado",
        description:
          "El intento in-store quedó creado. Seguiremos consultando su estado automáticamente.",
      });
    } catch (error) {
      setSubmitError(getAplazoPaymentErrorMessage(error, "in_store"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (!attempt?.paymentAttemptId) {
      return;
    }

    setIsRefreshingStatus(true);
    try {
      await syncPaymentStatus(attempt.paymentAttemptId);
    } catch (error) {
      setStatusError(getAplazoPaymentErrorMessage(error, "in_store"));
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  const handleResetAttempt = () => {
    setAttempt(null);
    setPaymentStatus(null);
    setSubmitError("");
    setStatusError("");
  };

  if (!canUseAplazo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aplazo POS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Tu sesión no tiene permisos para operar intentos Aplazo in-store.</p>
          <p>
            Si necesitas acceso, inicia sesión con un usuario `ADMIN` o `EMPLEADO`.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-secondary">
            Aplazo POS
          </p>
          <h1 className="mt-2 font-headline text-3xl font-bold">
            Operación in-store
          </h1>
          <p className="text-sm text-muted-foreground">
            Genera intentos Aplazo para tienda física y sigue el cobro con link,
            QR y polling de estado.
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          Rol actual: {role}
        </Badge>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.95fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Datos POS</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pos-session-id">POS Session ID</Label>
                <Input
                  id="pos-session-id"
                  value={posSessionId}
                  onChange={(event) => setPosSessionId(event.target.value)}
                  placeholder="sesion_123"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="device-id">Device ID</Label>
                <Input
                  id="device-id"
                  value={deviceId}
                  onChange={(event) => setDeviceId(event.target.value)}
                  placeholder="device_1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="caja-id">Caja ID</Label>
                <Input
                  id="caja-id"
                  value={cajaId}
                  onChange={(event) => setCajaId(event.target.value)}
                  placeholder="caja_1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sucursal-id">Sucursal ID</Label>
                <Input
                  id="sucursal-id"
                  value={sucursalId}
                  onChange={(event) => setSucursalId(event.target.value)}
                  placeholder="sucursal_1"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="vendedor-uid">Vendedor UID</Label>
                <Input
                  id="vendedor-uid"
                  value={vendedorUid}
                  onChange={(event) => setVendedorUid(event.target.value)}
                  placeholder="uid_vendedor"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cliente y canal</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="customer-name">Nombre</Label>
                <Input
                  id="customer-name"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Cliente POS"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-email">Email</Label>
                <Input
                  id="customer-email"
                  type="email"
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  placeholder="cliente@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-phone">Teléfono</Label>
                <Input
                  id="customer-phone"
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  placeholder="4771234567"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Canal de comunicación</Label>
                <Select value={commChannel} onValueChange={setCommChannel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un canal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="q">QR</SelectItem>
                    <SelectItem value="w">WhatsApp</SelectItem>
                    <SelectItem value="s">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Items del intento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <EntityPicker
                label="Producto"
                searchLabel="Buscar producto"
                selectLabel={catalogLoading ? "Cargando catálogo..." : "Selecciona un producto"}
                query={productQuery}
                value={selectedProductId}
                options={productOptions}
                onQueryChange={setProductQuery}
                onValueChange={setSelectedProductId}
                allowEmpty
                emptyLabel="Sin producto"
                disabled={catalogLoading}
              />

              <div className="grid gap-4 md:grid-cols-[160px_minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <Label htmlFor="item-quantity">Cantidad</Label>
                  <Input
                    id="item-quantity"
                    type="number"
                    min="1"
                    value={selectedQuantity}
                    onChange={(event) => setSelectedQuantity(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-talla-id">Talla ID opcional</Label>
                  <Input
                    id="item-talla-id"
                    value={selectedTallaId}
                    onChange={(event) => setSelectedTallaId(event.target.value)}
                    placeholder="m, xl o talla_id"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="button" onClick={handleAddItem} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                    Aún no agregas productos al intento.
                  </div>
                ) : (
                  items.map((item, index) => (
                    <div
                      key={`${item.productoId}-${item.tallaId ?? "no-size"}-${index}`}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-muted/35 px-4 py-4"
                    >
                      <div className="space-y-1 text-sm">
                        <p className="font-medium text-foreground">{item.label}</p>
                        <p className="text-muted-foreground">
                          Producto: {item.productoId}
                        </p>
                        <p className="text-muted-foreground">
                          Cantidad: {item.cantidad}
                          {item.tallaId ? ` · Talla: ${item.tallaId}` : ""}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(index)}
                        aria-label={`Quitar ${item.label}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {submitError ? (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                  {submitError}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  onClick={() => void handleCreateAttempt()}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creando..." : "Crear intento Aplazo"}
                </Button>
                <Button asChild type="button" variant="outline">
                  <Link href="/admin">Volver al panel</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Intento actual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {attempt ? (
                <>
                  <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/35 px-4 py-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                      <StatusIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <Badge variant={getStatusVariant(currentStatus)}>
                        {getAplazoStatusLabel(currentStatus)}
                      </Badge>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {getAplazoStatusDescription(currentStatus, "success")}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-2xl border border-border bg-muted/35 p-4 text-sm md:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/74">
                        Intento
                      </p>
                      <p className="mt-1 break-all font-medium text-foreground">
                        {currentAttemptId}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/74">
                        Flujo
                      </p>
                      <p className="mt-1 font-medium text-foreground">
                        {attempt.flowType}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/74">
                        Provider status
                      </p>
                      <p className="mt-1 font-medium text-foreground">
                        {paymentStatus?.providerStatus ||
                          getAplazoStatusLabel(currentStatus)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/74">
                        Expira
                      </p>
                      <p className="mt-1 font-medium text-foreground">
                        {currentExpiresAt
                          ? new Date(currentExpiresAt).toLocaleString()
                          : "Sin fecha"}
                      </p>
                    </div>
                  </div>

                  {attempt.paymentLink ? (
                    <div className="rounded-2xl border border-border bg-card px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/74">
                        Payment Link
                      </p>
                      <a
                        href={attempt.paymentLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 block break-all text-sm font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {attempt.paymentLink}
                      </a>
                    </div>
                  ) : null}

                  {attempt.qrImageUrl ? (
                    <div className="rounded-2xl border border-border bg-card px-4 py-4">
                      <div className="mb-3 flex items-center gap-2">
                        <QrCode className="h-4 w-4 text-primary" />
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/74">
                          QR de cobro
                        </p>
                      </div>
                      <img
                        src={attempt.qrImageUrl}
                        alt="QR Aplazo"
                        className="mx-auto max-h-[280px] rounded-2xl border border-border bg-white p-3"
                      />
                    </div>
                  ) : null}

                  {attempt.qrString ? (
                    <div className="space-y-2">
                      <Label htmlFor="aplazo-qr-string">QR String</Label>
                      <Textarea
                        id="aplazo-qr-string"
                        value={attempt.qrString}
                        readOnly
                        className="min-h-[96px] font-mono text-xs"
                      />
                    </div>
                  ) : null}

                  {statusError ? (
                    <div className="rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                      {statusError}
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleRefreshStatus()}
                      disabled={isRefreshingStatus}
                    >
                      <RefreshCw
                        className={`mr-2 h-4 w-4 ${
                          isRefreshingStatus ? "animate-spin" : ""
                        }`}
                      />
                      {isRefreshingStatus ? "Actualizando..." : "Actualizar estado"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleResetAttempt}
                    >
                      Limpiar intento
                    </Button>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
                  Crea un intento in-store para mostrar aquí el link de pago, el
                  QR y el estado del cobro.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
