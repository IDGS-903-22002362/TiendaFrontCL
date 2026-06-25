"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit, Plus, RefreshCw, Trash2 } from "lucide-react";
import { fetchCategories, fetchProducts } from "@/lib/api/storefront";
import { lineasApi } from "@/lib/api/lineas";
import { tallasApi } from "@/lib/api/tallas";
import type { Category, Linea, Product, Talla } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api/errors";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import {
  EntityPicker,
  type EntityOption,
} from "@/components/admin/entity-picker";
import { DateTimePickerField } from "@/components/admin/datetime-picker-field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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

type TipoDescuento = "porcentaje" | "precio_fijo";
type AplicaA = "productos" | "categorias" | "lineas";

type Oferta = {
  id: string;
  titulo: string;
  descripcion?: string;
  estado: boolean;
  tallaIds: string[];
  tipoDescuento: TipoDescuento;
  valorDescuento: number;
  aplicaA: AplicaA;
  productoIds: string[];
  categoriaIds: string[];
  lineaIds: string[];
  fechaInicio: string;
  fechaFin: string;
  hastaAgotarExistencias: boolean;
  stockLimiteOferta: number | null;

  prioridad: number;
  combinable: boolean;
  badgeTexto: string;
  mostrarBadge: boolean;
};

type OfertaForm = {
  titulo: string;
  descripcion: string;
  estado: boolean;
  tipoDescuento: TipoDescuento;
  valorDescuento: string;
  aplicaA: AplicaA;
  productoIds: string[];
  categoriaIds: string[];
  lineaIds: string[];
  tallaIds: string[];
  fechaInicio: string;
  fechaFin: string;
  hastaAgotarExistencias: boolean;
  stockLimiteOferta: string;
};

type CodigoPromocionForm = {
  codigo: string;
  titulo: string;
  descripcion: string;
  estado: boolean;
  valorDescuento: string;
  aplicaA: AplicaA;
  productoIds: string[];
  categoriaIds: string[];
  lineaIds: string[];
  tallaIds: string[];
  fechaInicio: string;
  fechaFin: string;
  hastaAgotarExistencias: boolean;
  stockLimiteCodigo: string;
  montoMinimoCompra: string;
  acumulableConOfertas: boolean;
};

type CodigoPromocionPayload = {
  codigo: string;
  titulo: string;
  descripcion: string;
  estado: boolean;
  tipoDescuento: "porcentaje";
  valorDescuento: number;
  aplicaA: AplicaA;
  productoIds: string[];
  categoriaIds: string[];
  lineaIds: string[];
  tallaIds: string[];
  fechaInicio: string;
  fechaFin: string;
  hastaAgotarExistencias: boolean;
  stockLimiteCodigo: number | null;
  usoMaximoTotal: number | null;
  usoMaximoPorUsuario: number;
  montoMinimoCompra: number;
  acumulableConOfertas: boolean;
};

type CodigoPromocion = {
  id: string;
  codigo: string;
  titulo: string;
  descripcion?: string;
  estado: boolean;
  tipoDescuento: "porcentaje";
  valorDescuento: number;
  aplicaA: AplicaA;
  productoIds: string[];
  categoriaIds: string[];
  lineaIds: string[];
  tallaIds: string[];
  fechaInicio: string;
  fechaFin: string;
  hastaAgotarExistencias: boolean;
  stockLimiteCodigo: number | null;
  usoMaximoTotal: number | null;
  usoMaximoPorUsuario: number;
  montoMinimoCompra: number;
  acumulableConOfertas: boolean;
  usosActuales: number;
  stockUsadoCodigo: number;
};

const ADMIN_LIST_PAGE_SIZE = 10;

type DeleteTarget =
  | { type: "oferta"; item: Oferta }
  | { type: "codigo"; item: CodigoPromocion };

function getVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  return Array.from({ length: 5 }, (_, index) => start + index);
}

function canDeleteEntity(statusLabel: string) {
  return statusLabel === "Desactivada" || statusLabel === "Vencida";
}

type AdminListPaginationProps = {
  currentPage: number;
  totalItems: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
};

