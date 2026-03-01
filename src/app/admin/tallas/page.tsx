"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { tallasApi } from "@/lib/api/tallas";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { Talla } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const EMPTY_FORM = {
  id: "",
  codigo: "",
  descripcion: "",
  orden: "0",
};

export default function AdminTallasPage() {
  const [tallas, setTallas] = useState<Talla[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const { toast } = useToast();

  const loadTallas = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await tallasApi.getAll();
      setTallas(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudieron cargar las tallas",
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadTallas();
  }, [loadTallas]);

  const resetForm = () => setForm(EMPTY_FORM);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      codigo: form.codigo.trim(),
      descripcion: form.descripcion.trim(),
      orden: Number(form.orden),
    };

    setIsSaving(true);
    try {
      if (form.id) {
        await tallasApi.update(form.id, payload);
      } else {
        await tallasApi.create(payload);
      }

      toast({ title: form.id ? "Talla actualizada" : "Talla creada" });
      resetForm();
      await loadTallas();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo guardar",
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    try {
      await tallasApi.remove(id);
      toast({ title: "Talla eliminada" });
      await loadTallas();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo eliminar",
        description: getApiErrorMessage(error),
      });
    }
  };

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <header>
        <h1 className="font-headline text-3xl font-bold">Tallas</h1>
        <p className="text-sm text-muted-foreground">CRUD parcial de tallas.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{form.id ? "Editar talla" : "Crear talla"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3" onSubmit={onSubmit}>
            <Input
              required
              placeholder="Código (ej. XL)"
              value={form.codigo}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, codigo: event.target.value }))
              }
            />
            <Input
              required
              placeholder="Descripción"
              value={form.descripcion}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  descripcion: event.target.value,
                }))
              }
            />
            <Input
              type="number"
              min={0}
              placeholder="Orden"
              value={form.orden}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, orden: event.target.value }))
              }
            />

            <div className="md:col-span-3 flex flex-wrap gap-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Guardando..." : form.id ? "Actualizar" : "Crear"}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Limpiar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Orden</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4}>Cargando...</TableCell>
                </TableRow>
              ) : tallas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>Sin tallas disponibles.</TableCell>
                </TableRow>
              ) : (
                tallas.map((talla) => (
                  <TableRow key={talla.id}>
                    <TableCell>{talla.codigo}</TableCell>
                    <TableCell>{talla.descripcion}</TableCell>
                    <TableCell>{talla.orden ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setForm({
                              id: talla.id,
                              codigo: talla.codigo,
                              descripcion: talla.descripcion,
                              orden: String(talla.orden ?? 0),
                            })
                          }
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onDelete(talla.id)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
