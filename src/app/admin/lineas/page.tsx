"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { lineasApi } from "@/lib/api/lineas";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { Linea } from "@/lib/types";
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
  codigo: "",
  nombre: "",
  activo: true,
};

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export default function AdminLineasPage() {
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLineaId, setSelectedLineaId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const { toast } = useToast();

  const loadLineas = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await lineasApi.getAll();
      setLineas(data);
      setSelectedLineaId((current) =>
        current && !data.some((linea) => linea.id === current) ? "" : current,
      );
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudieron cargar las líneas",
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadLineas();
  }, [loadLineas]);

  const lineOptions: EntityOption[] = useMemo(
    () =>
      lineas.map((linea) => ({
        id: linea.id,
        label: linea.nombre,
        subtitle: `Código ${linea.codigo}`,
      })),
    [lineas],
  );

  const filteredLineas = useMemo(() => {
    const query = normalizeSearch(searchQuery);

    return lineas.filter((linea) => {
      if (selectedLineaId && linea.id !== selectedLineaId) {
        return false;
      }

      if (!query) {
        return true;
      }

      return normalizeSearch(`${linea.nombre} ${linea.codigo}`).includes(query);
    });
  }, [lineas, searchQuery, selectedLineaId]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setSelectedLineaId("");
  };

  const selectLineaForEdit = (lineaId: string) => {
    setSelectedLineaId(lineaId);
    const selected = lineas.find((linea) => linea.id === lineaId);
    if (!selected) {
      return;
    }

    setForm({
      id: selected.id,
      codigo: String(selected.codigo),
      nombre: selected.nombre,
      activo: selected.activo,
    });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      codigo: Number(form.codigo),
      nombre: form.nombre.trim(),
      activo: form.activo,
    };

    setIsSaving(true);
    try {
      if (form.id) {
        await lineasApi.update(form.id, payload);
      } else {
        await lineasApi.create(payload);
      }

      toast({
        title: form.id ? "Línea actualizada" : "Línea creada",
      });

      resetForm();
      await loadLineas();
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
      await lineasApi.remove(id);
      toast({ title: "Línea inactivada" });
      if (selectedLineaId === id) {
        resetForm();
      }
      await loadLineas();
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
        <h1 className="font-headline text-3xl font-bold">Líneas</h1>
        <p className="text-sm text-muted-foreground">CRUD parcial de líneas.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Búsqueda inteligente</CardTitle>
        </CardHeader>
        <CardContent>
          <EntityPicker
            label="Buscar línea"
            searchLabel="Buscar por nombre o código"
            selectLabel="Selecciona línea para editar"
            query={searchQuery}
            value={selectedLineaId}
            options={lineOptions}
            onQueryChange={setSearchQuery}
            onValueChange={(value) => {
              if (!value) {
                resetForm();
                return;
              }
              selectLineaForEdit(value);
            }}
            allowEmpty
            emptyLabel="Sin selección"
            disabled={isLoading}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{form.id ? "Editar línea" : "Crear línea"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3" onSubmit={onSubmit}>
            <Input
              required
              type="number"
              min={1}
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
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Checkbox
                id="activo-linea"
                checked={form.activo}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, activo: Boolean(checked) }))
                }
              />
              <label htmlFor="activo-linea" className="text-sm">
                Activa
              </label>
            </div>

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
                <TableHead>Nombre</TableHead>
                <TableHead>Activa</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4}>Cargando...</TableCell>
                </TableRow>
              ) : filteredLineas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    Sin líneas disponibles para el filtro actual.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLineas.map((linea) => (
                  <TableRow key={linea.id}>
                    <TableCell>{linea.codigo}</TableCell>
                    <TableCell>{linea.nombre}</TableCell>
                    <TableCell>{linea.activo ? "Sí" : "No"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => selectLineaForEdit(linea.id)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onDelete(linea.id)}
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
