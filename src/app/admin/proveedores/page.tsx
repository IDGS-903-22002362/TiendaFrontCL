"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { providersApi } from "@/lib/api/providers";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { Proveedor } from "@/lib/types";
import { EntityPicker, type EntityOption } from "@/components/admin/entity-picker";
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
  nombre: "",
  email: "",
  telefono: "",
  contacto: "",
  activo: true,
};

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export default function AdminProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProveedorId, setSelectedProveedorId] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const { toast } = useToast();

  const loadProveedores = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await providersApi.getAll();

      setProveedores(data);
      setSelectedProveedorId((current) =>
        current && !data.some((proveedor) => proveedor.id === current)
          ? ""
          : current,
      );
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudieron cargar los proveedores",
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadProveedores();
  }, [loadProveedores]);

  const providerOptions: EntityOption[] = useMemo(
    () =>
      proveedores.map((proveedor) => ({
        id: proveedor.id,
        label: proveedor.nombre,
        subtitle: `${proveedor.codigo ?? ""} ${proveedor.contacto ?? ""}`.trim(),
      })),
    [proveedores],
  );

  const filteredProveedores = useMemo(() => {
    const query = normalizeSearch(searchQuery);

    return proveedores.filter((proveedor) => {
      if (selectedProveedorId && proveedor.id !== selectedProveedorId) {
        return false;
      }

      if (!query) {
        return true;
      }

      return normalizeSearch(
        `${proveedor.nombre} ${proveedor.codigo ?? ""} ${proveedor.contacto ?? ""} ${proveedor.email ?? ""}`,
      ).includes(query);
    });
  }, [proveedores, searchQuery, selectedProveedorId]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setSelectedProveedorId("");
  };

  const selectProveedorForEdit = (proveedorId: string) => {
    setSelectedProveedorId(proveedorId);
    const selected = proveedores.find((proveedor) => proveedor.id === proveedorId);
    if (!selected) {
      return;
    }

    setForm({
      id: selected.id,
      nombre: selected.nombre,
      email: selected.email ?? "",
      telefono: selected.telefono ?? "",
      contacto: selected.contacto ?? "",
      activo: selected.activo,
    });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
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
      if (selectedProveedorId === id) {
        resetForm();
      }
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
          <CardTitle>Búsqueda inteligente</CardTitle>
        </CardHeader>
        <CardContent>
          <EntityPicker
            label="Buscar proveedor"
            searchLabel="Buscar por nombre, contacto, email o código"
            selectLabel="Selecciona proveedor para editar"
            query={searchQuery}
            value={selectedProveedorId}
            options={providerOptions}
            onQueryChange={setSearchQuery}
            onValueChange={(value) => {
              if (!value) {
                resetForm();
                return;
              }
              selectProveedorForEdit(value);
            }}
            allowEmpty
            emptyLabel="Sin selección"
            disabled={isLoading}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {form.id ? "Editar proveedor" : "Crear proveedor"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
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
        <CardContent>
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
              ) : filteredProveedores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    Sin proveedores disponibles para el filtro actual.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProveedores.map((proveedor) => (
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
                          onClick={() => selectProveedorForEdit(proveedor.id)}
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
