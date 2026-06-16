"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit, Plus, RefreshCw } from "lucide-react";
import { fetchCategories, fetchProducts } from "@/lib/api/storefront";
import { lineasApi } from "@/lib/api/lineas";
import { tallasApi } from "@/lib/api/tallas";
import type { Category, Linea, Product, Talla } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  EntityPicker,
  type EntityOption,
} from "@/components/admin/entity-picker";
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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  "";

function normalizeSearchValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function buildApiUrl(path: string) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const cleanBase = API_BASE_URL.replace(/\/+$/, "");

  if (!cleanBase) {
    return cleanPath;
  }

  return `${cleanBase}${cleanPath}`;
}

function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") {
    return {};
  }

  const token =
    localStorage.getItem("token") ??
    localStorage.getItem("authToken") ??
    localStorage.getItem("accessToken") ??
    localStorage.getItem("idToken") ??
    localStorage.getItem("adminToken");

  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    ...options,
    credentials: "omit",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...(options?.headers ?? {}),
    },
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "message" in payload
        ? String((payload as { message?: unknown }).message)
        : `Error HTTP ${response.status}`;

    throw new Error(message);
  }

  return payload as T;
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
    productoIds: toStringArray(item.productoIds),
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
    productoIds: toStringArray(item.productoIds),
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
            {filteredOptions.map((option) => (
              <label
                key={option.id}
                className="flex items-start gap-2 text-sm cursor-pointer"
              >
                <Checkbox
                  checked={selectedIds.includes(option.id)}
                  onCheckedChange={(checked) =>
                    onToggle(option.id, checked === true)
                  }
                  disabled={disabled}
                />

                <span className="flex flex-col leading-tight">
                  <span className="font-medium">{option.label}</span>
                  {option.subtitle && (
                    <span className="text-xs text-muted-foreground">
                      {option.subtitle}
                    </span>
                  )}
                </span>
              </label>
            ))}
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
const [codigoFormData, setCodigoFormData] = useState<CodigoPromocionForm>(
  EMPTY_CODIGO_PROMOCION_FORM,
);
const [isSavingCodigo, setIsSavingCodigo] = useState(false);

const [codigoProductoQuery, setCodigoProductoQuery] = useState("");
const [codigoCategoriaQuery, setCodigoCategoriaQuery] = useState("");
const [codigoLineaQuery, setCodigoLineaQuery] = useState("");
const [codigoTallaQuery, setCodigoTallaQuery] = useState("");

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
  setCodigoFormData(EMPTY_CODIGO_PROMOCION_FORM);
  setCodigoProductoQuery("");
  setCodigoCategoriaQuery("");
  setCodigoLineaQuery("");
  setCodigoTallaQuery("");
};

const openCodigoPromocionDialog = () => {
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
        productoIds: oferta.productoIds.slice(0, 1),
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
  const isSingleSelectionField = field !== "tallaIds";

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
  const isSingleSelectionField = field !== "tallaIds";

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
      "Selecciona un producto, categoría o línea para la oferta.",
  });
  return null;
}

