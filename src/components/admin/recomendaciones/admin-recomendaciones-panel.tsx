"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  cleanupRecommendationData,
  fetchAdminRecommendationConfig,
  fetchAdminRecommendationMetrics,
  rebuildRecommendationAggregates,
  updateAdminRecommendationConfig,
  type RecommendationAdminConfig,
  type RecommendationAdminMetricsRow,
  type RecommendationConfigSection,
  type RecommendationConfigWeight,
  type RecommendationStrategy,
} from "@/lib/api/recommendations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STRATEGY_OPTIONS: RecommendationStrategy[] = [
  "recientemente_vistos",
  "para_ti",
  "mas_vendidos",
  "tendencias",
  "popularidad",
  "similares",
  "comprados_juntos",
  "complementos_carrito",
  "comprar_nuevamente",
  "novedades",
  "ofertas_relevantes",
];

const SURFACE_OPTIONS = ["home", "producto", "carrito", "cuenta", "checkout"] as const;

function createSectionId() {
  return `seccion-${Date.now().toString(36)}`;
}

function normalizeSections(secciones: RecommendationConfigSection[]) {
  return [...secciones]
    .sort((left, right) => left.orden - right.orden)
    .map((section, index) => ({ ...section, orden: index + 1 }));
}

export function AdminRecomendacionesPanel() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = useState<RecommendationAdminConfig | null>(null);
  const [metrics, setMetrics] = useState<RecommendationAdminMetricsRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isMaintaining, setIsMaintaining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const homeSections = useMemo(
    () =>
      normalizeSections(
        (config?.secciones ?? []).filter((section) => section.superficie === "home"),
      ),
    [config?.secciones],
  );

  const loadAll = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [configData, metricsData] = await Promise.all([
        fetchAdminRecommendationConfig(token),
        fetchAdminRecommendationMetrics(token),
      ]);
      setConfig(configData);
      setMetrics(metricsData);
      setError(null);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function saveConfig(partial: Partial<RecommendationAdminConfig>, successMessage: string) {
    if (!token || !config) return;
    setIsSaving(true);
    try {
      const updated = await updateAdminRecommendationConfig(token, partial);
      setConfig(updated);
      toast({ title: successMessage });
    } catch (saveError) {
      toast({
        title: "No se pudo guardar",
        description: getApiErrorMessage(saveError),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  function updateHomeSections(nextHomeSections: RecommendationConfigSection[]) {
    if (!config) return;
    const otherSections = config.secciones.filter((section) => section.superficie !== "home");
    setConfig({
      ...config,
      secciones: [...otherSections, ...normalizeSections(nextHomeSections)],
    });
  }

  function moveSection(sectionId: string, direction: "up" | "down") {
    const index = homeSections.findIndex((section) => section.id === sectionId);
    if (index < 0) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= homeSections.length) return;

    const reordered = [...homeSections];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    updateHomeSections(reordered);
  }

  function updateSection(sectionId: string, patch: Partial<RecommendationConfigSection>) {
    updateHomeSections(
      homeSections.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section,
      ),
    );
  }

  function addSection() {
    const next: RecommendationConfigSection = {
      id: createSectionId(),
      titulo: "Nueva sección",
      subtitulo: "",
      estrategia: "mas_vendidos",
      activo: true,
      limite: 12,
      orden: homeSections.length + 1,
      superficie: "home",
      productoIdsFijados: [],
      exclusionProductoIds: [],
      exclusionCategoriaIds: [],
      exclusionLineaIds: [],
    };
    updateHomeSections([...homeSections, next]);
  }

  function removeSection(sectionId: string) {
    updateHomeSections(homeSections.filter((section) => section.id !== sectionId));
  }

  function updateWeight(estrategia: RecommendationStrategy, patch: Partial<RecommendationConfigWeight>) {
    if (!config) return;
    setConfig({
      ...config,
      pesos: config.pesos.map((weight) =>
        weight.estrategia === estrategia ? { ...weight, ...patch } : weight,
      ),
    });
  }

  async function runMaintenance(action: "rebuild" | "cleanup") {
    if (!token) return;
    setIsMaintaining(true);
    try {
      if (action === "rebuild") {
        await rebuildRecommendationAggregates(token);
        toast({ title: "Agregados recalculados" });
      } else {
        const result = await cleanupRecommendationData(token);
        toast({
          title: "Limpieza completada",
          description: `${result.eventsDeleted} eventos y ${result.cacheDeleted} entradas de caché eliminadas.`,
        });
      }
    } catch (maintError) {
      toast({
        title: "Operación fallida",
        description: getApiErrorMessage(maintError),
        variant: "destructive",
      });
    } finally {
      setIsMaintaining(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando configuración...</p>;
  }

  if (!config) {
    return <p className="text-sm text-destructive">{error ?? "No se pudo cargar la configuración."}</p>;
  }

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Tabs defaultValue="metricas">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="metricas">Métricas</TabsTrigger>
          <TabsTrigger value="secciones">Secciones home</TabsTrigger>
          <TabsTrigger value="pesos">Pesos</TabsTrigger>
          <TabsTrigger value="exclusiones">Exclusiones</TabsTrigger>
          <TabsTrigger value="global">Config global</TabsTrigger>
          <TabsTrigger value="mantenimiento">Mantenimiento</TabsTrigger>
        </TabsList>

        <TabsContent value="metricas" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Métricas últimos 30 días</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin datos todavía.</p>
              ) : (
                <div className="space-y-3">
                  {metrics.map((row) => (
                    <div key={row.fecha} className="rounded-lg border p-3 text-sm">
                      <p className="font-medium">{row.fecha}</p>
                      <p>
                        Impresiones: {row.impresiones} · Clics: {row.clics} · Carrito:{" "}
                        {row.agregadosCarrito} · Compras: {row.compras}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="secciones" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Administra carruseles del home: estrategia, copy, estado y orden.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addSection}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Agregar sección
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-2"
                disabled={isSaving}
                onClick={() => void saveConfig({ secciones: config.secciones }, "Secciones guardadas")}
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                Guardar secciones
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {homeSections.map((section, index) => (
              <Card key={section.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="text-base">{section.titulo || section.id}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={`Subir sección ${section.titulo}`}
                        disabled={index === 0}
                        onClick={() => moveSection(section.id, "up")}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={`Bajar sección ${section.titulo}`}
                        disabled={index === homeSections.length - 1}
                        onClick={() => moveSection(section.id, "down")}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={`Eliminar sección ${section.titulo}`}
                        onClick={() => removeSection(section.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>ID: {section.id}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`${section.id}-titulo`}>Título</Label>
                    <Input
                      id={`${section.id}-titulo`}
                      value={section.titulo}
                      onChange={(event) => updateSection(section.id, { titulo: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${section.id}-subtitulo`}>Subtítulo</Label>
                    <Input
                      id={`${section.id}-subtitulo`}
                      value={section.subtitulo ?? ""}
                      onChange={(event) => updateSection(section.id, { subtitulo: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${section.id}-estrategia`}>Estrategia</Label>
                    <Select
                      value={section.estrategia}
                      onValueChange={(value) =>
                        updateSection(section.id, { estrategia: value as RecommendationStrategy })
                      }
                    >
                      <SelectTrigger id={`${section.id}-estrategia`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STRATEGY_OPTIONS.map((estrategia) => (
                          <SelectItem key={estrategia} value={estrategia}>
                            {estrategia}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${section.id}-superficie`}>Página</Label>
                    <Select
                      value={section.superficie}
                      onValueChange={(value) =>
                        updateSection(section.id, {
                          superficie: value as RecommendationConfigSection["superficie"],
                        })
                      }
                    >
                      <SelectTrigger id={`${section.id}-superficie`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SURFACE_OPTIONS.map((superficie) => (
                          <SelectItem key={superficie} value={superficie}>
                            {superficie}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${section.id}-limite`}>Límite de productos</Label>
                    <Input
                      id={`${section.id}-limite`}
                      type="number"
                      min={1}
                      max={24}
                      value={section.limite}
                      onChange={(event) =>
                        updateSection(section.id, { limite: Number(event.target.value) || 12 })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <Label htmlFor={`${section.id}-activo`}>Sección activa</Label>
                    <Switch
                      id={`${section.id}-activo`}
                      checked={section.activo}
                      onCheckedChange={(checked) => updateSection(section.id, { activo: checked })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor={`${section.id}-fijados`}>Productos fijados (IDs separados por coma)</Label>
                    <Input
                      id={`${section.id}-fijados`}
                      value={(section.productoIdsFijados ?? []).join(", ")}
                      onChange={(event) =>
                        updateSection(section.id, {
                          productoIdsFijados: event.target.value
                            .split(",")
                            .map((item) => item.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor={`${section.id}-excl-productos`}>Excluir productos (IDs)</Label>
                    <Input
                      id={`${section.id}-excl-productos`}
                      value={(section.exclusionProductoIds ?? []).join(", ")}
                      onChange={(event) =>
                        updateSection(section.id, {
                          exclusionProductoIds: event.target.value
                            .split(",")
                            .map((item) => item.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${section.id}-excl-categorias`}>Excluir categorías (IDs)</Label>
                    <Input
                      id={`${section.id}-excl-categorias`}
                      value={(section.exclusionCategoriaIds ?? []).join(", ")}
                      onChange={(event) =>
                        updateSection(section.id, {
                          exclusionCategoriaIds: event.target.value
                            .split(",")
                            .map((item) => item.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${section.id}-excl-lineas`}>Excluir líneas (IDs)</Label>
                    <Input
                      id={`${section.id}-excl-lineas`}
                      value={(section.exclusionLineaIds ?? []).join(", ")}
                      onChange={(event) =>
                        updateSection(section.id, {
                          exclusionLineaIds: event.target.value
                            .split(",")
                            .map((item) => item.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pesos" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button
              type="button"
              className="gap-2"
              disabled={isSaving}
              onClick={() => void saveConfig({ pesos: config.pesos }, "Pesos guardados")}
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              Guardar pesos
            </Button>
          </div>
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estrategia</TableHead>
                    <TableHead>Peso</TableHead>
                    <TableHead>Activa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {config.pesos.map((weight) => (
                    <TableRow key={weight.estrategia}>
                      <TableCell className="font-medium">{weight.estrategia}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.05"
                          min={0}
                          max={5}
                          value={weight.peso}
                          aria-label={`Peso de ${weight.estrategia}`}
                          onChange={(event) =>
                            updateWeight(weight.estrategia, {
                              peso: Number(event.target.value) || 0,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={weight.activo}
                          aria-label={`Activar estrategia ${weight.estrategia}`}
                          onCheckedChange={(checked) =>
                            updateWeight(weight.estrategia, { activo: checked })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exclusiones" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Exclusiones globales</CardTitle>
              <CardDescription>
                Productos que nunca deben aparecer en recomendaciones.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="exclusion-global">IDs de producto (separados por coma)</Label>
              <Input
                id="exclusion-global"
                value={config.exclusionGlobalProductoIds.join(", ")}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    exclusionGlobalProductoIds: event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
              />
              <Button
                type="button"
                className="gap-2"
                disabled={isSaving}
                onClick={() =>
                  void saveConfig(
                    { exclusionGlobalProductoIds: config.exclusionGlobalProductoIds },
                    "Exclusiones guardadas",
                  )
                }
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                Guardar exclusiones
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="global" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Parámetros globales</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="retencion">Retención eventos (días)</Label>
                <Input
                  id="retencion"
                  type="number"
                  min={7}
                  max={365}
                  value={config.retencionEventosDias}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      retencionEventosDias: Number(event.target.value) || 90,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cache-ttl">TTL caché (segundos)</Label>
                <Input
                  id="cache-ttl"
                  type="number"
                  min={30}
                  max={86400}
                  value={config.cacheTtlSegundos}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      cacheTtlSegundos: Number(event.target.value) || 300,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-categoria">Máx. por categoría</Label>
                <Input
                  id="max-categoria"
                  type="number"
                  min={1}
                  max={10}
                  value={config.diversificacionMaxPorCategoria}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      diversificacionMaxPorCategoria: Number(event.target.value) || 3,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-linea">Máx. por línea</Label>
                <Input
                  id="max-linea"
                  type="number"
                  min={1}
                  max={10}
                  value={config.diversificacionMaxPorLinea}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      diversificacionMaxPorLinea: Number(event.target.value) || 4,
                    })
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ab-variant">Variante A/B</Label>
                <Input
                  id="ab-variant"
                  value={config.abVariant ?? "control"}
                  onChange={(event) =>
                    setConfig({ ...config, abVariant: event.target.value.trim() || "control" })
                  }
                />
              </div>
              <Button
                type="button"
                className="gap-2 md:col-span-2"
                disabled={isSaving}
                onClick={() =>
                  void saveConfig(
                    {
                      retencionEventosDias: config.retencionEventosDias,
                      cacheTtlSegundos: config.cacheTtlSegundos,
                      diversificacionMaxPorCategoria: config.diversificacionMaxPorCategoria,
                      diversificacionMaxPorLinea: config.diversificacionMaxPorLinea,
                      abVariant: config.abVariant,
                    },
                    "Configuración global guardada",
                  )
                }
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                Guardar configuración global
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mantenimiento" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Mantenimiento</CardTitle>
              <CardDescription>Recalcular agregados o limpiar eventos/caché expirados.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button
                type="button"
                className="gap-2"
                disabled={isMaintaining}
                onClick={() => void runMaintenance("rebuild")}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Recalcular agregados
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isMaintaining}
                onClick={() => void runMaintenance("cleanup")}
              >
                Ejecutar limpieza
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
