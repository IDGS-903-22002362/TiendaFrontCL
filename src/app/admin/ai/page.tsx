"use client";

import { useEffect, useState } from "react";
import { Bot, Loader2 } from "lucide-react";
import { getAiAdminMetrics, listAiAdminJobs } from "@/lib/api/ai";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { AiAdminMetrics, TryOnJob } from "@/lib/ai/types";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminAiPage() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<AiAdminMetrics | null>(null);
  const [jobs, setJobs] = useState<TryOnJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (role !== "ADMIN") {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadAdminAi() {
      setIsLoading(true);

      try {
        const [metricsData, jobsData] = await Promise.all([
          getAiAdminMetrics(),
          listAiAdminJobs(),
        ]);

        if (!cancelled) {
          setMetrics(metricsData);
          setJobs(jobsData);
        }
      } catch (caughtError) {
        if (!cancelled) {
          toast({
            variant: "destructive",
            title: "No se pudo cargar el módulo AI admin",
            description: getApiErrorMessage(caughtError),
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadAdminAi();

    return () => {
      cancelled = true;
    };
  }, [role, toast]);

  if (role !== "ADMIN") {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="font-headline text-3xl font-bold">AI Admin</h1>
          <p className="text-sm text-muted-foreground">
            Este módulo está disponible solo para cuentas ADMIN.
          </p>
        </header>
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Tu sesión actual no tiene permisos para consultar métricas ni jobs
            globales del módulo AI.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-bold">AI Admin</h1>
        <p className="text-sm text-muted-foreground">
          Monitoreo operativo de sesiones, mensajes y jobs del módulo AI.
        </p>
      </header>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando métricas AI...
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Sesiones</CardDescription>
                <CardTitle>{metrics?.sessions ?? 0}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Mensajes</CardDescription>
                <CardTitle>{metrics?.messages ?? 0}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Tool calls</CardDescription>
                <CardTitle>{metrics?.toolCalls ?? 0}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Try-on jobs</CardDescription>
                <CardTitle>{metrics?.tryOnJobs ?? 0}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Bot className="h-5 w-5 text-primary" />
                Jobs recientes
              </CardTitle>
              <CardDescription>
                Últimos jobs reportados por el backend AI.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {jobs.length === 0 ? (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  No hay jobs recientes para mostrar.
                </div>
              ) : (
                jobs.map((job) => (
                  <div
                    key={job.id}
                    className="rounded-2xl border bg-background/70 p-4"
                  >
                    <div className="flex flex-col gap-1">
                      <p className="font-medium">
                        {job.id} · {job.status}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Usuario: {job.userId || "N/D"} · Producto:{" "}
                        {job.productId || "N/D"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(job.createdAt)}
                      </p>
                      {job.errorMessage ? (
                        <p className="text-sm text-destructive">
                          {job.errorCode ? `${job.errorCode}: ` : ""}
                          {job.errorMessage}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