if (selectedIds.length > 1) {
  toast({
    variant: "destructive",
    title: "Solo puedes seleccionar una opción",
    description:
      "La oferta solo puede aplicar a un producto, una categoría o una línea.",
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
  formData.aplicaA === "productos" ? formData.productoIds.slice(0, 1) : [],
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

  if (selectedIds.length > 1) {
    toast({
      variant: "destructive",
      title: "Solo puedes seleccionar una opción",
      description:
        "El código promocional solo puede aplicar a un producto, una categoría o una línea.",
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
        ? codigoFormData.productoIds.slice(0, 1)
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

  console.log("payload crear código promocional:", payload);

  setIsSavingCodigo(true);

  try {
    await createCodigoPromocion(payload);

    toast({
      title: "Código promocional creado",
      description: `El código ${payload.codigo} se creó correctamente.`,
    });

   resetCodigoPromocionDialogState();
void loadCodigosPromocion();
  } catch (error) {
    toast({
      variant: "destructive",
      title: "Error al crear código promocional",
      description: getApiErrorMessage(error),
    });
  } finally {
    setIsSavingCodigo(false);
  }
};



 const targetOptionsByAplicaA: Record<AplicaA, ActiveTargetOptionConfig> = {
  productos: {
    title: "Producto de la oferta",
    description: "Selecciona un solo producto al que aplicará el descuento.",
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
    title: "Producto del código promocional",
    description: "Selecciona un solo producto al que aplicará el código.",
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

          <Button variant="outline" onClick={openCodigoPromocionDialog}>
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
                filteredOfertas.map((oferta) => {
                  const status = getOfertaStatus(oferta);
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
  </div>
</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
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
                <TableHead>Reglas</TableHead>
                <TableHead>Estado</TableHead>
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
                codigosPromocion.map((codigoPromo) => {
                  const status = getOfertaStatus(codigoPromo);

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
                        <div className="flex flex-col text-xs text-muted-foreground">
                          <span>
                            Compra mínima:{" "}
                            {formatCurrency(codigoPromo.montoMinimoCompra)}
                          </span>
                          <span>
                            Uso por usuario:{" "}
                            {codigoPromo.usoMaximoPorUsuario}
                          </span>
                          <span>
                            {codigoPromo.acumulableConOfertas
                              ? "Acumulable con ofertas"
                              : "No acumulable con ofertas"}
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
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

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
  description={activeTargetOptions.description}
  searchValue={activeTargetOptions.query}
  onSearchChange={activeTargetOptions.setQuery}
  options={activeTargetOptions.options}
  selectedIds={activeTargetOptions.selectedIds}
  onToggle={(id, checked) =>
    handleToggleArrayValue(activeTargetOptions.field, id, checked)
  }
  disabled={isSaving || isLoadingMeta}
  emptyMessage={activeTargetOptions.emptyMessage}
  singleSelection
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
              options={tallaOptions}
              selectedIds={formData.tallaIds}
              onToggle={(id, checked) =>
                handleToggleArrayValue("tallaIds", id, checked)
              }
              disabled={isSaving || isLoadingMeta}
              emptyMessage="No hay tallas disponibles."
            />

            <div className="grid gap-4 sm:grid-cols-2">
  <div className="space-y-2">
    <Label htmlFor="fechaInicio">Fecha de inicio *</Label>
    <Input
      id="fechaInicio"
      type="datetime-local"
      step="60"
      max={formData.fechaFin || undefined}
      value={formData.fechaInicio}
      onChange={(event) =>
        setFormData((prev) => ({
          ...prev,
          fechaInicio: event.target.value,
        }))
      }
      disabled={isSaving}
    />
  </div>

  <div className="space-y-2">
    <Label htmlFor="fechaFin">Fecha de fin *</Label>
    <Input
      id="fechaFin"
      type="datetime-local"
      step="60"
      min={formData.fechaInicio || undefined}
      value={formData.fechaFin}
      onChange={(event) =>
        setFormData((prev) => ({
          ...prev,
          fechaFin: event.target.value,
        }))
      }
      disabled={isSaving}
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
            <DialogTitle>Nuevo código promocional</DialogTitle>
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
              singleSelection
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
                <Input
                  id="fechaInicioCodigo"
                  type="datetime-local"
                  step="60"
                  max={codigoFormData.fechaFin || undefined}
                  value={codigoFormData.fechaInicio}
                  onChange={(event) =>
                    setCodigoFormData((prev) => ({
                      ...prev,
                      fechaInicio: event.target.value,
                    }))
                  }
                  disabled={isSavingCodigo}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fechaFinCodigo">Fecha de fin *</Label>
                <Input
                  id="fechaFinCodigo"
                  type="datetime-local"
                  step="60"
                  min={codigoFormData.fechaInicio || undefined}
                  value={codigoFormData.fechaFin}
                  onChange={(event) =>
                    setCodigoFormData((prev) => ({
                      ...prev,
                      fechaFin: event.target.value,
                    }))
                  }
                  disabled={isSavingCodigo}
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
                {isSavingCodigo ? "Guardando..." : "Crear código"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}