"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState, useRef } from "react";
import { lineasApi } from "@/lib/api/lineas";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { Linea } from "@/lib/types";
import { EntityPicker, type EntityOption } from "@/components/admin/entity-picker";
import {
  AdminPageHeader,
  AdminPageShell,
  AdminPanelCard,
} from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
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
import { X } from "lucide-react";

type FormState = {
  id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
  imagenPrincipal: string | null;
  file: File | null;
  imageDeleted: boolean;
};

const EMPTY_FORM: FormState = {
  id: "",
  codigo: "",
  nombre: "",
  activo: true,
  imagenPrincipal: null,
  file: null,
  imageDeleted: false,
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
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    loadLineas();
  }, [loadLineas]);

  const lineOptions = useMemo<EntityOption[]>(() => {
    return lineas.map((linea) => ({
      id: linea.id,
      label: linea.nombre,
      subtitle: `Código: ${linea.codigo}`,
    }));
  }, [lineas]);

  const filteredLineas = useMemo(() => {
    return lineas.filter((linea) => {
      if (selectedLineaId && linea.id !== selectedLineaId) {
        return false;
      }

      const query = normalizeSearch(searchQuery);

      if (!query) {
        return true;
      }

      return normalizeSearch(`${linea.nombre} ${linea.codigo}`).includes(query);
    });
  }, [lineas, searchQuery, selectedLineaId]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setSelectedLineaId("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
      imagenPrincipal: selected.imagenPrincipal ?? null,
      file: null,
      imageDeleted: false,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      codigo: Number(form.codigo),
      nombre: form.nombre.trim(),
      activo: form.activo,
      imagenPrincipal: form.imageDeleted ? null : undefined, // Send null to clear image on update
    };

    setIsSaving(true);
    try {
      let savedLineaId = form.id;

      if (form.id) {
        if (form.imageDeleted && form.imagenPrincipal) {
           await lineasApi.deleteImage(form.id);
        }
        await lineasApi.update(form.id, payload);
      } else {
        const result = await lineasApi.create(payload);
        savedLineaId = result.data?.id ?? "";
      }

      if (form.file && savedLineaId) {
        await lineasApi.uploadImage(savedLineaId, form.file);
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
        title: "Error al inactivar",
        description: getApiErrorMessage(error),
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setForm((prev) => ({ ...prev, file: e.target.files![0], imageDeleted: false }));
    }
  };

  const handleRemoveImage = () => {
    setForm((prev) => ({ ...prev, file: null, imageDeleted: true }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const currentImageUrl = form.file
    ? URL.createObjectURL(form.file)
    : (!form.imageDeleted && form.imagenPrincipal)
      ? form.imagenPrincipal
      : null;

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Catálogo"
        title="Líneas"
        description="Administra líneas de producto, visibilidad e imagen principal."
      />

      <AdminPanelCard title="Buscar línea">
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
      </AdminPanelCard>

      <AdminPanelCard title={form.id ? "Editar línea" : "Crear línea"}>
          <form className="grid gap-3 md:grid-cols-3" onSubmit={onSubmit}>
            <div className="md:col-span-3">
              <label className="text-sm font-medium mb-1 block">Imagen Principal</label>
              <div className="flex items-center gap-4">
                 {currentImageUrl ? (
                    <div className="relative h-24 w-24 rounded border overflow-hidden">
                       <img src={currentImageUrl} alt="Preview" className="h-full w-full object-cover" />
                       <button
                         type="button"
                         onClick={handleRemoveImage}
                         className="absolute top-1 right-1 bg-black/50 hover:bg-black text-white p-1 rounded-full"
                       >
                         <X className="h-3 w-3" />
                       </button>
                    </div>
                 ) : (
                    <div className="h-24 w-24 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                      Sin imagen
                    </div>
                 )}
                 <div>
                   <Input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                   />
                 </div>
              </div>
            </div>

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
      </AdminPanelCard>

      <AdminPanelCard title="Listado" noPadding contentClassName="p-0">
          <div className="admin-table-shell overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imagen</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Activa</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5}>Cargando...</TableCell>
                </TableRow>
              ) : filteredLineas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    Sin líneas disponibles para el filtro actual.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLineas.map((linea) => (
                  <TableRow key={linea.id}>
                    <TableCell>
                       {linea.imagenPrincipal ? (
                          <img src={linea.imagenPrincipal} alt={linea.nombre} className="h-10 w-10 object-cover rounded" />
                       ) : (
                          <div className="h-10 w-10 bg-muted rounded flex items-center justify-center text-[10px] text-muted-foreground">N/A</div>
                       )}
                    </TableCell>
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
          </div>
      </AdminPanelCard>
    </AdminPageShell>
  );
}
