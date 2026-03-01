"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { providersApi } from "@/lib/api/providers";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { Proveedor } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  nombre: "",
  email: "",
  telefono: "",
  contacto: "",
  activo: true,
};

export default function AdminProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const { toast } = useToast();

  const loadProveedores = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = search.trim()
        ? await providersApi.search(search.trim())
        : await providersApi.getAll();

      setProveedores(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudieron cargar los proveedores",
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    void loadProveedores();
  }, [loadProveedores]);

  const resetForm = () => setForm(EMPTY_FORM);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      codigo: form.codigo.trim() || undefined,
      nombre: form.nombre.trim(),
      email: form.email.trim() || undefined,
      telefono: form.telefono.trim() || undefined,
      contacto: form.contacto.trim() || undefined,
      activo: form.activo,
    };

    setIsSaving(true);
    try {
      if (form.id) {
        await providersApi.update(form.id, payload);
      } else {
        await providersApi.create(payload);
      }

      toast({
        title: form.id ? "Proveedor actualizado" : "Proveedor creado",
      });

      resetForm();
      await loadProveedores();
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
      await providersApi.remove(id);
      toast({ title: "Proveedor inactivado" });
      await loadProveedores();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo inactivar",
        description: getApiErrorMessage(error),
      });
    }
  };

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <header>
        <h1 className="font-headline text-3xl font-bold">Proveedores</h1>
        <p className="text-sm text-muted-foreground">
          Gestión de proveedores del catálogo.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>
            {form.id ? "Editar proveedor" : "Crear proveedor"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
            <Input
              placeholder="Código"
              value={form.codigo}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, codigo: event.target.value }))
              }
            />
            <Input
              required
              placeholder="Nombre"
              value={form.nombre}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, nombre: event.target.value }))
              }
            />
            <Input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, email: event.target.value }))
              }
            />
            <Input
              placeholder="Teléfono"
              value={form.telefono}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, telefono: event.target.value }))
              }
            />
            <Input
              placeholder="Contacto"
              value={form.contacto}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, contacto: event.target.value }))
              }
            />
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Checkbox
                id="activo-proveedor"
                checked={form.activo}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, activo: Boolean(checked) }))
                }
              />
              <label htmlFor="activo-proveedor" className="text-sm">
                Activo
              </label>
            </div>

            <div className="md:col-span-2 flex flex-wrap gap-2">
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
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar por término"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadProveedores()}
            >
              Buscar
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Activo</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5}>Cargando...</TableCell>
                </TableRow>
              ) : proveedores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    Sin proveedores disponibles.
                  </TableCell>
                </TableRow>
              ) : (
                proveedores.map((proveedor) => (
                  <TableRow key={proveedor.id}>
                    <TableCell>{proveedor.nombre}</TableCell>
                    <TableCell>{proveedor.contacto ?? "-"}</TableCell>
                    <TableCell>{proveedor.email ?? "-"}</TableCell>
                    <TableCell>{proveedor.activo ? "Sí" : "No"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setForm({
                              id: proveedor.id,
                              codigo: proveedor.codigo ?? "",
                              nombre: proveedor.nombre,
                              email: proveedor.email ?? "",
                              telefono: proveedor.telefono ?? "",
                              contacto: proveedor.contacto ?? "",
                              activo: proveedor.activo,
                            })
                          }
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => void onDelete(proveedor.id)}
                        >
                          Inactivar
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
