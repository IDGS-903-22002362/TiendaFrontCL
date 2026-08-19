"use client";

import Link from "next/link";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Banknote,
  Calculator,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ImageOff,
  Loader2,
  Minus,
  PackageSearch,
  Pause,
  Play,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingBag,
  Trash2,
  WalletCards,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api/errors";
import { fetchProducts, searchProducts } from "@/lib/api/storefront";
import { tallasApi } from "@/lib/api/tallas";
import type { Product, Talla } from "@/lib/types";
import {
  formatPosMoney,
  pesosToMinor,
  posApi,
} from "@/lib/pos/client";
import {
  normalizePosSku,
  pickProductBySku,
  POS_SCANNER_INTER_KEY_MS,
  POS_SCANNER_MIN_LENGTH,
} from "@/lib/pos/barcode";
import type {
  PosCapability,
  PosCashMovement,
  PosContext,
  PosRegister,
  PosSale,
  PosSaleItem,
  PosTicket,
} from "@/lib/pos/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AdminInlineAlert,
  AdminPageShell,
  AdminPanelCard,
} from "@/components/admin/admin-ui";
import {
  canShowPosAdminOversight,
  PosAdminOversight,
} from "@/components/pos/pos-admin-oversight";

type ModalName =
  | "payment"
  | "movement"
  | "ticket"
  | "return"
  | null;

const CATALOG_PAGE_SIZE = 12;

function can(context: PosContext | null, capability: PosCapability) {
  return Boolean(context?.actor.capabilities.includes(capability));
}

function getProductAvailableStock(product: Product, tallaId?: string | null) {
  if (tallaId) {
    return (
      product.inventarioPorTalla?.find((entry) => entry.tallaId === tallaId)
        ?.cantidad ?? 0
    );
  }
  return product.stockTotal ?? product.stock;
}