function AdminListPagination({
  currentPage,
  totalItems,
  itemLabel,
  onPageChange,
}: AdminListPaginationProps) {
  const totalPages = Math.max(
    1,
    Math.ceil(totalItems / ADMIN_LIST_PAGE_SIZE),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * ADMIN_LIST_PAGE_SIZE;
  const showingFrom = totalItems === 0 ? 0 : pageStart + 1;
  const showingTo = Math.min(pageStart + ADMIN_LIST_PAGE_SIZE, totalItems);
  const visiblePages = getVisiblePages(safeCurrentPage, totalPages);

  if (totalItems === 0) {
    return null;
  }

  const goToPage = (page: number) => {
    onPageChange(Math.max(1, Math.min(totalPages, page)));
  };

  return (
    <div className="flex flex-col gap-3 border-t border-border bg-muted/20 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="text-xs text-muted-foreground">
        Mostrando{" "}
        <span className="font-semibold text-foreground">
          {showingFrom}-{showingTo}
        </span>{" "}
        de{" "}
        <span className="font-semibold text-foreground">{totalItems}</span>{" "}
        {itemLabel}
      </div>

      <Pagination className="mx-0 w-full justify-start lg:w-auto lg:justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              aria-disabled={safeCurrentPage === 1}
              className={
                safeCurrentPage === 1
                  ? "pointer-events-none opacity-45"
                  : undefined
              }
              onClick={(event) => {
                event.preventDefault();
                goToPage(safeCurrentPage - 1);
              }}
            />
          </PaginationItem>

          {visiblePages.map((page) => (
            <PaginationItem key={page} className="hidden sm:block">
              <PaginationLink
                href="#"
                isActive={page === safeCurrentPage}
                onClick={(event) => {
                  event.preventDefault();
                  goToPage(page);
                }}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              href="#"
              aria-disabled={safeCurrentPage === totalPages}
              className={
                safeCurrentPage === totalPages
                  ? "pointer-events-none opacity-45"
                  : undefined
              }
              onClick={(event) => {
                event.preventDefault();
                goToPage(safeCurrentPage + 1);
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

function paginateItems<T>(items: T[], currentPage: number) {
  const totalPages = Math.max(
    1,
    Math.ceil(items.length / ADMIN_LIST_PAGE_SIZE),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * ADMIN_LIST_PAGE_SIZE;

  return {
    totalPages,
    safeCurrentPage,
    paginatedItems: items.slice(
      pageStart,
      pageStart + ADMIN_LIST_PAGE_SIZE,
    ),
  };
}

const EMPTY_FORM: OfertaForm = {
  titulo: "",
  descripcion: "",
  estado: true,
  tipoDescuento: "porcentaje",
  valorDescuento: "",
  aplicaA: "productos",
  productoIds: [],
  categoriaIds: [],
  lineaIds: [],
  tallaIds: [],
  fechaInicio: "",
  fechaFin: "",
  hastaAgotarExistencias: true,
  stockLimiteOferta: "",
};

const EMPTY_CODIGO_PROMOCION_FORM: CodigoPromocionForm = {
  codigo: "",
  titulo: "",
  descripcion: "",
  estado: true,
  valorDescuento: "",
  aplicaA: "productos",
  productoIds: [],
  categoriaIds: [],
  lineaIds: [],
  tallaIds: [],
  fechaInicio: "",
  fechaFin: "",
  hastaAgotarExistencias: true,
  stockLimiteCodigo: "",
  montoMinimoCompra: "1",
  acumulableConOfertas: false,
};

function normalizeSearchValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  return apiFetch<T>(path, options, { local: true });
}

function unwrapArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];

  if (!payload || typeof payload !== "object") return [];

  const record = payload as Record<string, unknown>;

  if (Array.isArray(record.data)) return record.data as T[];

  if (record.data && typeof record.data === "object") {
    const dataRecord = record.data as Record<string, unknown>;

    if (Array.isArray(dataRecord.items)) return dataRecord.items as T[];
    if (Array.isArray(dataRecord.ofertas)) return dataRecord.ofertas as T[];
    if (Array.isArray(dataRecord.codigosPromocion)) {
      return dataRecord.codigosPromocion as T[];
    }
    if (Array.isArray(dataRecord.codigos)) return dataRecord.codigos as T[];
  }

  if (Array.isArray(record.items)) return record.items as T[];
  if (Array.isArray(record.ofertas)) return record.ofertas as T[];
  if (Array.isArray(record.codigosPromocion)) {
    return record.codigosPromocion as T[];
  }
  if (Array.isArray(record.codigos)) return record.codigos as T[];

  return [];
}

function toStringValue(value: unknown, fallback = "") {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return String(value);
  return fallback;
}

function toNumberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBooleanValue(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";
  return fallback;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => toStringValue(item).trim()).filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return [];
}

function resolveProductoIds(item: Record<string, unknown>): string[] {
  const fromArray = toStringArray(item.productoIds);
  if (fromArray.length > 0) return fromArray;

  const legacyProductoId = toStringValue(item.productoId).trim();
  return legacyProductoId ? [legacyProductoId] : [];
}

type FirestoreTimestampLike = {
  seconds?: number;
  _seconds?: number;
  nanoseconds?: number;
  _nanoseconds?: number;
  toDate?: () => Date;
};

function toDateFromUnknown(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) return null;

    const date = new Date(trimmed);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "number") {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "object") {
    const timestamp = value as FirestoreTimestampLike;

    if (typeof timestamp.toDate === "function") {
      try {
        const date = timestamp.toDate();

        return Number.isNaN(date.getTime()) ? null : date;
      } catch {
        return null;
      }
    }

    const seconds =
      typeof timestamp.seconds === "number"
        ? timestamp.seconds
        : timestamp._seconds;

    const nanoseconds =
      typeof timestamp.nanoseconds === "number"
        ? timestamp.nanoseconds
        : timestamp._nanoseconds ?? 0;

    if (typeof seconds === "number") {
      const date = new Date(seconds * 1000 + Math.floor(nanoseconds / 1_000_000));

      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  return null;
}

function toDateStringValue(value: unknown): string {
  const date = toDateFromUnknown(value);

  if (date) {
    return date.toISOString();
  }

  return toStringValue(value);
}

function normalizeOferta(raw: unknown): Oferta {
  const item =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  return {
    id: toStringValue(item.id ?? item.ofertaId),
    titulo: toStringValue(item.titulo),
    descripcion: toStringValue(item.descripcion),
    estado: toBooleanValue(item.estado, true),
    tallaIds: toStringArray(item.tallaIds),
    tipoDescuento: toStringValue(
      item.tipoDescuento,
      "porcentaje",
    ) as TipoDescuento,
    valorDescuento: toNumberValue(item.valorDescuento),
    aplicaA: toStringValue(item.aplicaA, "productos") as AplicaA,
    productoIds: resolveProductoIds(item),
    categoriaIds: toStringArray(item.categoriaIds),
    lineaIds: toStringArray(item.lineaIds),
    fechaInicio: toDateStringValue(item.fechaInicio),
fechaFin: toDateStringValue(item.fechaFin),
hastaAgotarExistencias: toBooleanValue(item.hastaAgotarExistencias, true),
stockLimiteOferta:
  item.stockLimiteOferta === null || item.stockLimiteOferta === undefined
    ? null
    : toNumberValue(item.stockLimiteOferta),

prioridad: toNumberValue(item.prioridad, 1),
combinable: toBooleanValue(item.combinable, false),
badgeTexto: toStringValue(item.badgeTexto, "Oferta"),
mostrarBadge: toBooleanValue(item.mostrarBadge, true),
  };
}

function normalizeCodigoPromocion(raw: unknown): CodigoPromocion {
  const item =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  return {
    id: toStringValue(item.id ?? item.codigoPromocionId ?? item.codigo),
    codigo: toStringValue(item.codigo).toUpperCase(),
    titulo: toStringValue(item.titulo),
    descripcion: toStringValue(item.descripcion),
    estado: toBooleanValue(item.estado, true),
    tipoDescuento: "porcentaje",
    valorDescuento: toNumberValue(item.valorDescuento),
    aplicaA: toStringValue(item.aplicaA, "productos") as AplicaA,
    productoIds: resolveProductoIds(item),
    categoriaIds: toStringArray(item.categoriaIds),
    lineaIds: toStringArray(item.lineaIds),
    tallaIds: toStringArray(item.tallaIds),
    fechaInicio: toDateStringValue(item.fechaInicio),
    fechaFin: toDateStringValue(item.fechaFin),
    hastaAgotarExistencias: toBooleanValue(
      item.hastaAgotarExistencias,
      true,
    ),
    stockLimiteCodigo:
      item.stockLimiteCodigo === null || item.stockLimiteCodigo === undefined
        ? null
        : toNumberValue(item.stockLimiteCodigo),
    usoMaximoTotal:
      item.usoMaximoTotal === null || item.usoMaximoTotal === undefined
        ? null
        : toNumberValue(item.usoMaximoTotal),
    usoMaximoPorUsuario: toNumberValue(item.usoMaximoPorUsuario, 1),
    montoMinimoCompra: toNumberValue(item.montoMinimoCompra, 1),
    acumulableConOfertas: toBooleanValue(item.acumulableConOfertas, false),
    usosActuales: toNumberValue(item.usosActuales),
    stockUsadoCodigo: toNumberValue(item.stockUsadoCodigo),
  };
}

async function fetchOfertas(): Promise<Oferta[]> {
  const response = await apiRequest<unknown>("/api/ofertas");
  return unwrapArray<unknown>(response).map(normalizeOferta);
}

async function fetchCodigosPromocion(): Promise<CodigoPromocion[]> {
  const response = await apiRequest<unknown>("/api/codigos-promocion");
  return unwrapArray<unknown>(response).map(normalizeCodigoPromocion);
}

async function createOferta(payload: Omit<Oferta, "id">) {
  return apiRequest<unknown>("/api/ofertas", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function updateOferta(id: string, payload: Omit<Oferta, "id">) {
  return apiRequest<unknown>(`/api/ofertas/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

async function createCodigoPromocion(payload: CodigoPromocionPayload) {
  return apiRequest<unknown>("/api/codigos-promocion", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function updateCodigoPromocion(
  id: string,
  payload: CodigoPromocionPayload,
) {
  return apiRequest<unknown>(`/api/codigos-promocion/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

async function deleteOferta(id: string) {
  return apiRequest<unknown>(`/api/ofertas/${id}`, {
    method: "DELETE",
  });
}

async function deleteCodigoPromocion(id: string) {
  return apiRequest<unknown>(`/api/codigos-promocion/${id}`, {
    method: "DELETE",
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);
}

function formatDateTime(value: unknown) {
  const date = toDateFromUnknown(value);

  if (!date) return "-";

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function toDateTimeLocalValue(value: unknown) {
  const date = toDateFromUnknown(value);

  if (!date) return "";

  const offsetMs = date.getTimezoneOffset() * 60_000;
  const localDate = new Date(date.getTime() - offsetMs);

  return localDate.toISOString().slice(0, 16);
}

function toIsoDateTime(value: string) {
  const date = toDateFromUnknown(value);

  if (!date) return null;

  return date.toISOString();
}

function getOfertaStatus(
  oferta: Pick<Oferta, "estado" | "fechaInicio" | "fechaFin">,
) {
  if (!oferta.estado) {
    return {
      label: "Desactivada",
      className: "bg-neutral-100 text-neutral-700 border-neutral-200",
    };
  }

  const now = Date.now();
  const start = new Date(oferta.fechaInicio).getTime();
  const end = new Date(oferta.fechaFin).getTime();

  if (Number.isFinite(start) && now < start) {
    return {
      label: "Programada",
      className: "bg-blue-50 text-blue-700 border-blue-200",
    };
  }

  if (Number.isFinite(end) && now > end) {
    return {
      label: "Vencida",
      className: "bg-red-50 text-red-700 border-red-200",
    };
  }

  return {
    label: "Activa",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
}

function getDiscountLabel(oferta: Oferta) {
  if (oferta.tipoDescuento === "porcentaje") {
    return `${oferta.valorDescuento}%`;
  }

  return formatCurrency(oferta.valorDescuento);
}

function isOfertaVigenteNow(oferta: Oferta, now: number = Date.now()): boolean {
  if (!oferta.estado) return false;

  const inicio = new Date(oferta.fechaInicio).getTime();
  const fin = new Date(oferta.fechaFin).getTime();

  if (Number.isNaN(inicio) || Number.isNaN(fin)) return false;

  return now >= inicio && now <= fin;
}

function getAplicaALabel(value: AplicaA) {
  const labels: Record<AplicaA, string> = {
    productos: "Productos",
    categorias: "Categorías",
    lineas: "Líneas",
  };

  return labels[value] ?? value;
}

function getIdsForAplicaA(formData: OfertaForm) {
  if (formData.aplicaA === "productos") return formData.productoIds;
  if (formData.aplicaA === "categorias") return formData.categoriaIds;
  return formData.lineaIds;
}

function getIdsForCodigoPromocion(formData: CodigoPromocionForm) {
  if (formData.aplicaA === "productos") return formData.productoIds;
  if (formData.aplicaA === "categorias") return formData.categoriaIds;
  return formData.lineaIds;
}

type MultiSelectBlockProps = {
  title: string;
  description?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  options: EntityOption[];
  selectedIds: string[];
  onToggle: (id: string, checked: boolean) => void;
  disabled?: boolean;
  emptyMessage?: string;
  singleSelection?: boolean;
  disabledOptionIds?: Set<string>;
  disabledOptionNote?: string;
  noteByOptionId?: Record<string, string>;
};
type TargetSelectionField = "productoIds" | "categoriaIds" | "lineaIds";

type ActiveTargetOptionConfig = {
  title: string;
  description: string;
  options: EntityOption[];
  selectedIds: string[];
  query: string;
  setQuery: (value: string) => void;
  field: TargetSelectionField;
  emptyMessage: string;
};

function MultiSelectBlock({
  title,
  description,
  searchValue,
  onSearchChange,
  options,
  selectedIds,
  onToggle,
  disabled,
  emptyMessage = "No hay opciones disponibles.",
  singleSelection = false,
  disabledOptionIds,
  disabledOptionNote,
  noteByOptionId,
}: MultiSelectBlockProps) {
const filteredOptions = useMemo(() => {
  if (singleSelection && selectedIds.length > 0) {
    return options.filter((option) => selectedIds.includes(option.id));
  }

  const query = normalizeSearchValue(searchValue);

  if (!query) {
    return options;
  }

  return options.filter((option) =>
    normalizeSearchValue(`${option.label} ${option.subtitle ?? ""}`).includes(
      query,
    ),
  );
}, [options, searchValue, selectedIds, singleSelection]);

  return (
    <div className="space-y-2">
      <div>
        <Label>{title}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>

      <Input
        placeholder="Buscar..."
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
        disabled={disabled}
      />

      <div className="rounded-md border p-3 max-h-56 overflow-y-auto">
        {filteredOptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="grid gap-2">
            {filteredOptions.map((option) => {
              const isChecked = selectedIds.includes(option.id);
              const isOptionDisabled =
                Boolean(disabledOptionIds?.has(option.id)) && !isChecked;
              const note = disabledOptionIds?.has(option.id)
                ? disabledOptionNote
                : noteByOptionId?.[option.id];

              return (
                <label
                  key={option.id}
                  className={cn(
                    "flex items-start gap-2 text-sm",
                    isOptionDisabled
                      ? "cursor-not-allowed opacity-60"
                      : "cursor-pointer",
                  )}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked) =>
                      onToggle(option.id, checked === true)
                    }
                    disabled={disabled || isOptionDisabled}
                  />

                  <span className="flex flex-col leading-tight">
                    <span className="font-medium">{option.label}</span>
                    {option.subtitle && (
                      <span className="text-xs text-muted-foreground">
                        {option.subtitle}
                      </span>
                    )}
                    {note && (
                      <span className="text-xs font-medium text-amber-600">
                        {note}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
  {singleSelection
    ? `Seleccionado: ${selectedIds.length}`
    : `Seleccionados: ${selectedIds.length}`}
</p>
    </div>
  );
}

export default function AdminOfertasPage() {
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [codigosPromocion, setCodigosPromocion] = useState<CodigoPromocion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [tallas, setTallas] = useState<Talla[]>([]);

  const [ofertaSearchQuery, setOfertaSearchQuery] = useState("");
  const [selectedOfertaId, setSelectedOfertaId] = useState("");

  const [productoQuery, setProductoQuery] = useState("");
  const [categoriaQuery, setCategoriaQuery] = useState("");
  const [lineaQuery, setLineaQuery] = useState("");
  const [tallaQuery, setTallaQuery] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCodigos, setIsLoadingCodigos] = useState(true);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOfertaId, setEditingOfertaId] = useState<string | null>(null);
  const [formData, setFormData] = useState<OfertaForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const [isCodigoDialogOpen, setIsCodigoDialogOpen] = useState(false);
  const [editingCodigoPromocionId, setEditingCodigoPromocionId] = useState<
    string | null
  >(null);
  const [codigoFormData, setCodigoFormData] = useState<CodigoPromocionForm>(
    EMPTY_CODIGO_PROMOCION_FORM,
  );
  const [isSavingCodigo, setIsSavingCodigo] = useState(false);

const [codigoProductoQuery, setCodigoProductoQuery] = useState("");
const [codigoCategoriaQuery, setCodigoCategoriaQuery] = useState("");
const [codigoLineaQuery, setCodigoLineaQuery] = useState("");
const [codigoTallaQuery, setCodigoTallaQuery] = useState("");

  const [ofertasPage, setOfertasPage] = useState(1);
  const [codigosPage, setCodigosPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { toast } = useToast();

  const loadOfertas = useCallback(async () => {
    setIsLoading(true);

    try {
      const list = await fetchOfertas();

      setOfertas(list);
      setSelectedOfertaId((current) =>
        current && !list.some((oferta) => oferta.id === current) ? "" : current,
      );
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al cargar ofertas",
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const loadCodigosPromocion = useCallback(async () => {
  setIsLoadingCodigos(true);

  try {
    const list = await fetchCodigosPromocion();

    setCodigosPromocion(list);
  } catch (error) {
    toast({
      variant: "destructive",
      title: "Error al cargar códigos promocionales",
      description: getApiErrorMessage(error),
    });
  } finally {
    setIsLoadingCodigos(false);
  }
}, [toast]);

  const loadMeta = useCallback(async () => {
    setIsLoadingMeta(true);

    try {
      const [productsData, categoriesData, lineasData, tallasData] =
        await Promise.all([
          fetchProducts(),
          fetchCategories(),
          lineasApi.getAll(),
          tallasApi.getAll(),
        ]);

        console.log("categoriesData:", categoriesData);

      setProducts(productsData);
      setCategorias(categoriesData);
      setLineas(lineasData);
      setTallas(tallasData);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudieron cargar catálogos",
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsLoadingMeta(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadOfertas();
  }, [loadOfertas]);

  useEffect(() => {
  void loadCodigosPromocion();
}, [loadCodigosPromocion]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  const ofertaOptions: EntityOption[] = useMemo(
    () =>
      ofertas.map((oferta) => ({
        id: oferta.id,
        label: oferta.titulo,
        subtitle: `${getDiscountLabel(oferta)} · ${getAplicaALabel(
          oferta.aplicaA,
        )}`,
      })),
    [ofertas],
  );

  const productOptions: EntityOption[] = useMemo(
    () =>
      products.map((product) => ({
        id: product.id,
        label: product.name,
        subtitle: `${product.clave ?? ""} ${product.description ?? ""}`.trim(),
      })),
    [products],
  );

  const categoryOptions: EntityOption[] = useMemo(
    () =>
      categorias.map((category) => ({
        id: category.id,
        label: category.name,
        subtitle: category.slug,
      })),
    [categorias],
  );

  const lineOptions: EntityOption[] = useMemo(
    () =>
      lineas.map((linea) => ({
        id: linea.id,
        label: linea.nombre,
        subtitle: `Código ${linea.codigo}`,
      })),
    [lineas],
  );

  const tallaOptions: EntityOption[] = useMemo(
    () =>
      tallas.map((talla) => ({
        id: talla.id,
        label: talla.codigo,
        subtitle: talla.descripcion,
      })),
    [tallas],
  );

  // CAMBIO 1: productos que ya están cubiertos por OTRA oferta activa/vigente
  // (alcance "productos"). Se excluye la oferta que se está editando para no
  // bloquear un producto contra su propia oferta. El backend revalida esto.
  const productosConOfertaActiva = useMemo(() => {
    const map = new Map<string, string>();
    const now = Date.now();

    for (const oferta of ofertas) {
      if (oferta.id === editingOfertaId) continue;
      if (oferta.aplicaA !== "productos") continue;
      if (!isOfertaVigenteNow(oferta, now)) continue;

      for (const productoId of oferta.productoIds) {
        if (!map.has(productoId)) {
          map.set(productoId, oferta.titulo);
        }
      }
    }

    return map;
  }, [ofertas, editingOfertaId]);

  const productosConOfertaActivaIds = useMemo(
    () => new Set(productosConOfertaActiva.keys()),
    [productosConOfertaActiva],
  );

  // CAMBIO 2: en "Tallas específicas" mostrar solo las tallas de los productos
  // seleccionados (unión). Solo aplica al alcance "productos"; para categorías o
  // líneas se conserva el comportamiento actual (todas las tallas).
  const tallasDeOferta = useMemo(() => {
    if (formData.aplicaA !== "productos") {
      return {
        options: tallaOptions,
        locked: false,
        emptyMessage: "No hay tallas disponibles.",
        notes: {} as Record<string, string>,
      };
    }

    if (formData.productoIds.length === 0) {
      return {
        options: [] as EntityOption[],
        locked: true,
        emptyMessage:
          "Selecciona productos primero para ver sus tallas disponibles.",
        notes: {} as Record<string, string>,
      };
    }

    const disponibles = new Set<string>();

    for (const productoId of formData.productoIds) {
      const product = products.find((item) => item.id === productoId);
      product?.tallaIds?.forEach((tallaId) => disponibles.add(tallaId));
    }

    const base = tallaOptions.filter((option) => disponibles.has(option.id));
    const baseIds = new Set(base.map((option) => option.id));
    const notes: Record<string, string> = {};

    // Conservar tallas ya guardadas que ya no pertenecen a los productos
    // seleccionados, marcándolas en lugar de perderlas silenciosamente.
    const huerfanas: EntityOption[] = formData.tallaIds
      .filter((tallaId) => !baseIds.has(tallaId))
      .map((tallaId) => {
        notes[tallaId] = "Ya no está en los productos seleccionados";
        return (
          tallaOptions.find((option) => option.id === tallaId) ?? {
            id: tallaId,
            label: tallaId,
          }
        );
      });

    return {
      options: [...base, ...huerfanas],
      locked: false,
      emptyMessage:
        "Los productos seleccionados no tienen tallas configuradas.",
      notes,
    };
  }, [formData.aplicaA, formData.productoIds, formData.tallaIds, products, tallaOptions]);

  const filteredOfertas = useMemo(() => {
    const query = normalizeSearchValue(ofertaSearchQuery);

    return ofertas.filter((oferta) => {
      if (selectedOfertaId && oferta.id !== selectedOfertaId) {
        return false;
      }

      if (!query) {
        return true;
      }

      return normalizeSearchValue(
        `${oferta.titulo} ${oferta.descripcion ?? ""} ${
          oferta.aplicaA
        } ${oferta.tipoDescuento}`,
      ).includes(query);
    });
  }, [ofertaSearchQuery, ofertas, selectedOfertaId]);

  const { paginatedItems: paginatedOfertas, totalPages: ofertasTotalPages } =
    useMemo(() => {
    const pagination = paginateItems(filteredOfertas, ofertasPage);

    return {
      paginatedItems: pagination.paginatedItems,
      safeCurrentPage: pagination.safeCurrentPage,
      totalPages: pagination.totalPages,
    };
  }, [filteredOfertas, ofertasPage]);

  const { paginatedItems: paginatedCodigos, totalPages: codigosTotalPages } =
    useMemo(() => {
    const pagination = paginateItems(codigosPromocion, codigosPage);

    return {
      paginatedItems: pagination.paginatedItems,
      safeCurrentPage: pagination.safeCurrentPage,
      totalPages: pagination.totalPages,
    };
  }, [codigosPromocion, codigosPage]);

  useEffect(() => {
    if (ofertasPage > ofertasTotalPages) {
      setOfertasPage(ofertasTotalPages);
    }
  }, [ofertasPage, ofertasTotalPages]);

  useEffect(() => {
    if (codigosPage > codigosTotalPages) {
      setCodigosPage(codigosTotalPages);
    }
  }, [codigosPage, codigosTotalPages]);

  useEffect(() => {
    setOfertasPage(1);
  }, [ofertaSearchQuery, selectedOfertaId]);

  const resetDialogState = () => {
    setIsDialogOpen(false);
    setEditingOfertaId(null);
    setFormData(EMPTY_FORM);
    setProductoQuery("");
    setCategoriaQuery("");
    setLineaQuery("");
    setTallaQuery("");
  };

  const resetCodigoPromocionDialogState = () => {
    setIsCodigoDialogOpen(false);
    setEditingCodigoPromocionId(null);
    setCodigoFormData(EMPTY_CODIGO_PROMOCION_FORM);
    setCodigoProductoQuery("");
    setCodigoCategoriaQuery("");
    setCodigoLineaQuery("");
    setCodigoTallaQuery("");
  };

  const openCodigoPromocionForm = (codigoPromo?: CodigoPromocion) => {
    if (codigoPromo) {
      setEditingCodigoPromocionId(codigoPromo.id);
      setCodigoFormData({
        codigo: codigoPromo.codigo,
        titulo: codigoPromo.titulo,
        descripcion: codigoPromo.descripcion ?? "",
        estado: codigoPromo.estado,
        valorDescuento: String(codigoPromo.valorDescuento),
        aplicaA: codigoPromo.aplicaA,
        productoIds: codigoPromo.productoIds,
        categoriaIds: codigoPromo.categoriaIds.slice(0, 1),
        lineaIds: codigoPromo.lineaIds.slice(0, 1),
        tallaIds: codigoPromo.tallaIds,
        fechaInicio: toDateTimeLocalValue(codigoPromo.fechaInicio),
        fechaFin: toDateTimeLocalValue(codigoPromo.fechaFin),
        hastaAgotarExistencias:
          codigoPromo.aplicaA === "productos" &&
          codigoPromo.stockLimiteCodigo !== null &&
          codigoPromo.stockLimiteCodigo !== undefined &&
          codigoPromo.stockLimiteCodigo > 0
            ? false
            : true,
        stockLimiteCodigo:
          codigoPromo.aplicaA === "productos" &&
          codigoPromo.stockLimiteCodigo !== null &&
          codigoPromo.stockLimiteCodigo !== undefined &&
          codigoPromo.stockLimiteCodigo > 0
            ? String(codigoPromo.stockLimiteCodigo)
            : "",
        montoMinimoCompra: String(codigoPromo.montoMinimoCompra),
        acumulableConOfertas: codigoPromo.acumulableConOfertas,
      });
      setCodigoProductoQuery("");
      setCodigoCategoriaQuery("");
      setCodigoLineaQuery("");
      setCodigoTallaQuery("");
      setIsCodigoDialogOpen(true);
      return;
    }

    setEditingCodigoPromocionId(null);
    setCodigoFormData(EMPTY_CODIGO_PROMOCION_FORM);
    setCodigoProductoQuery("");
    setCodigoCategoriaQuery("");
    setCodigoLineaQuery("");
    setCodigoTallaQuery("");
    setIsCodigoDialogOpen(true);
  };

  const openForm = (oferta?: Oferta) => {
    if (oferta) {
      setEditingOfertaId(oferta.id);
      setFormData({
        titulo: oferta.titulo,
        descripcion: oferta.descripcion ?? "",
        estado: oferta.estado,
        tipoDescuento: "porcentaje",
        valorDescuento: String(oferta.valorDescuento),
        aplicaA: oferta.aplicaA,
        productoIds: oferta.productoIds,
        categoriaIds: oferta.categoriaIds.slice(0, 1),
        lineaIds: oferta.lineaIds.slice(0, 1),
        tallaIds: oferta.tallaIds,
       fechaInicio: toDateTimeLocalValue(oferta.fechaInicio),
fechaFin: toDateTimeLocalValue(oferta.fechaFin),
hastaAgotarExistencias:
  oferta.aplicaA === "productos" &&
  oferta.stockLimiteOferta !== null &&
  oferta.stockLimiteOferta !== undefined &&
  oferta.stockLimiteOferta > 0
    ? false
    : true,
stockLimiteOferta:
  oferta.aplicaA === "productos" &&
  oferta.stockLimiteOferta !== null &&
  oferta.stockLimiteOferta !== undefined &&
  oferta.stockLimiteOferta > 0
    ? String(oferta.stockLimiteOferta)
    : "",
      });
      setSelectedOfertaId(oferta.id);
      setProductoQuery("");
      setCategoriaQuery("");
      setLineaQuery("");
      setTallaQuery("");
      setIsDialogOpen(true);
      return;
    }

    setEditingOfertaId(null);
    setFormData(EMPTY_FORM);
    setProductoQuery("");
    setCategoriaQuery("");
    setLineaQuery("");
    setTallaQuery("");
    setIsDialogOpen(true);
  };

  const handleToggleArrayValue = (
  field: "productoIds" | "categoriaIds" | "lineaIds" | "tallaIds",
  id: string,
  checked: boolean,
) => {
  const isSingleSelectionField =
    field === "categoriaIds" || field === "lineaIds";

  setFormData((prev) => ({
    ...prev,
    [field]: checked
      ? isSingleSelectionField
        ? [id]
        : prev[field].includes(id)
          ? prev[field]
          : [...prev[field], id]
      : prev[field].filter((currentId) => currentId !== id),
  }));
};

const handleToggleCodigoArrayValue = (
  field: "productoIds" | "categoriaIds" | "lineaIds" | "tallaIds",
  id: string,
  checked: boolean,
) => {
  const isSingleSelectionField =
    field === "categoriaIds" || field === "lineaIds";

  setCodigoFormData((prev) => ({
    ...prev,
    [field]: checked
      ? isSingleSelectionField
        ? [id]
        : prev[field].includes(id)
          ? prev[field]
          : [...prev[field], id]
      : prev[field].filter((currentId) => currentId !== id),
  }));
};

  const handleEditSelectedOferta = () => {
    if (!selectedOfertaId) return;

    const selected = ofertas.find((oferta) => oferta.id === selectedOfertaId);

    if (!selected) {
      toast({
        variant: "destructive",
        title: "Selección inválida",
        description: "La oferta seleccionada ya no existe en el listado.",
      });
      setSelectedOfertaId("");
      return;
    }

    openForm(selected);
  };

  const buildPayload = (): Omit<Oferta, "id"> | null => {
    if (!formData.titulo.trim()) {
      toast({
        variant: "destructive",
        title: "Faltan datos",
        description: "El título de la oferta es obligatorio.",
      });
      return null;
    }

    if (!formData.valorDescuento.trim()) {
      toast({
        variant: "destructive",
        title: "Faltan datos",
        description: "El valor del descuento es obligatorio.",
      });
      return null;
    }

    const valorDescuento = Number(formData.valorDescuento);

    if (!Number.isFinite(valorDescuento) || valorDescuento <= 0) {
      toast({
        variant: "destructive",
        title: "Descuento inválido",
        description: "El valor del descuento debe ser mayor a 0.",
      });
      return null;
    }

    if (valorDescuento > 100) {
  toast({
    variant: "destructive",
    title: "Porcentaje inválido",
    description: "El porcentaje de descuento no puede ser mayor a 100.",
  });
  return null;
}

    if (!formData.fechaInicio || !formData.fechaFin) {
      toast({
        variant: "destructive",
        title: "Faltan fechas",
        description: "La fecha de inicio y la fecha de fin son obligatorias.",
      });
      return null;
    }

    const fechaInicio = toIsoDateTime(formData.fechaInicio);
const fechaFin = toIsoDateTime(formData.fechaFin);

if (!fechaInicio || !fechaFin) {
  toast({
    variant: "destructive",
    title: "Fechas inválidas",
    description: "El formato de fecha y hora no es válido.",
  });
  return null;
}

if (new Date(fechaInicio).getTime() >= new Date(fechaFin).getTime()) {
  toast({
    variant: "destructive",
    title: "Fechas inválidas",
    description: "La fecha de fin debe ser posterior a la fecha de inicio.",
  });
  return null;
}

    const selectedIds = getIdsForAplicaA(formData);

if (selectedIds.length === 0) {
  toast({
    variant: "destructive",
    title: "Falta seleccionar alcance",
    description:
      formData.aplicaA === "productos"
        ? "Selecciona al menos un producto para la oferta."
        : "Selecciona una categoría o línea para la oferta.",
  });
  return null;
}

if (formData.aplicaA !== "productos" && selectedIds.length > 1) {
  toast({
    variant: "destructive",
    title: "Solo puedes seleccionar una opción",
    description:
      "La oferta solo puede aplicar a una categoría o una línea.",
  });
  return null;
}

const usaLimiteStock =
  formData.aplicaA === "productos" && !formData.hastaAgotarExistencias;

let stockLimiteOferta: number | null = null;

if (usaLimiteStock) {
  const rawStockLimite = formData.stockLimiteOferta.trim();

  if (!rawStockLimite) {
    toast({
      variant: "destructive",
      title: "Falta stock límite",
      description:
        "Ingresa cuántas piezas tendrán descuento para este producto.",
    });
    return null;
  }

  const stockLimiteNumber = Number(rawStockLimite);

  if (
    !Number.isFinite(stockLimiteNumber) ||
    !Number.isInteger(stockLimiteNumber) ||
    stockLimiteNumber <= 0
  ) {
    toast({
      variant: "destructive",
      title: "Stock inválido",
      description:
        "El stock límite debe ser un número entero mayor a 0.",
    });
    return null;
  }

  stockLimiteOferta = stockLimiteNumber;
}

return {
  titulo: formData.titulo.trim(),
  descripcion: formData.descripcion.trim(),
  estado: formData.estado,

  tallaIds: formData.tallaIds,

  tipoDescuento: "porcentaje",
  valorDescuento,

  aplicaA: formData.aplicaA,

  productoIds:
  formData.aplicaA === "productos" ? formData.productoIds : [],
categoriaIds:
  formData.aplicaA === "categorias" ? formData.categoriaIds.slice(0, 1) : [],
lineaIds:
  formData.aplicaA === "lineas" ? formData.lineaIds.slice(0, 1) : [],

  fechaInicio,
  fechaFin,

  hastaAgotarExistencias:
  formData.aplicaA === "productos" ? formData.hastaAgotarExistencias : true,
stockLimiteOferta:
  formData.aplicaA === "productos" ? stockLimiteOferta : null,

  prioridad: 1,
  combinable: false,
  badgeTexto: "Oferta",
  mostrarBadge: true,
};
  };

  const handleSave = async () => {
    const payload = buildPayload();

    if (!payload) return;
    console.log("payload crear/editar oferta:", payload);

    setIsSaving(true);

    try {
      if (editingOfertaId) {
        await updateOferta(editingOfertaId, payload);
        toast({ title: "Oferta actualizada con éxito" });
      } else {
        await createOferta(payload);
        toast({ title: "Oferta creada con éxito" });
      }

      resetDialogState();
      void loadOfertas();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al guardar oferta",
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const buildCodigoPromocionPayload = (): CodigoPromocionPayload | null => {
  const codigo = codigoFormData.codigo.trim().toUpperCase();

  if (!codigo) {
    toast({
      variant: "destructive",
      title: "Falta código",
      description: "Ingresa el código promocional, por ejemplo LEON20.",
    });
    return null;
  }

  if (!codigoFormData.titulo.trim()) {
    toast({
      variant: "destructive",
      title: "Falta título",
      description: "El título del código promocional es obligatorio.",
    });
    return null;
  }

  if (!codigoFormData.valorDescuento.trim()) {
    toast({
      variant: "destructive",
      title: "Falta descuento",
      description: "Ingresa el porcentaje de descuento.",
    });
    return null;
  }

  const valorDescuento = Number(codigoFormData.valorDescuento);

  if (
    !Number.isFinite(valorDescuento) ||
    valorDescuento <= 0 ||
    valorDescuento > 100
  ) {
    toast({
      variant: "destructive",
      title: "Porcentaje inválido",
      description: "El porcentaje debe ser mayor a 0 y menor o igual a 100.",
    });
    return null;
  }

  if (!codigoFormData.fechaInicio || !codigoFormData.fechaFin) {
    toast({
      variant: "destructive",
      title: "Faltan fechas",
      description: "La fecha de inicio y la fecha de fin son obligatorias.",
    });
    return null;
  }

  const fechaInicio = toIsoDateTime(codigoFormData.fechaInicio);
  const fechaFin = toIsoDateTime(codigoFormData.fechaFin);

  if (!fechaInicio || !fechaFin) {
    toast({
      variant: "destructive",
      title: "Fechas inválidas",
      description: "El formato de fecha y hora no es válido.",
    });
    return null;
  }

  if (new Date(fechaInicio).getTime() >= new Date(fechaFin).getTime()) {
    toast({
      variant: "destructive",
      title: "Fechas inválidas",
      description: "La fecha de fin debe ser posterior a la fecha de inicio.",
    });
    return null;
  }

  const selectedIds = getIdsForCodigoPromocion(codigoFormData);

  if (selectedIds.length === 0) {
    toast({
      variant: "destructive",
      title: "Falta seleccionar alcance",
      description:
        "Selecciona un producto, categoría o línea para el código promocional.",
    });
    return null;
  }

  if (codigoFormData.aplicaA !== "productos" && selectedIds.length > 1) {
    toast({
      variant: "destructive",
      title: "Solo puedes seleccionar una opción",
      description:
        "El código promocional solo puede aplicar a una categoría o una línea.",
    });
    return null;
  }

const montoMinimoCompra = Number(codigoFormData.montoMinimoCompra || "1");

if (!Number.isFinite(montoMinimoCompra) || montoMinimoCompra <= 0) {
  toast({
    variant: "destructive",
    title: "Monto mínimo inválido",
    description: "El monto mínimo de compra debe ser mayor a 0.",
  });
  return null;
}

  const usaLimiteStock =
    codigoFormData.aplicaA === "productos" &&
    !codigoFormData.hastaAgotarExistencias;

  let stockLimiteCodigo: number | null = null;

  if (usaLimiteStock) {
    const rawStockLimite = codigoFormData.stockLimiteCodigo.trim();

    if (!rawStockLimite) {
      toast({
        variant: "destructive",
        title: "Falta stock límite",
        description:
          "Ingresa cuántas piezas podrán usar este código promocional.",
      });
      return null;
    }

    const stockLimiteNumber = Number(rawStockLimite);

    if (
      !Number.isFinite(stockLimiteNumber) ||
      !Number.isInteger(stockLimiteNumber) ||
      stockLimiteNumber <= 0
    ) {
      toast({
        variant: "destructive",
        title: "Stock inválido",
        description: "El stock límite debe ser un número entero mayor a 0.",
      });
      return null;
    }

    stockLimiteCodigo = stockLimiteNumber;
  }

  return {
    codigo,
    titulo: codigoFormData.titulo.trim(),
    descripcion: codigoFormData.descripcion.trim(),
    estado: codigoFormData.estado,
    tipoDescuento: "porcentaje",
    valorDescuento,

    aplicaA: codigoFormData.aplicaA,

    productoIds:
      codigoFormData.aplicaA === "productos"
        ? codigoFormData.productoIds
        : [],
    categoriaIds:
      codigoFormData.aplicaA === "categorias"
        ? codigoFormData.categoriaIds.slice(0, 1)
        : [],
    lineaIds:
      codigoFormData.aplicaA === "lineas"
        ? codigoFormData.lineaIds.slice(0, 1)
        : [],

    tallaIds: codigoFormData.tallaIds,

    fechaInicio,
    fechaFin,

    hastaAgotarExistencias:
      codigoFormData.aplicaA === "productos"
        ? codigoFormData.hastaAgotarExistencias
        : true,
    stockLimiteCodigo:
      codigoFormData.aplicaA === "productos" ? stockLimiteCodigo : null,

   usoMaximoTotal: null,
usoMaximoPorUsuario: 1,
montoMinimoCompra,
acumulableConOfertas: codigoFormData.acumulableConOfertas,
  };
};

const handleSaveCodigoPromocion = async () => {
  const payload = buildCodigoPromocionPayload();

  if (!payload) return;

  setIsSavingCodigo(true);

  try {
    if (editingCodigoPromocionId) {
      const existing = codigosPromocion.find(
        (item) => item.id === editingCodigoPromocionId,
      );

      await updateCodigoPromocion(editingCodigoPromocionId, {
        ...payload,
        usoMaximoTotal: existing?.usoMaximoTotal ?? null,
        usoMaximoPorUsuario: existing?.usoMaximoPorUsuario ?? 1,
      });

      toast({
        title: "Código promocional actualizado",
        description: `El código ${payload.codigo} se actualizó correctamente.`,
      });
    } else {
      await createCodigoPromocion(payload);

      toast({
        title: "Código promocional creado",
        description: `El código ${payload.codigo} se creó correctamente.`,
      });
    }

    resetCodigoPromocionDialogState();
    void loadCodigosPromocion();
  } catch (error) {
    toast({
      variant: "destructive",
      title: editingCodigoPromocionId
        ? "Error al actualizar código promocional"
        : "Error al crear código promocional",
      description: getApiErrorMessage(error),
    });
  } finally {
    setIsSavingCodigo(false);
  }
};

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);

    try {
      if (deleteTarget.type === "oferta") {
        await deleteOferta(deleteTarget.item.id);

        toast({
          title: "Oferta eliminada",
          description: `La oferta "${deleteTarget.item.titulo}" se eliminó permanentemente.`,
        });

        setSelectedOfertaId((current) =>
          current === deleteTarget.item.id ? "" : current,
        );
        void loadOfertas();
      } else {
        await deleteCodigoPromocion(deleteTarget.item.id);

        toast({
          title: "Código promocional eliminado",
          description: `El código ${deleteTarget.item.codigo} se eliminó permanentemente.`,
        });

        void loadCodigosPromocion();
      }

      setDeleteTarget(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title:
          deleteTarget.type === "oferta"
            ? "Error al eliminar oferta"
            : "Error al eliminar código promocional",
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsDeleting(false);
    }
  };



 const targetOptionsByAplicaA: Record<AplicaA, ActiveTargetOptionConfig> = {
  productos: {
    title: "Productos de la oferta",
    description:
      "Selecciona uno o más productos a los que aplicará el descuento.",
    options: productOptions,
    selectedIds: formData.productoIds,
    query: productoQuery,
    setQuery: setProductoQuery,
    field: "productoIds",
    emptyMessage: "No hay productos disponibles.",
  },
  categorias: {
    title: "Categoría de la oferta",
    description: "Selecciona una sola categoría a la que aplicará el descuento.",
    options: categoryOptions,
    selectedIds: formData.categoriaIds,
    query: categoriaQuery,
    setQuery: setCategoriaQuery,
    field: "categoriaIds",
    emptyMessage: "No hay categorías disponibles.",
  },
  lineas: {
    title: "Línea de la oferta",
    description: "Selecciona una sola línea a la que aplicará el descuento.",
    options: lineOptions,
    selectedIds: formData.lineaIds,
    query: lineaQuery,
    setQuery: setLineaQuery,
    field: "lineaIds",
    emptyMessage: "No hay líneas disponibles.",
  },
};

const activeTargetOptions =
  targetOptionsByAplicaA[formData.aplicaA] ?? targetOptionsByAplicaA.productos;

  const codigoTargetOptionsByAplicaA: Record<
  AplicaA,
  ActiveTargetOptionConfig
> = {
  productos: {
    title: "Productos del código promocional",
    description: "Selecciona uno o más productos a los que aplicará el código.",
    options: productOptions,
    selectedIds: codigoFormData.productoIds,
    query: codigoProductoQuery,
    setQuery: setCodigoProductoQuery,
    field: "productoIds",
    emptyMessage: "No hay productos disponibles.",
  },
  categorias: {
    title: "Categoría del código promocional",
    description: "Selecciona una sola categoría a la que aplicará el código.",
    options: categoryOptions,
    selectedIds: codigoFormData.categoriaIds,
    query: codigoCategoriaQuery,
    setQuery: setCodigoCategoriaQuery,
    field: "categoriaIds",
    emptyMessage: "No hay categorías disponibles.",
  },
  lineas: {
    title: "Línea del código promocional",
    description: "Selecciona una sola línea a la que aplicará el código.",
    options: lineOptions,
    selectedIds: codigoFormData.lineaIds,
    query: codigoLineaQuery,
    setQuery: setCodigoLineaQuery,
    field: "lineaIds",
    emptyMessage: "No hay líneas disponibles.",
  },
};

const activeCodigoTargetOptions =
  codigoTargetOptionsByAplicaA[codigoFormData.aplicaA] ??
  codigoTargetOptionsByAplicaA.productos;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold">Ofertas</h1>
          <p className="text-sm text-muted-foreground">
            Administra descuentos, promociones activas y reglas aplicadas al
            catálogo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
  variant="outline"
  size="icon"
  onClick={() => {
    void loadOfertas();
    void loadCodigosPromocion();
  }}
  disabled={isLoading || isLoadingCodigos}
>
  <RefreshCw className="h-4 w-4" />
</Button>

          <Button variant="outline" onClick={() => openCodigoPromocionForm()}>
  <Plus className="mr-2 h-4 w-4" />
  Código promocional
</Button>

<Button onClick={() => openForm()}>
  <Plus className="mr-2 h-4 w-4" />
  Crear oferta
</Button>
        </div>
      </div>

      <div className="rounded-md border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <EntityPicker
            label="Búsqueda inteligente de oferta"
            searchLabel="Buscar por título, descripción o tipo"
            selectLabel="Selecciona oferta para editar"
            query={ofertaSearchQuery}
            value={selectedOfertaId}
            options={ofertaOptions}
            onQueryChange={setOfertaSearchQuery}
            onValueChange={setSelectedOfertaId}
            allowEmpty
            emptyLabel="Sin selección"
            disabled={isLoading}
          />

          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              onClick={handleEditSelectedOferta}
              disabled={!selectedOfertaId || isLoading}
            >
              Editar seleccionado
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                setOfertaSearchQuery("");
                setSelectedOfertaId("");
              }}
              disabled={isLoading}
            >
              Limpiar filtro
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Oferta</TableHead>
                <TableHead>Descuento</TableHead>
                <TableHead>Aplica a</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Cargando ofertas...
                  </TableCell>
                </TableRow>
              ) : filteredOfertas.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No hay ofertas disponibles para el filtro actual.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedOfertas.map((oferta) => {
                  const status = getOfertaStatus(oferta);
                  const canDelete = canDeleteEntity(status.label);
                  const alcanceTotal =
                    oferta.aplicaA === "productos"
                      ? oferta.productoIds.length
                      : oferta.aplicaA === "categorias"
                        ? oferta.categoriaIds.length
                        : oferta.lineaIds.length;

                  return (
                    <TableRow key={oferta.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{oferta.titulo}</span>
                          <span className="text-xs text-muted-foreground truncate max-w-[260px]">
                            {oferta.descripcion || "Sin descripción"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-primary">
                            {getDiscountLabel(oferta)}
                          </span>
                          <span className="text-xs text-muted-foreground">
  Porcentaje
</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col">
                          <span>{getAplicaALabel(oferta.aplicaA)}</span>
                          <span className="text-xs text-muted-foreground">
                            {alcanceTotal} seleccionado(s)
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span>{formatDateTime(oferta.fechaInicio)}</span>
                          <span className="text-xs text-muted-foreground">
                            al {formatDateTime(oferta.fechaFin)}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </TableCell>

                     <TableCell className="text-right">
  <div className="flex items-center justify-end gap-2">
    <Button
      variant="outline"
      size="sm"
      className="h-8 px-2"
      onClick={() => openForm(oferta)}
    >
      <Edit className="h-4 w-4 mr-1" />
      Editar
    </Button>
    <Button
      variant="outline"
      size="sm"
      className="h-8 px-2 text-destructive hover:text-destructive"
      disabled={!canDelete}
      title={
        canDelete
          ? "Eliminar oferta permanentemente"
          : "Solo puedes eliminar ofertas desactivadas o vencidas"
      }
      onClick={() => setDeleteTarget({ type: "oferta", item: oferta })}
    >
      <Trash2 className="h-4 w-4 mr-1" />
      Eliminar
    </Button>
  </div>
</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {!isLoading && filteredOfertas.length > 0 ? (
          <AdminListPagination
            currentPage={ofertasPage}
            totalItems={filteredOfertas.length}
            itemLabel="ofertas"
            onPageChange={setOfertasPage}
          />
        ) : null}
      </div>

            <div className="rounded-md border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="font-headline text-xl font-bold">
            Códigos promocionales
          </h2>
          <p className="text-sm text-muted-foreground">
            Códigos manuales que el cliente puede aplicar en el carrito.
          </p>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descuento</TableHead>
                <TableHead>Aplica a</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoadingCodigos ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Cargando códigos promocionales...
                  </TableCell>
                </TableRow>
              ) : codigosPromocion.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No hay códigos promocionales creados.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCodigos.map((codigoPromo) => {
                  const status = getOfertaStatus(codigoPromo);
                  const canDelete = canDeleteEntity(status.label);

                  const alcanceTotal =
                    codigoPromo.aplicaA === "productos"
                      ? codigoPromo.productoIds.length
                      : codigoPromo.aplicaA === "categorias"
                        ? codigoPromo.categoriaIds.length
                        : codigoPromo.lineaIds.length;

                  return (
                    <TableRow key={codigoPromo.id || codigoPromo.codigo}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="font-semibold">
                            {codigoPromo.codigo}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {codigoPromo.titulo}
                          </span>
                          <span className="text-xs text-muted-foreground truncate max-w-[260px]">
                            {codigoPromo.descripcion || "Sin descripción"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-primary">
                            {codigoPromo.valorDescuento}%
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Porcentaje
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col">
                          <span>{getAplicaALabel(codigoPromo.aplicaA)}</span>
                          <span className="text-xs text-muted-foreground">
                            {alcanceTotal} seleccionado(s)
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span>{formatDateTime(codigoPromo.fechaInicio)}</span>
                          <span className="text-xs text-muted-foreground">
                            al {formatDateTime(codigoPromo.fechaFin)}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => openCodigoPromocionForm(codigoPromo)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-destructive hover:text-destructive"
                            disabled={!canDelete}
                            title={
                              canDelete
                                ? "Eliminar código permanentemente"
                                : "Solo puedes eliminar códigos desactivados o vencidos"
                            }
                            onClick={() =>
                              setDeleteTarget({ type: "codigo", item: codigoPromo })
                            }
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Eliminar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {!isLoadingCodigos && codigosPromocion.length > 0 ? (
          <AdminListPagination
            currentPage={codigosPage}
            totalItems={codigosPromocion.length}
            itemLabel="códigos promocionales"
            onPageChange={setCodigosPage}
          />
        ) : null}
      </div>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.type === "oferta"
                ? "Eliminar oferta"
                : "Eliminar código promocional"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "oferta" ? (
                <>
                  ¿Eliminar permanentemente la oferta{" "}
                  <span className="font-semibold text-foreground">
                    {deleteTarget.item.titulo}
                  </span>
                  ? Esta acción no se puede deshacer.
                </>
              ) : deleteTarget?.type === "codigo" ? (
                <>
                  ¿Eliminar permanentemente el código{" "}
                  <span className="font-semibold text-foreground">
                    {deleteTarget.item.codigo}
                  </span>
                  ? Esta acción no se puede deshacer.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmDelete();
              }}
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingOfertaId ? "Editar oferta" : "Nueva oferta"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {isLoadingMeta && (
              <p className="text-sm text-muted-foreground">
                Cargando productos, categorías, líneas y tallas...
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título de la oferta *</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      titulo: event.target.value,
                    }))
                  }
                  placeholder="15% de descuento en gorra"
                  disabled={isSaving}
                />
              </div>

              <label className="flex items-end gap-2 text-sm pb-2">
                <Checkbox
                  checked={formData.estado}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      estado: checked === true,
                    }))
                  }
                  disabled={isSaving}
                />
                Oferta activa
              </label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Input
                id="descripcion"
                value={formData.descripcion}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    descripcion: event.target.value,
                  }))
                }
                placeholder="Descuento especial para productos seleccionados"
                disabled={isSaving}
              />
            </div>

           <div className="grid gap-4 sm:grid-cols-2">
  <div className="space-y-2">
    <Label htmlFor="valorDescuento">Porcentaje (%) *</Label>
    <Input
      id="valorDescuento"
      type="number"
      min="0"
      max="100"
      step="0.01"
      value={formData.valorDescuento}
      onChange={(event) =>
        setFormData((prev) => ({
          ...prev,
          valorDescuento: event.target.value,
          tipoDescuento: "porcentaje",
        }))
      }
      placeholder="Ej. 15"
      disabled={isSaving}
    />
  </div>

  <div className="space-y-2">
    <Label htmlFor="aplicaA">Aplicar a *</Label>
    <select
      id="aplicaA"
      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      value={formData.aplicaA}
      onChange={(event) => {
  const nextAplicaA = event.target.value as AplicaA;

  setFormData((prev) => ({
    ...prev,
    aplicaA: nextAplicaA,
    productoIds: [],
    categoriaIds: [],
    lineaIds: [],
    hastaAgotarExistencias: true,
    stockLimiteOferta: "",
  }));
}}
      disabled={isSaving}
    >
      <option value="productos">Productos</option>
      <option value="categorias">Categorías</option>
      <option value="lineas">Líneas</option>
    </select>
  </div>
</div>           

            <MultiSelectBlock
  title={activeTargetOptions.title}
  description={
    formData.aplicaA === "productos"
      ? "Selecciona uno o más productos. Los que ya tienen una oferta activa no se pueden seleccionar."
      : activeTargetOptions.description
  }
  searchValue={activeTargetOptions.query}
  onSearchChange={activeTargetOptions.setQuery}
  options={activeTargetOptions.options}
  selectedIds={activeTargetOptions.selectedIds}
  onToggle={(id, checked) =>
    handleToggleArrayValue(activeTargetOptions.field, id, checked)
  }
  disabled={isSaving || isLoadingMeta}
  emptyMessage={activeTargetOptions.emptyMessage}
  singleSelection={formData.aplicaA !== "productos"}
  disabledOptionIds={
    formData.aplicaA === "productos"
      ? productosConOfertaActivaIds
      : undefined
  }
  disabledOptionNote={
    formData.aplicaA === "productos" ? "Ya tiene oferta activa" : undefined
  }
/>

{formData.aplicaA === "productos" && (
  <div className="space-y-3 rounded-md border p-4">
    <label className="flex cursor-pointer items-start gap-2 text-sm">
      <Checkbox
        checked={!formData.hastaAgotarExistencias}
        onCheckedChange={(checked) => {
          const usarLimiteStock = checked === true;

          setFormData((prev) => ({
            ...prev,
            hastaAgotarExistencias: !usarLimiteStock,
            stockLimiteOferta: usarLimiteStock
              ? prev.stockLimiteOferta
              : "",
          }));
        }}
        disabled={isSaving}
      />

      <span className="flex flex-col gap-1 leading-tight">
        <span className="font-medium">Limitar stock promocional</span>
        <span className="text-xs text-muted-foreground">
          Por defecto, la oferta aplicará hasta agotar existencias. Activa esta
          opción solo si quieres limitar el descuento a cierta cantidad de
          piezas.
        </span>
      </span>
    </label>

    {!formData.hastaAgotarExistencias && (
      <div className="space-y-2">
        <Label htmlFor="stockLimiteOferta">
          Stock límite de la oferta *
        </Label>
        <Input
          id="stockLimiteOferta"
          type="number"
          min="1"
          step="1"
          value={formData.stockLimiteOferta}
          onChange={(event) =>
            setFormData((prev) => ({
              ...prev,
              stockLimiteOferta: event.target.value,
            }))
          }
          placeholder="Ej. 10"
          disabled={isSaving}
        />
        <p className="text-xs text-muted-foreground">
          Cuando se llegue a este límite, el producto dejará de tener descuento
          aunque todavía tenga stock normal.
        </p>
      </div>
    )}
  </div>
)}

            <MultiSelectBlock
              title="Tallas específicas"
              description="Opcional. Si no seleccionas tallas, la oferta aplicará sin filtrar por talla."
              searchValue={tallaQuery}
              onSearchChange={setTallaQuery}
              options={tallasDeOferta.options}
              selectedIds={formData.tallaIds}
              onToggle={(id, checked) =>
                handleToggleArrayValue("tallaIds", id, checked)
              }
              disabled={isSaving || isLoadingMeta || tallasDeOferta.locked}
              emptyMessage={tallasDeOferta.emptyMessage}
              noteByOptionId={tallasDeOferta.notes}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fechaInicio">Fecha de inicio *</Label>
                <DateTimePickerField
                  id="fechaInicio"
                  value={formData.fechaInicio}
                  max={formData.fechaFin || undefined}
                  onChange={(fechaInicio) =>
                    setFormData((prev) => ({
                      ...prev,
                      fechaInicio,
                    }))
                  }
                  disabled={isSaving}
                  placeholder="Elige cuándo inicia la oferta"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fechaFin">Fecha de fin *</Label>
                <DateTimePickerField
                  id="fechaFin"
                  value={formData.fechaFin}
                  min={formData.fechaInicio || undefined}
                  onChange={(fechaFin) =>
                    setFormData((prev) => ({
                      ...prev,
                      fechaFin,
                    }))
                  }
                  disabled={isSaving}
                  placeholder="Elige cuándo termina la oferta"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={resetDialogState}
                disabled={isSaving}
              >
                Cancelar
              </Button>

              <Button onClick={() => void handleSave()} disabled={isSaving}>
                {isSaving
                  ? "Guardando..."
                  : editingOfertaId
                    ? "Guardar cambios"
                    : "Crear oferta"}
              </Button>
            </div>
          </div>
        </DialogContent>
            </Dialog>

      <Dialog
        open={isCodigoDialogOpen}
        onOpenChange={setIsCodigoDialogOpen}
      >
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCodigoPromocionId
                ? "Editar código promocional"
                : "Nuevo código promocional"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {isLoadingMeta && (
              <p className="text-sm text-muted-foreground">
                Cargando productos, categorías, líneas y tallas...
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <Label htmlFor="codigoPromocional">Código *</Label>
                <Input
                  id="codigoPromocional"
                  value={codigoFormData.codigo}
                  onChange={(event) =>
                    setCodigoFormData((prev) => ({
                      ...prev,
                      codigo: event.target.value
                        .toUpperCase()
                        .replace(/\s+/g, ""),
                    }))
                  }
                  placeholder="Ej. LEON20"
                  disabled={isSavingCodigo}
                />
              </div>

              <label className="flex items-end gap-2 text-sm pb-2">
                <Checkbox
                  checked={codigoFormData.estado}
                  onCheckedChange={(checked) =>
                    setCodigoFormData((prev) => ({
                      ...prev,
                      estado: checked === true,
                    }))
                  }
                  disabled={isSavingCodigo}
                />
                Código activo
              </label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tituloCodigoPromocional">Título *</Label>
              <Input
                id="tituloCodigoPromocional"
                value={codigoFormData.titulo}
                onChange={(event) =>
                  setCodigoFormData((prev) => ({
                    ...prev,
                    titulo: event.target.value,
                  }))
                }
                placeholder="20% de descuento"
                disabled={isSavingCodigo}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcionCodigoPromocional">Descripción</Label>
              <Input
                id="descripcionCodigoPromocional"
                value={codigoFormData.descripcion}
                onChange={(event) =>
                  setCodigoFormData((prev) => ({
                    ...prev,
                    descripcion: event.target.value,
                  }))
                }
                placeholder="Código especial para productos seleccionados"
                disabled={isSavingCodigo}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="valorCodigoPromocional">Porcentaje (%) *</Label>
                <Input
                  id="valorCodigoPromocional"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={codigoFormData.valorDescuento}
                  onChange={(event) =>
                    setCodigoFormData((prev) => ({
                      ...prev,
                      valorDescuento: event.target.value,
                    }))
                  }
                  placeholder="Ej. 20"
                  disabled={isSavingCodigo}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="aplicaCodigoPromocional">Aplicar a *</Label>
                <select
                  id="aplicaCodigoPromocional"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={codigoFormData.aplicaA}
                  onChange={(event) => {
                    const nextAplicaA = event.target.value as AplicaA;

                    setCodigoFormData((prev) => ({
                      ...prev,
                      aplicaA: nextAplicaA,
                      productoIds: [],
                      categoriaIds: [],
                      lineaIds: [],
                      hastaAgotarExistencias: true,
                      stockLimiteCodigo: "",
                    }));
                  }}
                  disabled={isSavingCodigo}
                >
                  <option value="productos">Productos</option>
                  <option value="categorias">Categorías</option>
                  <option value="lineas">Líneas</option>
                </select>
              </div>
            </div>

            <MultiSelectBlock
              title={activeCodigoTargetOptions.title}
              description={activeCodigoTargetOptions.description}
              searchValue={activeCodigoTargetOptions.query}
              onSearchChange={activeCodigoTargetOptions.setQuery}
              options={activeCodigoTargetOptions.options}
              selectedIds={activeCodigoTargetOptions.selectedIds}
              onToggle={(id, checked) =>
                handleToggleCodigoArrayValue(
                  activeCodigoTargetOptions.field,
                  id,
                  checked,
                )
              }
              disabled={isSavingCodigo || isLoadingMeta}
              emptyMessage={activeCodigoTargetOptions.emptyMessage}
              singleSelection={codigoFormData.aplicaA !== "productos"}
            />

            {codigoFormData.aplicaA === "productos" && (
              <div className="space-y-3 rounded-md border p-4">
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <Checkbox
                    checked={!codigoFormData.hastaAgotarExistencias}
                    onCheckedChange={(checked) => {
                      const usarLimiteStock = checked === true;

                      setCodigoFormData((prev) => ({
                        ...prev,
                        hastaAgotarExistencias: !usarLimiteStock,
                        stockLimiteCodigo: usarLimiteStock
                          ? prev.stockLimiteCodigo
                          : "",
                      }));
                    }}
                    disabled={isSavingCodigo}
                  />

                  <span className="flex flex-col gap-1 leading-tight">
                    <span className="font-medium">
                      Limitar stock del código
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Por defecto, el código aplicará hasta agotar existencias.
                      Activa esta opción solo si quieres limitar cuántas piezas
                      podrán usar este código.
                    </span>
                  </span>
                </label>

                {!codigoFormData.hastaAgotarExistencias && (
                  <div className="space-y-2">
                    <Label htmlFor="stockLimiteCodigo">
                      Stock límite del código *
                    </Label>
                    <Input
                      id="stockLimiteCodigo"
                      type="number"
                      min="1"
                      step="1"
                      value={codigoFormData.stockLimiteCodigo}
                      onChange={(event) =>
                        setCodigoFormData((prev) => ({
                          ...prev,
                          stockLimiteCodigo: event.target.value,
                        }))
                      }
                      placeholder="Ej. 10"
                      disabled={isSavingCodigo}
                    />
                  </div>
                )}
              </div>
            )}

            <MultiSelectBlock
              title="Tallas específicas"
              description="Opcional. Si no seleccionas tallas, el código aplicará sin filtrar por talla."
              searchValue={codigoTallaQuery}
              onSearchChange={setCodigoTallaQuery}
              options={tallaOptions}
              selectedIds={codigoFormData.tallaIds}
              onToggle={(id, checked) =>
                handleToggleCodigoArrayValue("tallaIds", id, checked)
              }
              disabled={isSavingCodigo || isLoadingMeta}
              emptyMessage="No hay tallas disponibles."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fechaInicioCodigo">Fecha de inicio *</Label>
                <DateTimePickerField
                  id="fechaInicioCodigo"
                  value={codigoFormData.fechaInicio}
                  max={codigoFormData.fechaFin || undefined}
                  onChange={(fechaInicio) =>
                    setCodigoFormData((prev) => ({
                      ...prev,
                      fechaInicio,
                    }))
                  }
                  disabled={isSavingCodigo}
                  placeholder="Elige cuándo inicia el código"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fechaFinCodigo">Fecha de fin *</Label>
                <DateTimePickerField
                  id="fechaFinCodigo"
                  value={codigoFormData.fechaFin}
                  min={codigoFormData.fechaInicio || undefined}
                  onChange={(fechaFin) =>
                    setCodigoFormData((prev) => ({
                      ...prev,
                      fechaFin,
                    }))
                  }
                  disabled={isSavingCodigo}
                  placeholder="Elige cuándo termina el código"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
  <div className="space-y-2">
    <Label htmlFor="montoMinimoCompra">Monto mínimo de compra</Label>
    <Input
  id="montoMinimoCompra"
  type="number"
  min="1"
  step="0.01"
  value={codigoFormData.montoMinimoCompra}
  onChange={(event) =>
    setCodigoFormData((prev) => ({
      ...prev,
      montoMinimoCompra: event.target.value,
    }))
  }
  placeholder="Ej. 1"
  disabled={isSavingCodigo}
/>
<p className="text-xs text-muted-foreground">
  El monto mínimo debe ser mayor a 0. Para que aplique casi sin mínimo, usa 1.
</p>
  </div>
</div>

            <label className="flex cursor-pointer items-start gap-2 text-sm rounded-md border p-4">
              <Checkbox
                checked={codigoFormData.acumulableConOfertas}
                onCheckedChange={(checked) =>
                  setCodigoFormData((prev) => ({
                    ...prev,
                    acumulableConOfertas: checked === true,
                  }))
                }
                disabled={isSavingCodigo}
              />

              <span className="flex flex-col gap-1 leading-tight">
                <span className="font-medium">Acumulable con ofertas</span>
                <span className="text-xs text-muted-foreground">
                  Activa esta opción solo si este código podrá combinarse con
                  descuentos automáticos de ofertas.
                </span>
              </span>
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={resetCodigoPromocionDialogState}
                disabled={isSavingCodigo}
              >
                Cancelar
              </Button>

              <Button
                onClick={() => void handleSaveCodigoPromocion()}
                disabled={isSavingCodigo}
              >
                {isSavingCodigo
                  ? "Guardando..."
                  : editingCodigoPromocionId
                    ? "Guardar cambios"
                    : "Crear código"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}