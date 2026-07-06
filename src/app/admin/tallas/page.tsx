"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { tallasApi } from "@/lib/api/tallas";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { Talla, TallaInventorySnapshot } from "@/lib/types";
import { ApiError } from "@/lib/api/client";
import { EntityPicker, type EntityOption } from "@/components/admin/entity-picker";
import {
  AdminPageHeader,
  AdminPageShell,
  AdminPanelCard,
} from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
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

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export default function AdminTallasPage() {
  const [tallas, setTallas] = useState<Talla[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTallaId, setSelectedTallaId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [inventoryLoadingId, setInventoryLoadingId] = useState("");
  const [selectedInventory, setSelectedInventory] =
    useState<TallaInventorySnapshot | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const { toast } = useToast();

  const loadTallas = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await tallasApi.getAll();
      setTallas(data);
      setSelectedTallaId((current) =>
        current && !data.some((talla) => talla.id === current) ? "" : current,
      );
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

  const tallaOptions: EntityOption[] = useMemo(
    () =>
      tallas.map((talla) => ({
        id: talla.id,
        label: talla.codigo,
        subtitle: talla.descripcion,
      })),
    [tallas],
  );

  const filteredTallas = useMemo(() => {
    const query = normalizeSearch(searchQuery);

    return tallas.filter((talla) => {
      if (selectedTallaId && talla.id !== selectedTallaId) {
        return false;
      }

      if (!query) {
        return true;
      }

      return normalizeSearch(`${talla.codigo} ${talla.descripcion}`).includes(
        query,
      );
    });
  }, [searchQuery, selectedTallaId, tallas]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setSelectedTallaId("");
  };

  const selectTallaForEdit = (tallaId: string) => {
    setSelectedTallaId(tallaId);
    const selected = tallas.find((talla) => talla.id === tallaId);
    if (!selected) {
      return;
    }

    setForm({
      id: selected.id,
      codigo: selected.codigo,
      descripcion: selected.descripcion,
      orden: String(selected.orden ?? 0),
    });
  };

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
      if (selectedTallaId === id) {
        resetForm();
      }
      if (selectedInventory?.talla.id === id) {
        setSelectedInventory(null);
      }
      await loadTallas();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        toast({
          variant: "destructive",
          title: "No se puede eliminar",
          description: getApiErrorMessage(error),
        });
        return;
      }

      toast({
        variant: "destructive",
        title: "No se pudo eliminar",
        description: getApiErrorMessage(error),
      });
    }
  };

  const onLoadInventory = async (id: string) => {
    setInventoryLoadingId(id);
    try {
      const snapshot = await tallasApi.getInventoryById(id);
      setSelectedInventory(snapshot);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo consultar inventario",
        description: getApiErrorMessage(error),
      });
    } finally {
      setInventoryLoadingId("");
    }
  };

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Catálogo"
        title="Tallas"
        description="Administra códigos de talla y consulta inventario asociado."
      />

      <AdminPanelCard title="Búsqueda inteligente">
          <EntityPicker
            label="Buscar talla"
            searchLabel="Buscar por código o descripción"
            selectLabel="Selecciona talla para editar"
            query={searchQuery}
            value={selectedTallaId}
            options={tallaOptions}
            onQueryChange={setSearchQuery}
            onValueChange={(value) => {
              if (!value) {
                resetForm();
                return;
              }
              selectTallaForEdit(value);
            }}
            allowEmpty
            emptyLabel="Sin selección"
            disabled={isLoading}
          />
      </AdminPanelCard>

      <AdminPanelCard title={form.id ? "Editar talla" : "Crear talla"}>
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
      </AdminPanelCard>

      <AdminPanelCard title="Listado" noPadding contentClassName="p-0">
          <div className="admin-table-shell overflow-x-auto">
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
              ) : filteredTallas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    Sin tallas disponibles para el filtro actual.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTallas.map((talla) => (
                  <TableRow key={talla.id}>
                    <TableCell>{talla.codigo}</TableCell>
                    <TableCell>{talla.descripcion}</TableCell>
                    <TableCell>{talla.orden ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => selectTallaForEdit(talla.id)}
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
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void onLoadInventory(talla.id)}
                          disabled={inventoryLoadingId === talla.id}
                        >
                          {inventoryLoadingId === talla.id
                            ? "Cargando..."
                            : "Inventario"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
      </AdminPanelCard>

      {selectedInventory ? (
        <AdminPanelCard title={`Inventario talla ${selectedInventory.talla.codigo}`}>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <p>{`Total productos: ${selectedInventory.resumen.totalProductos}`}</p>
              <p>{`Total unidades: ${selectedInventory.resumen.totalUnidades}`}</p>
            </div>

            <div className="admin-table-shell overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto ID</TableHead>
                  <TableHead>Clave</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Cantidad talla</TableHead>
                  <TableHead>Existencias totales</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedInventory.productos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      Sin productos para esta talla.
                    </TableCell>
                  </TableRow>
                ) : (
                  selectedInventory.productos.map((product) => (
                    <TableRow key={product.productoId}>
                      <TableCell>{product.productoId}</TableCell>
                      <TableCell>{product.clave ?? "-"}</TableCell>
                      <TableCell>{product.descripcion ?? "-"}</TableCell>
                      <TableCell>{product.cantidad}</TableCell>
                      <TableCell>{product.existencias}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
        </AdminPanelCard>
      ) : null}
    </AdminPageShell>
  );
}