function PosProductThumb({
  name,
  src,
}: {
  name: string;
  src?: string;
}) {
  const [failed, setFailed] = useState(!src);

  if (failed || !src) {
    return (
      <span
        className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted text-text-muted"
        aria-hidden
      >
        <ImageOff className="size-4" />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- URLs de Storage/CDN variables en POS
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="size-12 shrink-0 rounded-lg object-cover ring-1 ring-border/60"
      aria-hidden
      data-product={name}
    />
  );
}

function statusLabel(status: PosSale["status"]) {
  const labels: Record<PosSale["status"], string> = {
    DRAFT: "En curso",
    SUSPENDED: "Suspendida",
    PAYMENT_PENDING: "Pago pendiente",
    PAID: "Pagada",
    PARTIALLY_REFUNDED: "Devolución parcial",
    REFUNDED: "Devuelta",
    VOIDED: "Anulada",
    CANCELLED: "Cancelada",
  };
  return labels[status];
}

function TerminalSkeleton() {
  return (
    <div className="space-y-4" aria-label="Cargando terminal">
      <Skeleton className="h-16 w-full rounded-2xl" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <Skeleton className="h-[32rem] rounded-2xl" />
        <Skeleton className="h-[32rem] rounded-2xl" />
      </div>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-text-muted">
        <ShoppingBag className="size-5" aria-hidden />
      </span>
      <div>
        <p className="font-medium">La venta está lista para comenzar</p>
        <p className="mt-1 max-w-xs text-sm text-text-secondary">
          Busca por nombre o SKU y agrega el primer producto. El precio final se
          calculará siempre en el backend.
        </p>
      </div>
      <kbd className="rounded-md border bg-background px-2 py-1 text-xs text-text-muted">
        / o F2 para buscar
      </kbd>
    </div>
  );
}

export function PosTerminal() {
  const { token } = useAuth();
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();
  const searchRef = useRef<HTMLInputElement>(null);
  const mutationInFlightRef = useRef(false);
  const createSalePromiseRef = useRef<Promise<PosSale> | null>(null);
  const catalogRequestRef = useRef(0);
  const restoredShiftRef = useRef("");
  const scanBufferRef = useRef("");
  const lastScanKeyAtRef = useRef(0);
  const scanInFlightRef = useRef(false);

  const [context, setContext] = useState<PosContext | null>(null);
  const [registers, setRegisters] = useState<PosRegister[]>([]);
  const [registersError, setRegistersError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [fatalError, setFatalError] = useState("");
  const [selectedRegisterId, setSelectedRegisterId] = useState("");
  const [openingFloat, setOpeningFloat] = useState("");
  const [newRegisterCode, setNewRegisterCode] = useState("C01");
  const [newRegisterName, setNewRegisterName] = useState("Caja 01");
  const [showCreateRegister, setShowCreateRegister] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [tallas, setTallas] = useState<Talla[]>([]);
  const [search, setSearch] = useState("");
  const [catalogPage, setCatalogPage] = useState(0);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sizeDialogOpen, setSizeDialogOpen] = useState(false);
  const [sale, setSale] = useState<PosSale | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [suspended, setSuspended] = useState<PosSale[]>([]);
  const [modal, setModal] = useState<ModalName>(null);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "MIXED">(
    "CASH",
  );
  const [cashReceived, setCashReceived] = useState("");
  const [cashPart, setCashPart] = useState("");
  const [terminalReference, setTerminalReference] = useState("");
  const [authorizationCode, setAuthorizationCode] = useState("");
  const [last4, setLast4] = useState("");
  const [ticket, setTicket] = useState<PosTicket | null>(null);
  const [movements, setMovements] = useState<PosCashMovement[]>([]);
  const [movementType, setMovementType] = useState("CASH_IN");
  const [movementDirection, setMovementDirection] = useState<"IN" | "OUT">("IN");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementReason, setMovementReason] = useState("");
  const [returnSale, setReturnSale] = useState<PosSale | null>(null);
  const [returnSales, setReturnSales] = useState<PosSale[]>([]);
  const [returnReason, setReturnReason] = useState("");
  const [returnCondition, setReturnCondition] = useState<
    "RETURNED_RESELLABLE" | "RETURNED_DAMAGED" | "NOT_RETURNED"
  >("RETURNED_RESELLABLE");
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>(
    {},
  );
  const [cancelItem, setCancelItem] = useState<PosSaleItem | null>(null);
  const activeShiftId = context?.activeShift?.id;

  const beginMutation = useCallback((label: string) => {
    if (mutationInFlightRef.current) return false;
    mutationInFlightRef.current = true;
    setBusy(label);
    return true;
  }, []);

  const endMutation = useCallback(() => {
    mutationInFlightRef.current = false;
    setBusy("");
  }, []);

  const notifyError = useCallback(
    (title: string, error: unknown) => {
      toast({
        variant: "destructive",
        title,
        description: getApiErrorMessage(error),
      });
    },
    [toast],
  );

  const loadContext = useCallback(async (fatalOnError = true) => {
    if (!token) return;
    setFatalError("");
    setRegistersError("");
    try {
      const nextContext = await posApi.context(token);
      setContext(nextContext);

      try {
        const registerPage = await posApi.registers(token);
        setRegisters(registerPage.items);
        if (registerPage.items.length === 0) {
          setShowCreateRegister(
            nextContext.actor.capabilities.includes("pos.config.manage"),
          );
        }
      } catch (error) {
        setRegisters([]);
        setRegistersError(getApiErrorMessage(error));
        setShowCreateRegister(
          nextContext.actor.capabilities.includes("pos.config.manage"),
        );
      }

      const ownRegister = nextContext.register?.register;
      setSelectedRegisterId((current) => current || ownRegister?.id || "");
    } catch (error) {
      if (fatalOnError) {
        setFatalError(getApiErrorMessage(error));
      } else {
        throw error;
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  useEffect(() => {
    if (!activeShiftId) return;
    let cancelled = false;
    void tallasApi
      .getAll()
      .then((nextTallas) => {
        if (!cancelled) setTallas(nextTallas);
      })
      .catch((error) => {
        if (!cancelled) notifyError("No se pudieron cargar las tallas", error);
      });
    return () => {
      cancelled = true;
    };
  }, [activeShiftId, notifyError]);

  useEffect(() => {
    if (!activeShiftId) return;
    const requestId = ++catalogRequestRef.current;
    setCatalogPage(0);
    const timer = window.setTimeout(() => {
      setCatalogLoading(true);
      const action = search.trim() ? searchProducts(search) : fetchProducts();
      void action
        .then((items) => {
          if (catalogRequestRef.current === requestId) {
            setProducts(items.filter((product) => product.activo !== false));
          }
        })
        .catch((error) => {
          if (catalogRequestRef.current === requestId) {
            notifyError("No se pudo cargar el catálogo", error);
          }
        })
        .finally(() => {
          if (catalogRequestRef.current === requestId) setCatalogLoading(false);
        });
    }, 220);
    return () => {
      window.clearTimeout(timer);
      if (catalogRequestRef.current === requestId) catalogRequestRef.current += 1;
    };
  }, [search, activeShiftId, notifyError]);

  useEffect(() => {
    createSalePromiseRef.current = null;
    restoredShiftRef.current = "";
  }, [activeShiftId, context?.activeShift?.status]);

  useEffect(() => {
    if (!token || !activeShiftId || sale || restoredShiftRef.current === activeShiftId) {
      return;
    }
    restoredShiftRef.current = activeShiftId;
    void Promise.all([
      posApi.listSales(
        `status=DRAFT&shiftId=${encodeURIComponent(activeShiftId)}&limit=20`,
        token,
      ),
      posApi.listSales(
        `status=PAYMENT_PENDING&shiftId=${encodeURIComponent(activeShiftId)}&limit=20`,
        token,
      ),
    ])
      .then(([drafts, pending]) => {
        const current = [...drafts.items, ...pending.items].sort(
          (left, right) =>
            new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
        )[0];
        if (current) {
          setSale(current);
          toast({
            title: "Venta recuperada",
            description: `Continuamos con ${current.folio}.`,
          });
        }
      })
      .catch((error) => notifyError("No se pudo recuperar la venta activa", error));
  }, [activeShiftId, notifyError, sale, toast, token]);

  const loadSuspended = useCallback(async () => {
    if (!token || !context?.activeShift) return;
    try {
      const page = await posApi.listSales(
        `status=SUSPENDED&shiftId=${encodeURIComponent(context.activeShift.id)}&limit=50`,
        token,
      );
      setSuspended(page.items);
    } catch (error) {
      notifyError("No se pudieron cargar las ventas suspendidas", error);
    }
  }, [context?.activeShift, notifyError, token]);

  const loadMovements = useCallback(async () => {
    if (!token || !context?.activeShift) return;
    try {
      const page = await posApi.cashMovements(context.activeShift.id, token);
      setMovements(page.items);
    } catch (error) {
      notifyError("No se pudieron cargar los movimientos", error);
    }
  }, [context?.activeShift, notifyError, token]);

  useEffect(() => {
    void loadSuspended();
    void loadMovements();
  }, [loadMovements, loadSuspended]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing =
        target?.matches("input, textarea, select, [contenteditable='true']") ??
        false;
      if (event.key === "Escape" && modal) {
        setModal(null);
        return;
      }
      if (event.key === "/" || event.key === "F2") {
        if (!editing || target === searchRef.current) {
          event.preventDefault();
          searchRef.current?.focus();
        }
        return;
      }
      if (editing || modal) return;
      if (event.key === "F4" && sale && can(context, "pos.sale.suspend")) {
        event.preventDefault();
        void suspendSale();
        return;
      }
      if (event.key === "F6" && sale?.items.length) {
        event.preventDefault();
        void openPayment();
        return;
      }

      // Pistola USB (keyboard wedge) fuera del campo de búsqueda.
      if (event.key === "Enter") {
        const code = scanBufferRef.current;
        scanBufferRef.current = "";
        if (code.length >= POS_SCANNER_MIN_LENGTH) {
          event.preventDefault();
          void handleBarcodeScan(code);
        }
        return;
      }
      if (
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        const now = Date.now();
        if (now - lastScanKeyAtRef.current > POS_SCANNER_INTER_KEY_MS) {
          scanBufferRef.current = event.key;
        } else {
          scanBufferRef.current += event.key;
        }
        lastScanKeyAtRef.current = now;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, modal, sale, activeShiftId]);

  useEffect(() => {
    if (activeShiftId) {
      window.setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [activeShiftId]);

  const tallaById = useMemo(
    () => new Map(tallas.map((talla) => [talla.id, talla])),
    [tallas],
  );

  const catalogTotalPages = Math.max(
    1,
    Math.ceil(products.length / CATALOG_PAGE_SIZE),
  );
  const catalogSafePage = Math.min(catalogPage, catalogTotalPages - 1);
  const pagedProducts = useMemo(() => {
    const start = catalogSafePage * CATALOG_PAGE_SIZE;
    return products.slice(start, start + CATALOG_PAGE_SIZE);
  }, [products, catalogSafePage]);

  async function openOrStartShift(event: FormEvent) {
    event.preventDefault();
    if (!token || !selectedRegisterId) return;
    const amountMinor = pesosToMinor(openingFloat);
    if (amountMinor === null) {
      toast({
        variant: "destructive",
        title: "Revisa el fondo inicial",
        description: "Escribe un importe válido con máximo dos decimales.",
      });
      return;
    }
    const selected = registers.find((item) => item.id === selectedRegisterId);
    if (!beginMutation("shift")) return;
    try {
      if (selected?.activeSessionId) {
        await posApi.startShift(selected.activeSessionId, amountMinor, token);
      } else {
        await posApi.openRegister(selectedRegisterId, amountMinor, token);
      }
      toast({
        title: "Caja lista",
        description: `Turno iniciado con ${formatPosMoney(amountMinor)}.`,
      });
    } catch (error) {
      notifyError("No se pudo iniciar el turno", error);
      return;
    } finally {
      endMutation();
    }
    void loadContext(false).catch((error) =>
      notifyError("El turno inició, pero no se pudo actualizar la pantalla", error),
    );
  }

  async function createRegister(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    const code = newRegisterCode.trim().toUpperCase();
    const name = newRegisterName.trim();
    if (code.length < 2 || name.length < 3) {
      toast({
        variant: "destructive",
        title: "Datos incompletos",
        description: "El código necesita al menos 2 caracteres y el nombre 3.",
      });
      return;
    }
    if (!beginMutation("create-register")) return;
    try {
      const response = await posApi.createRegister({ code, name }, token);
      setRegisters((current) =>
        [...current.filter((item) => item.id !== response.register.id), response.register].sort(
          (a, b) => a.code.localeCompare(b.code, "es"),
        ),
      );
      setSelectedRegisterId(response.register.id);
      setShowCreateRegister(false);
      setRegistersError("");
      setNewRegisterCode((current) => {
        const match = /^C(\d+)$/i.exec(current.trim());
        if (!match) return current;
        const next = Number(match[1]) + 1;
        return `C${String(next).padStart(2, "0")}`;
      });
      setNewRegisterName((current) => {
        const match = /^Caja\s+(\d+)$/i.exec(current.trim());
        if (!match) return current;
        return `Caja ${String(Number(match[1]) + 1).padStart(2, "0")}`;
      });
      toast({
        title: "Caja creada",
        description: `${response.register.code} · ${response.register.name} lista para abrir.`,
      });
    } catch (error) {
      notifyError("No se pudo crear la caja", error);
    } finally {
      endMutation();
    }
  }

  async function ensureSale() {
    if (sale) return sale;
    if (createSalePromiseRef.current) return createSalePromiseRef.current;
    createSalePromiseRef.current = posApi
      .createSale({}, token)
      .then((response) => {
        setSale(response.sale);
        return response.sale;
      })
      .finally(() => {
        createSalePromiseRef.current = null;
      });
    return createSalePromiseRef.current;
  }

  async function addProduct(product: Product, tallaId?: string | null) {
    if (!token) return;
    if (getProductAvailableStock(product, tallaId) <= 0) {
      toast({
        variant: "destructive",
        title: "Sin existencias",
        description: "Selecciona otra talla o producto.",
      });
      return;
    }
    if (!beginMutation(`add:${product.id}`)) return;
    try {
      const currentSale = await ensureSale();
      const response = await posApi.addItem(
        currentSale.id,
        { productoId: product.id, tallaId: tallaId ?? null, quantity: 1 },
        token,
      );
      setSale(response.sale);
      setSizeDialogOpen(false);
      setSelectedProduct(null);
      toast({
        title: "Producto agregado",
        description: `${product.name} ya está en la venta.`,
      });
    } catch (error) {
      notifyError("No se pudo agregar el producto", error);
    } finally {
      endMutation();
    }
  }

  function chooseProduct(product: Product) {
    const availableSizes = (product.tallaIds ?? []).filter(
      (id) => getProductAvailableStock(product, id) > 0,
    );
    if (product.hasSizeInventory || availableSizes.length > 0) {
      setSelectedProduct(product);
      setSizeDialogOpen(true);
      return;
    }
    void addProduct(product);
  }

  async function handleBarcodeScan(rawCode: string) {
    if (!activeShiftId || modal || scanInFlightRef.current) return;
    const code = normalizePosSku(rawCode);
    if (code.length < POS_SCANNER_MIN_LENGTH) return;

    scanInFlightRef.current = true;
    try {
      const matches = await searchProducts(code);
      const product = pickProductBySku(
        matches.filter((item) => item.activo !== false),
        code,
      );
      if (!product) {
        toast({
          variant: "destructive",
          title: "SKU no encontrado",
          description: `No hay un producto con clave exacta “${code}”.`,
        });
        return;
      }
      setSearch("");
      chooseProduct(product);
      // Reenfocar para el siguiente escaneo continuo.
      window.setTimeout(() => searchRef.current?.focus(), 0);
    } catch (error) {
      notifyError("No se pudo buscar el SKU escaneado", error);
    } finally {
      scanInFlightRef.current = false;
    }
  }

  async function changeQuantity(item: PosSaleItem, quantity: number) {
    if (!sale || !token || quantity < 1) return;
    if (!beginMutation(`item:${item.itemId}`)) return;
    try {
      const response = await posApi.updateItem(sale.id, item.itemId, quantity, token);
      setSale(response.sale);
    } catch (error) {
      notifyError("No se pudo actualizar la cantidad", error);
    } finally {
      endMutation();
    }
  }

  async function removeItem(item: PosSaleItem) {
    if (!sale || !token) return;
    if (!beginMutation(`item:${item.itemId}`)) return;
    try {
      const response = await posApi.removeItem(sale.id, item.itemId, token);
      setSale(response.sale);
      setCancelItem(null);
    } catch (error) {
      notifyError("No se pudo quitar el producto", error);
    } finally {
      endMutation();
    }
  }

  async function applyCode(event: FormEvent) {
    event.preventDefault();
    if (!sale || !token || !promoCode.trim()) return;
    if (!beginMutation("code")) return;
    try {
      const response = await posApi.applyCode(sale.id, promoCode.trim(), token);
      setSale(response.sale);
      setPromoCode("");
      toast({ title: "Código aplicado", description: "El backend recalculó la venta." });
    } catch (error) {
      notifyError("No se pudo aplicar el código", error);
    } finally {
      endMutation();
    }
  }

  async function reprice() {
    if (!sale || !token) return;
    if (!beginMutation("reprice")) return;
    try {
      const response = await posApi.reprice(sale.id, token);
      setSale(response.sale);
      toast({ title: "Venta actualizada", description: "Precios y promociones recalculados." });
    } catch (error) {
      notifyError("No se pudo recalcular la venta", error);
    } finally {
      endMutation();
    }
  }

  async function suspendSale() {
    if (!sale || !token) return;
    if (!beginMutation("suspend")) return;
    try {
      await posApi.suspend(sale.id, token);
      setSale(null);
      toast({ title: "Venta suspendida", description: "Puedes retomarla desde Pendientes." });
    } catch (error) {
      notifyError("No se pudo suspender la venta", error);
      return;
    } finally {
      endMutation();
    }
    void loadSuspended();
  }

  async function resumeSale(nextSale: PosSale) {
    if (!token) return;
    if (sale?.items.length) {
      toast({
        variant: "destructive",
        title: "Termina la venta actual",
        description: "Suspéndela antes de retomar otra venta.",
      });
      return;
    }
    if (!beginMutation(`resume:${nextSale.id}`)) return;
    try {
      const response = await posApi.resume(nextSale.id, token);
      setSale(response.sale);
    } catch (error) {
      notifyError("No se pudo retomar la venta", error);
      return;
    } finally {
      endMutation();
    }
    void loadSuspended();
  }

  async function openPayment() {
    if (!sale || !token || sale.items.length === 0) return;
    if (!beginMutation("preview")) return;
    try {
      const response = await posApi.preview(sale.id, token);
      setSale(response.sale);
      setPaymentMethod("CASH");
      setTerminalReference("");
      setAuthorizationCode("");
      setLast4("");
      setCashPart("");
      setCashReceived((response.sale.payment.pendingMinor / 100).toFixed(2));
      setModal("payment");
    } catch (error) {
      notifyError("La venta necesita atención antes de cobrar", error);
    } finally {
      endMutation();
    }
  }

  function closePayment() {
    const pendingSale = sale;
    setModal(null);
    setPaymentMethod("CASH");
    setTerminalReference("");
    setAuthorizationCode("");
    setLast4("");
    setCashPart("");
    setCashReceived("");
    if (
      token &&
      pendingSale?.status === "PAYMENT_PENDING" &&
      (pendingSale.payment.paidMinor ?? 0) === 0
    ) {
      void posApi
        .returnToDraft(pendingSale.id, token)
        .then((response) => setSale(response.sale))
        .catch((error) =>
          notifyError("No se pudo reabrir la venta para editarla", error),
        );
    }
  }

  async function loadTicket(paidSale: PosSale) {
    if (!token || !can(context, "pos.ticket.read")) return;
    try {
      const ticketResponse = await posApi.ticket(paidSale.id, token);
      setTicket(ticketResponse.ticket);
      setModal("ticket");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Venta cobrada; ticket no disponible",
        description: `${getApiErrorMessage(error)} Puedes reintentar sin volver a cobrar.`,
      });
    }
  }

  async function completePayment(event: FormEvent) {
    event.preventDefault();
    if (!sale || !token) return;
    const pending = sale.payment.pendingMinor || sale.totals.totalMinor;
    if (
      (paymentMethod === "CARD" || paymentMethod === "MIXED") &&
      !terminalReference.trim()
    ) {
      toast({
        variant: "destructive",
        title: "Falta la referencia",
        description: "Captura la referencia emitida por la terminal física.",
      });
      return;
    }
    if (!beginMutation("payment")) return;
    let paidSale: PosSale;
    try {
      let response: { sale: PosSale };
      if (paymentMethod === "CASH") {
        const receivedMinor = pesosToMinor(cashReceived);
        if (receivedMinor === null || receivedMinor < pending) {
          throw new Error("El efectivo recibido debe cubrir el saldo pendiente.");
        }
        response = await posApi.payCash(
          sale.id,
          { amountMinor: pending, receivedMinor },
          token,
        );
      } else if (paymentMethod === "CARD") {
        if (!context?.register?.register.config.terminalId) {
          throw new Error(
            "Esta caja no tiene una terminal configurada. Solicita la configuración antes de registrar tarjeta.",
          );
        }
        response = await posApi.payCard(
          sale.id,
          {
            amountMinor: pending,
            terminalId: context.register.register.config.terminalId,
            reference: terminalReference.trim(),
            authorizationCode: authorizationCode.trim() || undefined,
            last4: last4.trim() || undefined,
          },
          token,
        );
      } else {
        const cashMinor = pesosToMinor(cashPart);
        const receivedMinor = pesosToMinor(cashReceived);
        if (
          cashMinor === null ||
          receivedMinor === null ||
          cashMinor <= 0 ||
          cashMinor >= pending ||
          receivedMinor < cashMinor
        ) {
          throw new Error("Define una parte en efectivo válida y menor al saldo.");
        }
        if (!context?.register?.register.config.terminalId) {
          throw new Error("Esta caja no tiene terminal configurada para pago mixto.");
        }
        response = await posApi.payMixed(
          sale.id,
          {
            cash: { amountMinor: cashMinor, receivedMinor },
            card: {
              amountMinor: pending - cashMinor,
              terminalId: context.register.register.config.terminalId,
              reference: terminalReference.trim(),
              authorizationCode: authorizationCode.trim() || undefined,
              last4: last4.trim() || undefined,
            },
          },
          token,
        );
      }
      paidSale = response.sale;
      setSale(paidSale);
      closePayment();
      toast({
        title: paidSale.status === "PAID" ? "Venta cobrada" : "Pago registrado",
        description:
          paidSale.status === "PAID"
            ? `Venta ${paidSale.folio} completada.`
            : `Saldo pendiente: ${formatPosMoney(paidSale.payment.pendingMinor)}.`,
      });
    } catch (error) {
      notifyError("No se pudo registrar el pago", error);
      return;
    } finally {
      endMutation();
    }
    if (paidSale.status === "PAID") {
      await loadTicket(paidSale);
    }
    void loadContext(false).catch((error) =>
      notifyError("El pago se registró, pero no se pudo actualizar la caja", error),
    );
  }

  function finishTicket() {
    setModal(null);
    setTicket(null);
    setSale(null);
    setTerminalReference("");
    setAuthorizationCode("");
    setLast4("");
    setCashPart("");
    setCashReceived("");
    searchRef.current?.focus();
  }

  async function createMovement(event: FormEvent) {
    event.preventDefault();
    if (!token || !context?.activeShift) return;
    const amountMinor = pesosToMinor(movementAmount);
    if (!amountMinor || movementReason.trim().length < 5) {
      toast({
        variant: "destructive",
        title: "Completa el movimiento",
        description: "Indica importe y un motivo de al menos 5 caracteres.",
      });
      return;
    }
    if (!beginMutation("movement")) return;
    try {
      await posApi.createCashMovement(
        {
          type: movementType,
          amountMinor,
          reason: movementReason.trim(),
          shiftId: context.activeShift.id,
          ...(movementType === "AUTHORIZED_ADJUSTMENT"
            ? { direction: movementDirection }
            : {}),
        },
        token,
      );
      setModal(null);
      setMovementAmount("");
      setMovementReason("");
      toast({ title: "Movimiento registrado", description: "El libro de caja se actualizó." });
    } catch (error) {
      notifyError("No se pudo registrar el movimiento", error);
      return;
    } finally {
      endMutation();
    }
    void loadMovements();
  }

  async function openReturn() {
    if (!token) return;
    if (!beginMutation("returns")) return;
    try {
      const page = await posApi.listSales(
        `status=PAID&operationalDate=${encodeURIComponent(context?.operationalDate ?? "")}&limit=20`,
        token,
      );
      const first = page.items[0] ?? null;
      setReturnSales(page.items);
      setReturnSale(first);
      setReturnReason("");
      setReturnCondition("RETURNED_RESELLABLE");
      setReturnQuantities({});
      setModal("return");
    } catch (error) {
      notifyError("No se pudieron cargar ventas para devolución", error);
    } finally {
      endMutation();
    }
  }

  async function submitReturn(event: FormEvent) {
    event.preventDefault();
    if (!token || !returnSale) return;
    const items = returnSale.items
      .map((item) => ({
        itemId: item.itemId,
        quantity: returnQuantities[item.itemId] ?? 0,
        physicalCondition: returnCondition,
      }))
      .filter((item) => item.quantity > 0);
    if (!items.length || returnReason.trim().length < 5) {
      toast({
        variant: "destructive",
        title: "Completa la devolución",
        description: "Selecciona al menos una unidad e indica el motivo.",
      });
      return;
    }
    if (!beginMutation("return-submit")) return;
    try {
      await posApi.createReturn(
        returnSale.id,
        { items, reason: returnReason.trim() },
        token,
      );
      setReturnReason("");
      setReturnCondition("RETURNED_RESELLABLE");
      setReturnQuantities({});
      setModal(null);
      toast({
        title: "Devolución solicitada",
        description: "Solicitud creada, pendiente de aprobación.",
      });
    } catch (error) {
      notifyError("No se pudo crear la devolución", error);
    } finally {
      endMutation();
    }
  }

  if (loading) return <TerminalSkeleton />;

  if (fatalError) {
    return (
      <AdminPageShell>
        <AdminInlineAlert>
          <span className="block font-medium">No se pudo abrir el POS</span>
          <span className="mt-1 block">{fatalError}</span>
        </AdminInlineAlert>
        <Button className="w-fit" onClick={() => void loadContext()}>
          <RefreshCw className="size-4" /> Reintentar
        </Button>
      </AdminPageShell>
    );
  }

  if (!context?.actor.capabilities.includes("pos.access")) {
    return (
      <AdminPageShell>
        <AdminInlineAlert>
          Tu cuenta inició sesión, pero no tiene la capacidad <strong>pos.access</strong>.
          Solicita a un administrador que revise tu operador POS.
        </AdminInlineAlert>
      </AdminPageShell>
    );
  }

  if (!context.activeShift) {
    const selected = registers.find((item) => item.id === selectedRegisterId);
    const canManageRegisters = can(context, "pos.config.manage");
    const showOversight = token ? canShowPosAdminOversight(context) : false;
    return (
      <AdminPageShell className="max-w-6xl mx-auto w-full gap-8">
        <div className="flex w-full justify-center">
          <div className="w-full max-w-xl rounded-3xl border border-border/80 bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
            <div className="mb-8 flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CircleDollarSign className="size-6" aria-hidden />
              </span>
              <div>
                <h1 className="font-headline text-2xl font-semibold">Abrir terminal</h1>
                <p className="mt-1 text-sm text-text-secondary">
                  Selecciona la caja y confirma el fondo recibido. No podrás vender sin
                  un turno activo.
                </p>
              </div>
            </div>

            {registersError ? (
              <AdminInlineAlert className="mb-5">
                <span className="block font-medium">No se pudieron cargar las cajas</span>
                <span className="mt-1 block">{registersError}</span>
              </AdminInlineAlert>
            ) : null}

            {registers.length === 0 && !canManageRegisters ? (
              <AdminInlineAlert variant="info" className="mb-5">
                No hay cajas disponibles para tu operador. Un administrador debe asignar
                o configurar una caja.
              </AdminInlineAlert>
            ) : null}

            {canManageRegisters ? (
              <div className="mb-6 rounded-2xl border border-dashed border-border/80 bg-muted/30 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Configurar caja</p>
                    <p className="text-sm text-text-secondary">
                      {registers.length === 0
                        ? "Aún no hay cajas. Crea la primera para poder abrir turno."
                        : "Puedes agregar otra caja cuando lo necesites."}
                    </p>
                  </div>
                  {registers.length > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCreateRegister((current) => !current)}
                    >
                      {showCreateRegister ? "Ocultar" : "Nueva caja"}
                    </Button>
                  ) : null}
                </div>
                {(showCreateRegister || registers.length === 0) && (
                  <form
                    className="grid gap-3 sm:grid-cols-[8rem_1fr_auto]"
                    onSubmit={createRegister}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="pos-new-register-code">Código</Label>
                      <Input
                        id="pos-new-register-code"
                        value={newRegisterCode}
                        onChange={(event) =>
                          setNewRegisterCode(event.target.value.toUpperCase())
                        }
                        placeholder="C01"
                        maxLength={24}
                        className="h-11 font-mono uppercase"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pos-new-register-name">Nombre</Label>
                      <Input
                        id="pos-new-register-name"
                        value={newRegisterName}
                        onChange={(event) => setNewRegisterName(event.target.value)}
                        placeholder="Caja 01"
                        maxLength={120}
                        className="h-11"
                        required
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="submit"
                        className="h-11 w-full sm:w-auto"
                        disabled={busy === "create-register"}
                      >
                        {busy === "create-register" ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Plus className="size-4" />
                        )}
                        Crear caja
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            ) : null}

            {registers.length > 0 ? (
              <form className="space-y-5" onSubmit={openOrStartShift}>
                <div className="space-y-2">
                  <Label htmlFor="pos-register">Caja</Label>
                  <Select
                    value={selectedRegisterId}
                    onValueChange={setSelectedRegisterId}
                  >
                    <SelectTrigger id="pos-register" className="h-11">
                      <SelectValue placeholder="Selecciona una caja" />
                    </SelectTrigger>
                    <SelectContent>
                      {registers
                        .filter((register) => !register.status.includes("ARCHIVED"))
                        .map((register) => (
                          <SelectItem
                            key={register.id}
                            value={register.id}
                            disabled={
                              register.status === "BLOCKED" ||
                              Boolean(
                                register.currentCashierUid &&
                                  register.currentCashierUid !== context.actor.uid,
                              )
                            }
                          >
                            {register.code} · {register.name} ({register.status})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {selected?.blockedReason ? (
                    <p className="text-sm text-destructive">{selected.blockedReason}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opening-float">Fondo recibido (MXN)</Label>
                  <Input
                    id="opening-float"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={openingFloat}
                    onChange={(event) => setOpeningFloat(event.target.value)}
                    className="h-11 font-mono text-lg"
                  />
                  <p className="text-xs text-text-muted">
                    Se enviará como entero de centavos. El backend validará el límite.
                  </p>
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={!selectedRegisterId || busy === "shift"}
                >
                  {busy === "shift" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Play className="size-4" />
                  )}
                  {selected?.activeSessionId ? "Iniciar mi turno" : "Abrir caja y turno"}
                </Button>
              </form>
            ) : null}
          </div>
        </div>

        {showOversight && token ? (
          <PosAdminOversight
            token={token}
            context={context}
            registers={registers}
          />
        ) : null}
      </AdminPageShell>
    );
  }

  const register = context.register?.register;
  const currency = context.settings.currency;

  return (
    <AdminPageShell className="pos-terminal max-w-none gap-4">
      <section className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card px-4 py-3 shadow-[var(--shadow-card)] lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ReceiptText className="size-5" aria-hidden />
            <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-card bg-emerald-500" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate font-headline text-lg font-semibold">
                Punto de venta
              </h1>
              <Badge variant="outline">{context.actor.posRole}</Badge>
              {!context.appCheckVerified ? (
                <Badge variant="secondary">App Check en observación</Badge>
              ) : null}
            </div>
            <p className="truncate text-xs text-text-secondary">
              Caja {register?.code ?? context.activeShift.registerCode} · Turno de{" "}
              {context.activeShift.cashierName ?? context.actor.name ?? "Personal"} ·{" "}
              {context.operationalDate}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {can(context, "cash_movement.create") ? (
            <Button variant="outline" size="sm" onClick={() => setModal("movement")}>
              <WalletCards className="size-4" /> Movimiento
            </Button>
          ) : null}
          {can(context, "pos.sale.refund") ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void openReturn()}
              disabled={busy === "returns"}
            >
              <RotateCcw className="size-4" /> Devolución
            </Button>
          ) : null}
          {can(context, "cut.create_own") ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/pos/corte">
                <Calculator className="size-4" /> Cerrar caja
              </Link>
            </Button>
          ) : null}
        </div>
      </section>

      <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="min-w-0 space-y-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-text-muted"
              aria-hidden
            />
            <Input
              ref={searchRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                void handleBarcodeScan(search);
              }}
              placeholder="SKU / código de barras · Enter para agregar"
              aria-label="Buscar o escanear productos por nombre o SKU"
              autoComplete="off"
              className="h-14 rounded-2xl border-border/80 bg-card pl-12 pr-24 text-base shadow-[var(--shadow-card)]"
            />
            <kbd className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded border bg-muted px-2 py-1 text-[11px] text-text-muted">
              Escáner · Enter
            </kbd>
          </div>

          <Tabs defaultValue="catalog">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="catalog">Catálogo</TabsTrigger>
              <TabsTrigger value="suspended" onClick={() => void loadSuspended()}>
                Pendientes {suspended.length ? `(${suspended.length})` : ""}
              </TabsTrigger>
              <TabsTrigger value="movements" onClick={() => void loadMovements()}>
                Caja
              </TabsTrigger>
            </TabsList>
            <TabsContent value="catalog" className="mt-3">
              {catalogLoading ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-36 rounded-2xl" />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed bg-card/60 p-8 text-center">
                  <PackageSearch className="mb-3 size-8 text-text-muted" />
                  <p className="font-medium">No encontramos productos</p>
                  <p className="mt-1 text-sm text-text-secondary">
                    Prueba otro nombre o revisa el SKU.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <motion.div
                    layout={!reduceMotion}
                    className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                  >
                    {pagedProducts.map((product) => {
                      const stock = product.stockTotal ?? product.stock;
                      const thumb = product.images?.[0];
                      return (
                        <motion.button
                          layout={!reduceMotion}
                          key={product.id}
                          type="button"
                          disabled={stock <= 0 || busy === `add:${product.id}`}
                          onClick={() => chooseProduct(product)}
                          whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                          className="group flex h-36 flex-col justify-between rounded-2xl border border-border/80 bg-card p-3 text-left shadow-[var(--shadow-card)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[var(--shadow-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 motion-reduce:transform-none"
                        >
                          <div className="flex w-full items-start gap-3">
                            <PosProductThumb name={product.name} src={thumb} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="line-clamp-2 text-sm font-medium leading-snug">
                                  {product.name}
                                </p>
                                {busy === `add:${product.id}` ? (
                                  <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                                ) : (
                                  <Plus className="size-4 shrink-0 text-primary opacity-60 transition-opacity group-hover:opacity-100" />
                                )}
                              </div>
                              <p className="mt-0.5 truncate text-xs text-text-muted">
                                {product.clave ?? product.id}
                              </p>
                            </div>
                          </div>
                          <div className="flex w-full items-end justify-between gap-2 pl-[3.75rem]">
                            <span className="admin-tabular text-base font-semibold">
                              {formatPosMoney(
                                Math.round(
                                  (product.salePrice ?? product.price) * 100,
                                ),
                                currency,
                              )}
                            </span>
                            <span
                              className={cn(
                                "text-xs",
                                stock > 0
                                  ? "text-text-muted"
                                  : "text-destructive",
                              )}
                            >
                              {stock > 0 ? `${stock} disp.` : "Agotado"}
                            </span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </motion.div>

                  {products.length > CATALOG_PAGE_SIZE ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/70 px-3 py-2">
                      <p className="text-xs text-text-muted">
                        {catalogSafePage * CATALOG_PAGE_SIZE + 1}–
                        {Math.min(
                          (catalogSafePage + 1) * CATALOG_PAGE_SIZE,
                          products.length,
                        )}{" "}
                        de {products.length}
                      </p>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                          disabled={catalogSafePage <= 0}
                          onClick={() =>
                            setCatalogPage(Math.max(0, catalogSafePage - 1))
                          }
                          aria-label="Página anterior del catálogo"
                        >
                          <ChevronLeft className="size-4" />
                        </Button>
                        <span className="min-w-14 text-center text-xs font-medium tabular-nums">
                          {catalogSafePage + 1} / {catalogTotalPages}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                          disabled={catalogSafePage >= catalogTotalPages - 1}
                          onClick={() =>
                            setCatalogPage(
                              Math.min(catalogTotalPages - 1, catalogSafePage + 1),
                            )
                          }
                          aria-label="Página siguiente del catálogo"
                        >
                          <ChevronRight className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="px-1 text-xs text-text-muted">
                      {products.length} producto
                      {products.length === 1 ? "" : "s"}
                    </p>
                  )}
                </div>
              )}
            </TabsContent>
            <TabsContent value="suspended" className="mt-3 space-y-2">
              {suspended.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-card/60 p-8 text-center">
                  <Pause className="mx-auto mb-3 size-7 text-text-muted" />
                  <p className="font-medium">No hay ventas suspendidas</p>
                  <p className="mt-1 text-sm text-text-secondary">
                    Las ventas pausadas aparecerán aquí durante su vigencia.
                  </p>
                </div>
              ) : (
                suspended.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">{item.folio}</p>
                      <p className="text-sm text-text-secondary">
                        {item.items.length} líneas ·{" "}
                        {formatPosMoney(item.totals.totalMinor, currency)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => void resumeSale(item)}
                      disabled={busy === `resume:${item.id}`}
                    >
                      <Play className="size-4" /> Retomar
                    </Button>
                  </div>
                ))
              )}
            </TabsContent>
            <TabsContent value="movements" className="mt-3 space-y-2">
              {movements.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-card/60 p-8 text-center">
                  <WalletCards className="mx-auto mb-3 size-7 text-text-muted" />
                  <p className="font-medium">Sin movimientos en este turno</p>
                </div>
              ) : (
                movements.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border bg-card p-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-full",
                          movement.direction === "IN"
                            ? "bg-emerald-500/10 text-emerald-700"
                            : "bg-amber-500/10 text-amber-700",
                        )}
                      >
                        {movement.direction === "IN" ? (
                          <ArrowDownToLine className="size-4" />
                        ) : (
                          <ArrowUpFromLine className="size-4" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{movement.reason}</p>
                        <p className="text-xs text-text-muted">
                          {movement.type} · {movement.status}
                        </p>
                      </div>
                    </div>
                    <span className="admin-tabular font-medium">
                      {movement.direction === "OUT" ? "−" : "+"}
                      {formatPosMoney(movement.amountMinor, currency)}
                    </span>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>

        <AdminPanelCard
          className="xl:sticky xl:top-4 xl:max-h-[calc(100vh-3rem)]"
          contentClassName="flex min-h-[32rem] flex-col p-0"
          noPadding
        >
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <p className="font-medium">
                {sale?.folio ? `Venta ${sale.folio}` : "Nueva venta"}
              </p>
              <p className="text-xs text-text-muted">
                {sale ? statusLabel(sale.status) : "Sin productos"}
              </p>
            </div>
            {sale ? (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => void reprice()}
                disabled={busy === "reprice"}
                aria-label="Recalcular precios"
              >
                <RefreshCw
                  className={cn("size-4", busy === "reprice" && "animate-spin")}
                />
              </Button>
            ) : null}
          </div>

          {!sale?.items.length ? (
            <EmptyCart />
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
              {sale.items.map((item) => (
                <motion.div
                  layout={!reduceMotion}
                  key={item.itemId}
                  className="flex gap-3 border-b py-3 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium">
                      {item.descripcion}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {item.clave}
                      {item.tallaCodigo ? ` · Talla ${item.tallaCodigo}` : ""}
                    </p>
                    <div className="mt-2 flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-8 rounded-full"
                        onClick={() => void changeQuantity(item, item.quantity - 1)}
                        disabled={item.quantity <= 1 || busy === `item:${item.itemId}`}
                        aria-label={`Quitar una unidad de ${item.descripcion}`}
                      >
                        <Minus className="size-3" />
                      </Button>
                      <span className="admin-tabular min-w-8 text-center text-sm">
                        {item.quantity}
                      </span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-8 rounded-full"
                        onClick={() => void changeQuantity(item, item.quantity + 1)}
                        disabled={
                          item.quantity >= context.settings.maxQuantityPerLine ||
                          busy === `item:${item.itemId}`
                        }
                        aria-label={`Agregar una unidad de ${item.descripcion}`}
                      >
                        <Plus className="size-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="ml-1 size-8 text-text-muted hover:text-destructive"
                        onClick={() => setCancelItem(item)}
                        aria-label={`Quitar ${item.descripcion} de la venta`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="admin-tabular text-sm font-semibold">
                      {formatPosMoney(item.lineTotalMinor, currency)}
                    </p>
                    {item.unitPriceOriginalMinor !== item.unitPriceMinor ? (
                      <p className="admin-tabular text-xs text-text-muted line-through">
                        {formatPosMoney(
                          item.unitPriceOriginalMinor * item.quantity,
                          currency,
                        )}
                      </p>
                    ) : null}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <div className="mt-auto border-t bg-muted/20 p-4">
            {sale?.items.length ? (
              <>
                <form className="mb-4 flex gap-2" onSubmit={applyCode}>
                  <Input
                    value={promoCode}
                    onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
                    placeholder="Código promocional"
                    aria-label="Código promocional"
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={!promoCode.trim() || busy === "code"}
                  >
                    Aplicar
                  </Button>
                </form>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-text-secondary">
                    <span>Subtotal</span>
                    <span className="admin-tabular">
                      {formatPosMoney(sale.totals.subtotalOriginalMinor, currency)}
                    </span>
                  </div>
                  {sale.totals.discountMinor > 0 ? (
                    <div className="flex justify-between text-emerald-700">
                      <span>Descuentos</span>
                      <span className="admin-tabular">
                        −{formatPosMoney(sale.totals.discountMinor, currency)}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex items-end justify-between border-t pt-3">
                    <span className="font-medium">Total</span>
                    <span className="admin-tabular text-2xl font-semibold">
                      {formatPosMoney(sale.totals.totalMinor, currency)}
                    </span>
                  </div>
                  {sale.payment.paidMinor > 0 ? (
                    <div className="flex justify-between text-text-secondary">
                      <span>Pagado</span>
                      <span>{formatPosMoney(sale.payment.paidMinor, currency)}</span>
                    </div>
                  ) : null}
                </div>
                {sale.status === "PAID" ? (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {can(context, "pos.ticket.read") ? (
                      <Button
                        variant="outline"
                        onClick={() => void loadTicket(sale)}
                      >
                        <ReceiptText className="size-4" />
                        Reintentar ticket
                      </Button>
                    ) : null}
                    <Button onClick={finishTicket}>Nueva venta</Button>
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
                    <Button
                      variant="outline"
                      onClick={() => void suspendSale()}
                      disabled={!can(context, "pos.sale.suspend") || busy === "suspend"}
                      title={
                        can(context, "pos.sale.suspend")
                          ? "Suspender venta (F4)"
                          : "Tu operador no puede suspender ventas"
                      }
                    >
                      <Pause className="size-4" />
                      <span className="sr-only sm:not-sr-only">Suspender</span>
                    </Button>
                    <Button
                      size="lg"
                      onClick={() => void openPayment()}
                      disabled={busy === "preview"}
                    >
                      {busy === "preview" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Banknote className="size-4" />
                      )}
                      Cobrar · F6
                    </Button>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </AdminPanelCard>
      </div>

      <Dialog open={sizeDialogOpen} onOpenChange={setSizeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selecciona la talla</DialogTitle>
            <DialogDescription>
              {selectedProduct?.name}. Solo se muestran existencias disponibles.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(selectedProduct?.tallaIds ?? []).map((tallaId) => {
              const stock = getProductAvailableStock(selectedProduct!, tallaId);
              const talla = tallaById.get(tallaId);
              return (
                <Button
                  key={tallaId}
                  variant="outline"
                  className="h-auto min-h-14 flex-col"
                  disabled={stock <= 0}
                  onClick={() => void addProduct(selectedProduct!, tallaId)}
                >
                  <span>{talla?.codigo || tallaId}</span>
                  <span className="text-xs font-normal text-text-muted">
                    {stock} disponibles
                  </span>
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === "payment"} onOpenChange={(open) => !open && closePayment()}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={completePayment}>
            <DialogHeader>
              <DialogTitle>Cobrar venta</DialogTitle>
              <DialogDescription>
                Saldo:{" "}
                <strong>
                  {formatPosMoney(
                    sale?.payment.pendingMinor || sale?.totals.totalMinor || 0,
                    currency,
                  )}
                </strong>
                . Registra únicamente el resultado de la terminal física; nunca
                captures PAN, CVV o NIP.
              </DialogDescription>
            </DialogHeader>
            <Tabs
              value={paymentMethod}
              onValueChange={(value) =>
                setPaymentMethod(value as typeof paymentMethod)
              }
              className="my-5"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger
                  value="CASH"
                  disabled={register?.config.allowCash === false}
                >
                  Efectivo
                </TabsTrigger>
                <TabsTrigger
                  value="CARD"
                  disabled={register?.config.allowCardExternal === false}
                >
                  Tarjeta
                </TabsTrigger>
                <TabsTrigger
                  value="MIXED"
                  disabled={
                    register?.config.allowCash === false ||
                    register?.config.allowCardExternal === false
                  }
                >
                  Mixto
                </TabsTrigger>
              </TabsList>
              <TabsContent value="CASH" className="space-y-2 pt-3">
                <Label htmlFor="cash-received">Efectivo recibido (MXN)</Label>
                <Input
                  id="cash-received"
                  autoFocus
                  inputMode="decimal"
                  value={cashReceived}
                  onChange={(event) => setCashReceived(event.target.value)}
                  className="h-12 font-mono text-xl"
                />
                {pesosToMinor(cashReceived) !== null &&
                sale &&
                pesosToMinor(cashReceived)! >= sale.payment.pendingMinor ? (
                  <p className="text-sm text-emerald-700">
                    Cambio:{" "}
                    {formatPosMoney(
                      pesosToMinor(cashReceived)! - sale.payment.pendingMinor,
                      currency,
                    )}
                  </p>
                ) : null}
              </TabsContent>
              <TabsContent value="CARD" className="space-y-3 pt-3">
                {!register?.config.terminalId ? (
                  <AdminInlineAlert variant="info">
                    Tarjeta deshabilitada: la caja no tiene <code>terminalId</code>{" "}
                    configurado. No se inventará una terminal.
                  </AdminInlineAlert>
                ) : (
                  <CardFields
                    reference={terminalReference}
                    authorizationCode={authorizationCode}
                    last4={last4}
                    onReference={setTerminalReference}
                    onAuthorization={setAuthorizationCode}
                    onLast4={setLast4}
                  />
                )}
              </TabsContent>
              <TabsContent value="MIXED" className="space-y-3 pt-3">
                <div className="space-y-2">
                  <Label htmlFor="cash-part">Parte en efectivo (MXN)</Label>
                  <Input
                    id="cash-part"
                    inputMode="decimal"
                    value={cashPart}
                    onChange={(event) => setCashPart(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mixed-received">Efectivo recibido (MXN)</Label>
                  <Input
                    id="mixed-received"
                    inputMode="decimal"
                    value={cashReceived}
                    onChange={(event) => setCashReceived(event.target.value)}
                  />
                </div>
                {register?.config.terminalId ? (
                  <CardFields
                    reference={terminalReference}
                    authorizationCode={authorizationCode}
                    last4={last4}
                    onReference={setTerminalReference}
                    onAuthorization={setAuthorizationCode}
                    onLast4={setLast4}
                  />
                ) : (
                  <AdminInlineAlert variant="info">
                    Pago mixto deshabilitado: falta configurar la terminal de la caja.
                  </AdminInlineAlert>
                )}
              </TabsContent>
            </Tabs>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closePayment}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  busy === "payment" ||
                  ((paymentMethod === "CARD" || paymentMethod === "MIXED") &&
                    (!register?.config.terminalId || !terminalReference.trim()))
                }
              >
                {busy === "payment" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                Registrar pago
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === "movement"} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent>
          <form onSubmit={createMovement}>
            <DialogHeader>
              <DialogTitle>Movimiento de efectivo</DialogTitle>
              <DialogDescription>
                El backend decidirá si requiere autorización. Las ventas y devoluciones
                no se registran manualmente aquí.
              </DialogDescription>
            </DialogHeader>
            <div className="my-5 space-y-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={movementType} onValueChange={setMovementType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH_IN">Entrada de efectivo</SelectItem>
                    <SelectItem value="CASH_OUT">Salida de efectivo</SelectItem>
                    <SelectItem value="SECURITY_DROP">Retiro de seguridad</SelectItem>
                    <SelectItem value="CASH_REPLENISHMENT">Reposición</SelectItem>
                    {can(context, "cash_movement.approve") ? (
                      <SelectItem value="AUTHORIZED_ADJUSTMENT">Ajuste autorizado</SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="movement-amount">Importe (MXN)</Label>
                <Input
                  id="movement-amount"
                  inputMode="decimal"
                  value={movementAmount}
                  onChange={(event) => setMovementAmount(event.target.value)}
                />
              </div>
              {movementType === "AUTHORIZED_ADJUSTMENT" ? (
                <div className="space-y-2">
                  <Label>Dirección del ajuste</Label>
                  <Select
                    value={movementDirection}
                    onValueChange={(value) =>
                      setMovementDirection(value as "IN" | "OUT")
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN">Entrada</SelectItem>
                      <SelectItem value="OUT">Salida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="movement-reason">Motivo</Label>
                <Input
                  id="movement-reason"
                  value={movementReason}
                  onChange={(event) => setMovementReason(event.target.value)}
                  maxLength={context.settings.maxNoteLength}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModal(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={busy === "movement"}>
                Registrar movimiento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === "ticket"} onOpenChange={(open) => !open && finishTicket()}>
        <DialogContent className="sm:max-w-md print:max-w-none print:border-0 print:shadow-none">
          {ticket ? (
            <>
              <DialogHeader className="print:text-center">
                <DialogTitle>{ticket.store.name}</DialogTitle>
                <DialogDescription>
                  Ticket {ticket.folio} · {new Date(ticket.issuedAt).toLocaleString("es-MX")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 font-mono text-sm">
                <div className="border-y py-2">
                  {ticket.items.map((item, index) => (
                    <div key={`${item.clave}-${index}`} className="flex justify-between gap-3 py-1">
                      <span>
                        {item.quantity}× {item.descripcion}
                        {item.tallaCodigo ? ` (${item.tallaCodigo})` : ""}
                      </span>
                      <span>{formatPosMoney(item.lineTotalMinor, ticket.currency)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span>{formatPosMoney(ticket.totals.totalMinor, ticket.currency)}</span>
                </div>
                {ticket.changeMinor > 0 ? (
                  <div className="flex justify-between">
                    <span>Cambio</span>
                    <span>{formatPosMoney(ticket.changeMinor, ticket.currency)}</span>
                  </div>
                ) : null}
                <p className="pt-3 text-center text-xs">{ticket.legend}</p>
              </div>
              <DialogFooter className="print:hidden">
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="size-4" /> Imprimir
                </Button>
                <Button onClick={finishTicket}>Nueva venta</Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={modal === "return"} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent className="sm:max-w-xl">
          <form onSubmit={submitReturn}>
            <DialogHeader>
              <DialogTitle>Nueva devolución</DialogTitle>
              <DialogDescription>
                Selecciona unidades de una venta pagada. La reposición depende de la
                condición física y de las capacidades del operador.
              </DialogDescription>
            </DialogHeader>
            <div className="my-5 space-y-4">
              {returnSale ? (
                <>
                  <div className="space-y-2">
                    <Label>Venta pagada</Label>
                    <Select
                      value={returnSale.id}
                      onValueChange={(saleId) => {
                        setReturnSale(
                          returnSales.find((candidate) => candidate.id === saleId) ??
                            null,
                        );
                        setReturnQuantities({});
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {returnSales.map((candidate) => (
                          <SelectItem key={candidate.id} value={candidate.id}>
                            {candidate.folio} ·{" "}
                            {formatPosMoney(candidate.totals.totalMinor, currency)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-3">
                    <p className="font-medium">{returnSale.folio}</p>
                    <p className="text-xs text-text-muted">
                      {formatPosMoney(returnSale.totals.totalMinor, currency)}
                    </p>
                  </div>
                  <div className="max-h-56 space-y-2 overflow-y-auto">
                    {returnSale.items.map((item) => {
                      const max = item.quantity - item.returnedQuantity;
                      return (
                        <div
                          key={item.itemId}
                          className="grid grid-cols-[1fr_5rem] items-center gap-3 rounded-xl border p-3"
                        >
                          <div>
                            <p className="text-sm font-medium">{item.descripcion}</p>
                            <p className="text-xs text-text-muted">Máximo {max}</p>
                          </div>
                          <Input
                            inputMode="numeric"
                            min={0}
                            max={max}
                            value={returnQuantities[item.itemId] ?? 0}
                            onChange={(event) =>
                              setReturnQuantities((current) => ({
                                ...current,
                                [item.itemId]: Math.min(
                                  max,
                                  Math.max(0, Number(event.target.value) || 0),
                                ),
                              }))
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="space-y-2">
                    <Label>Condición física</Label>
                    <Select
                      value={returnCondition}
                      onValueChange={(value) =>
                        setReturnCondition(value as typeof returnCondition)
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RETURNED_RESELLABLE">
                          Devuelto y revendible
                        </SelectItem>
                        <SelectItem value="RETURNED_DAMAGED">Devuelto dañado</SelectItem>
                        <SelectItem value="NOT_RETURNED">No devuelto físicamente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="return-reason">Motivo</Label>
                    <Input
                      id="return-reason"
                      value={returnReason}
                      onChange={(event) => setReturnReason(event.target.value)}
                    />
                  </div>
                </>
              ) : (
                <AdminInlineAlert variant="info">
                  No hay ventas pagadas disponibles en la fecha operativa actual.
                </AdminInlineAlert>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModal(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!returnSale || busy === "return-submit"}>
                Crear devolución
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(cancelItem)} onOpenChange={(open) => !open && setCancelItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar este producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará {cancelItem?.descripcion} de la venta. El backend recalculará
              los descuentos y el total.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Conservar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelItem && void removeItem(cancelItem)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Quitar producto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {token && canShowPosAdminOversight(context) ? (
        <PosAdminOversight
          token={token}
          context={context}
          registers={registers}
        />
      ) : null}
    </AdminPageShell>
  );
}

function CardFields({
  reference,
  authorizationCode,
  last4,
  onReference,
  onAuthorization,
  onLast4,
}: {
  reference: string;
  authorizationCode: string;
  last4: string;
  onReference: (value: string) => void;
  onAuthorization: (value: string) => void;
  onLast4: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="terminal-reference">
          Referencia de terminal <span aria-hidden>*</span>
        </Label>
        <Input
          id="terminal-reference"
          required
          aria-required="true"
          value={reference}
          onChange={(event) => onReference(event.target.value)}
          placeholder="Folio del voucher"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="authorization-code">Autorización</Label>
        <Input
          id="authorization-code"
          value={authorizationCode}
          onChange={(event) =>
            onAuthorization(event.target.value.replace(/[^A-Za-z0-9-]/g, ""))
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="last-four">Últimos 4</Label>
        <Input
          id="last-four"
          inputMode="numeric"
          maxLength={4}
          value={last4}
          onChange={(event) => onLast4(event.target.value.replace(/\D/g, ""))}
        />
      </div>
    </div>
  );
}
