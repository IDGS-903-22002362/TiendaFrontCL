"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState, useRef } from "react";
import { categoriasApi } from "@/lib/api/categorias";
import { lineasApi } from "@/lib/api/lineas";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { Category, Linea } from "@/lib/types";
import { EntityPicker, type EntityOption } from "@/components/admin/entity-picker";
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
import { X } from "lucide-react";

type FormState = {
  id: string;
  nombre: string;
  lineaId: string;
  orden: string;
  imagenPrincipal: string | null;
  file: File | null;
  imageDeleted: boolean;
};

const EMPTY_FORM: FormState = {
  id: "",
  nombre: "",
  lineaId: "",
  orden: "",
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

export default function AdminCategoriasPage() {
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoriaId, setSelectedCategoriaId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [categoriasData, lineasData] = await Promise.all([
        categoriasApi.getAll(),
        lineasApi.getAll(),
      ]);
      setCategorias(categoriasData);
      setLineas(lineasData);
      setSelectedCategoriaId((current) =>
        current && !categoriasData.some((c) => c.id === current) ? "" : current,
      );
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudieron cargar los datos",
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const categoryOptions = useMemo<EntityOption[]>(() => {
    return categorias.map((cat) => ({
      id: cat.id,
      label: cat.name,
      subtitle: cat.slug,
    }));
  }, [categorias]);

  const lineaOptions = useMemo<EntityOption[]>(() => {
    return lineas.map((linea) => ({
      id: linea.id,
      label: linea.nombre,
      subtitle: `Línea: ${linea.codigo}`,
    }));
  }, [lineas]);

  const filteredCategorias = useMemo(() => {
    return categorias.filter((cat) => {
      if (selectedCategoriaId && cat.id !== selectedCategoriaId) {
        return false;
      }

      const query = normalizeSearch(searchQuery);

      if (!query) {
        return true;
      }

      return normalizeSearch(`${cat.name} ${cat.slug}`).includes(query);
    });
  }, [categorias, searchQuery, selectedCategoriaId]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setSelectedCategoriaId("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const selectCategoriaForEdit = (categoriaId: string) => {
    setSelectedCategoriaId(categoriaId);
    const selected = categorias.find((c) => c.id === categoriaId);
    if (!selected) {
      return;
    }

    setForm({
      id: selected.id,
      nombre: selected.name,
      lineaId: selected.lineaId ?? "",
      orden: selected.orden !== null && selected.orden !== undefined ? String(selected.orden) : "",
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
      nombre: form.nombre.trim(),
      lineaId: form.lineaId ? form.lineaId : undefined,
      orden: form.orden ? Number(form.orden) : undefined,
      imagenPrincipal: form.imageDeleted ? null : undefined, // Send null to clear image on update
    };

    setIsSaving(true);
    try {
      let savedCategoriaId = form.id;

      if (form.id) {
        if (form.imageDeleted && form.imagenPrincipal) {
           await categoriasApi.deleteImage(form.id);
        }
        await categoriasApi.update(form.id, payload);
      } else {
        const result = await categoriasApi.create(payload);
        savedCategoriaId = result.data?.id ?? "";
      }

      if (form.file && savedCategoriaId) {
        await categoriasApi.uploadImage(savedCategoriaId, form.file);
      }

      toast({
        title: form.id ? "Categoría actualizada" : "Categoría creada",
      });

      resetForm();
      await loadData();
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
      await categoriasApi.remove(id);
      toast({ title: "Categoría eliminada" });
      if (selectedCategoriaId === id) {
        resetForm();
      }
      await loadData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al eliminar",
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Buscar categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <EntityPicker
            label="Buscar categoría"
            searchLabel="Buscar por nombre o slug"
            selectLabel="Selecciona categoría para editar"
            query={searchQuery}
            value={selectedCategoriaId}
            options={categoryOptions}
            onQueryChange={setSearchQuery}
            onValueChange={(value) => {
              if (!value) {
                resetForm();
                return;
              }
              selectCategoriaForEdit(value);
            }}
            allowEmpty
            emptyLabel="Sin selección"
            disabled={isLoading}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{form.id ? "Editar categoría" : "Crear categoría"}</CardTitle>
        </CardHeader>
        <CardContent>
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
              placeholder="Nombre"
              value={form.nombre}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, nombre: event.target.value }))
              }
            />

            <EntityPicker
              label="Línea asociada"
              selectLabel="Selecciona línea (Opcional)"
              value={form.lineaId}
              options={lineaOptions}
              onValueChange={(val) => setForm((prev) => ({ ...prev, lineaId: val }))}
              allowEmpty
              emptyLabel="Ninguna"
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
                <TableHead>Imagen</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Línea</TableHead>
                <TableHead>Orden</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6}>Cargando...</TableCell>
                </TableRow>
              ) : filteredCategorias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    Sin categorías disponibles para el filtro actual.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategorias.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell>
                       {cat.imagenPrincipal ? (
                          <img src={cat.imagenPrincipal} alt={cat.name} className="h-10 w-10 object-cover rounded" />
                       ) : (
                          <div className="h-10 w-10 bg-muted rounded flex items-center justify-center text-[10px] text-muted-foreground">N/A</div>
                       )}
                    </TableCell>
                    <TableCell>{cat.name}</TableCell>
                    <TableCell>{cat.slug}</TableCell>
                    <TableCell>{lineas.find((l) => l.id === cat.lineaId)?.nombre || "-"}</TableCell>
                    <TableCell>{cat.orden ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => selectCategoriaForEdit(cat.id)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onDelete(cat.id)}
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
