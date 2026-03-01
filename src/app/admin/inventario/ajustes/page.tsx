"use client";

import { type FormEvent, useMemo, useState } from "react";
import { inventarioApi } from "@/lib/api/inventario";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function InventoryAdjustmentsPage() {
  const { token, role } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [productoId, setProductoId] = useState("");
  const [tallaId, setTallaId] = useState("");
  const [cantidadFisica, setCantidadFisica] = useState("0");
  const [motivo, setMotivo] = useState("");
  const [referencia, setReferencia] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");

  const canUseInventory = useMemo(
    () => Boolean(token) && (role === "ADMIN" || role === "EMPLEADO"),
    [role, token],
  );

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) return;

    setIsSaving(true);
    try {
      await inventarioApi.registerAdjustment(
        token,
        {
          productoId: productoId.trim(),
          tallaId: tallaId.trim() || undefined,
          cantidadFisica: Number(cantidadFisica),
          motivo: motivo.trim(),
          referencia: referencia.trim() || undefined,
        },
        idempotencyKey.trim() || undefined,
      );

      toast({ title: "Ajuste registrado" });
      setProductoId("");
      setTallaId("");
      setCantidadFisica("0");
      setMotivo("");
      setReferencia("");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo registrar el ajuste",
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <header>
        <h1 className="font-headline text-3xl font-bold">
          Ajustes de inventario
        </h1>
        <p className="text-sm text-muted-foreground">
          Registro de conteo físico con soporte de idempotencia.
        </p>
      </header>

      {!canUseInventory ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Configura token y rol ADMIN/EMPLEADO desde el panel admin para
            registrar ajustes.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Nuevo ajuste</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
              <Input
                required
                placeholder="Producto ID"
                value={productoId}
                onChange={(event) => setProductoId(event.target.value)}
              />
              <Input
                placeholder="Talla ID (opcional)"
                value={tallaId}
                onChange={(event) => setTallaId(event.target.value)}
              />
              <Input
                required
                type="number"
                min={0}
                placeholder="Cantidad física"
                value={cantidadFisica}
                onChange={(event) => setCantidadFisica(event.target.value)}
              />
              <Input
                placeholder="Referencia (opcional)"
                value={referencia}
                onChange={(event) => setReferencia(event.target.value)}
              />
              <Input
                placeholder="Idempotency-Key (opcional)"
                value={idempotencyKey}
                onChange={(event) => setIdempotencyKey(event.target.value)}
                className="md:col-span-2"
              />
              <Textarea
                required
                placeholder="Motivo"
                value={motivo}
                onChange={(event) => setMotivo(event.target.value)}
                className="md:col-span-2"
              />

              <div className="md:col-span-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Registrando..." : "Registrar ajuste"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
