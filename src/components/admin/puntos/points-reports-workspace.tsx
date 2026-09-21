"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Coins,
  Gift,
  Trophy,
  Users,
} from "lucide-react";
import {
  AdminInlineAlert,
  AdminMetricCard,
  AdminPageHeader,
  AdminPageShell,
  AdminPanelCard,
} from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  getMexicoPointsReportDefaults,
  getPointsRedemptionsReport,
  getPointsTopBalancesReport,
  getPointsTopEarnersReport,
  type PointsBalanceRow,
  type PointsEarnerRow,
  type PointsRedemptionRow,
  type PointsTopEarnersReport,
} from "@/lib/api/loyalty";

const PAGE_SIZE = 20;
const RANK_SIZE = 20;

function formatPoints(value: number): string {
  return new Intl.NumberFormat("es-MX").format(value);
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-MX", {
    timeZone: "America/Mexico_City",
    dateStyle: "short",
    timeStyle: "short",
  });
}

function memberLabel(row: { nombre: string | null; email: string | null; usuarioId: string }) {
  return {
    primary: row.nombre || row.email || "Cliente sin nombre",
    secondary: row.email && row.nombre ? row.email : row.usuarioId,
  };
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return <Badge variant="default">1.º</Badge>;
  }
  if (rank === 2) {
    return <Badge variant="secondary">2.º</Badge>;
  }
  if (rank === 3) {
    return <Badge variant="secondary">3.º</Badge>;
  }

  return <span className="admin-tabular text-sm text-text-muted">{rank}</span>;
}

function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="flex flex-col gap-2" role="status" aria-label="Cargando informe">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-3">
          {Array.from({ length: cols }).map((__, colIndex) => (
            <Skeleton key={colIndex} className="h-10 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

function EmptyReport({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm text-text-secondary">{description}</p>
    </div>
  );
}

export function PointsReportsWorkspace() {
  const defaults = useMemo(() => getMexicoPointsReportDefaults(), []);
  const [tab, setTab] = useState("canjes");
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [day, setDay] = useState(defaults.today);

  const [redemptions, setRedemptions] = useState<PointsRedemptionRow[]>([]);
  const [redemptionPoints, setRedemptionPoints] = useState(0);
  const [redemptionPage, setRedemptionPage] = useState(0);
  const [redemptionCursors, setRedemptionCursors] = useState<Array<string | undefined>>([
    undefined,
  ]);
  const [redemptionNext, setRedemptionNext] = useState<string | null>(null);
  const [redemptionsLoading, setRedemptionsLoading] = useState(true);
  const [redemptionsError, setRedemptionsError] = useState<string | null>(null);

  const [balances, setBalances] = useState<PointsBalanceRow[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(true);
  const [balancesError, setBalancesError] = useState<string | null>(null);

  const [earners, setEarners] = useState<PointsEarnerRow[]>([]);
  const [earnersSummary, setEarnersSummary] = useState<PointsTopEarnersReport["summary"] | null>(
    null,
  );
  const [earnersLoading, setEarnersLoading] = useState(true);
  const [earnersError, setEarnersError] = useState<string | null>(null);

  const loadRedemptions = useCallback(async (cursor?: string) => {
    setRedemptionsLoading(true);
    setRedemptionsError(null);
    try {
      const result = await getPointsRedemptionsReport({
        from,
        to,
        limit: PAGE_SIZE,
        cursor,
      });
      setRedemptions(result.items);
      setRedemptionPoints(result.summary.pagePoints);
      setRedemptionNext(result.nextCursor);
    } catch (error) {
      setRedemptions([]);
      setRedemptionPoints(0);
      setRedemptionNext(null);
      setRedemptionsError(getApiErrorMessage(error));
    } finally {
      setRedemptionsLoading(false);
    }
  }, [from, to]);

  const loadBalances = useCallback(async () => {
    setBalancesLoading(true);
    setBalancesError(null);
    try {
      const result = await getPointsTopBalancesReport(RANK_SIZE);
      setBalances(result.items);
    } catch (error) {
      setBalances([]);
      setBalancesError(getApiErrorMessage(error));
    } finally {
      setBalancesLoading(false);
    }
  }, []);

  const loadEarners = useCallback(async () => {
    setEarnersLoading(true);
    setEarnersError(null);
    try {
      const result = await getPointsTopEarnersReport({
        day,
        limit: RANK_SIZE,
      });
      setEarners(result.items);
      setEarnersSummary(result.summary);
    } catch (error) {
      setEarners([]);
      setEarnersSummary(null);
      setEarnersError(getApiErrorMessage(error));
    } finally {
      setEarnersLoading(false);
    }
  }, [day]);

  useEffect(() => {
    setRedemptionPage(0);
    setRedemptionCursors([undefined]);
    void loadRedemptions(undefined);
  }, [loadRedemptions]);

  useEffect(() => {
    void loadBalances();
  }, [loadBalances]);

  useEffect(() => {
    void loadEarners();
  }, [loadEarners]);

  const goRedemptionsNext = () => {
    if (!redemptionNext || redemptionsLoading) return;
    const nextPage = redemptionPage + 1;
    setRedemptionCursors((current) => [...current.slice(0, nextPage), redemptionNext]);
    setRedemptionPage(nextPage);
    void loadRedemptions(redemptionNext);
  };

  const goRedemptionsPrevious = () => {
    if (redemptionPage === 0 || redemptionsLoading) return;
    const previousPage = redemptionPage - 1;
    setRedemptionPage(previousPage);
    void loadRedemptions(redemptionCursors[previousPage]);
  };

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Lealtad"
        title="Informes de puntos"
        description="Consulta canjes, el ranking de saldo actual y quién obtuvo más puntos en un día, con datos confirmados por el backend."
      />

      <Tabs value={tab} onValueChange={setTab} className="flex flex-col gap-6">
        <TabsList className="h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="canjes">Canjes</TabsTrigger>
          <TabsTrigger value="saldos">Mayor saldo</TabsTrigger>
          <TabsTrigger value="dia">Puntos del día</TabsTrigger>
        </TabsList>

        <TabsContent value="canjes" className="mt-0 flex flex-col gap-4">
          <AdminPanelCard
            title="Filtro de canjes"
            description="El rango usa el día calendario de México. Los puntos se muestran como cantidad canjeada."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
              <div className="flex flex-col gap-2">
                <Label htmlFor="puntos-canjes-desde">Desde</Label>
                <DatePickerField
                  id="puntos-canjes-desde"
                  value={from}
                  max={to}
                  onChange={setFrom}
                  aria-label="Fecha inicial de canjes"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="puntos-canjes-hasta">Hasta</Label>
                <DatePickerField
                  id="puntos-canjes-hasta"
                  value={to}
                  min={from}
                  max={defaults.today}
                  onChange={setTo}
                  aria-label="Fecha final de canjes"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadRedemptions(redemptionCursors[redemptionPage])}
                disabled={redemptionsLoading}
              >
                Actualizar
              </Button>
            </div>
          </AdminPanelCard>

          <div className="grid gap-4 sm:grid-cols-2">
            <AdminMetricCard
              label="Canjes en esta página"
              value={formatPoints(redemptions.length)}
              icon={Gift}
              loading={redemptionsLoading}
            />
            <AdminMetricCard
              label="Puntos canjeados en esta página"
              value={formatPoints(redemptionPoints)}
              icon={Coins}
              loading={redemptionsLoading}
            />
          </div>

          {redemptionsError ? (
            <AdminInlineAlert>{redemptionsError}</AdminInlineAlert>
          ) : null}

          <AdminPanelCard noPadding contentClassName="p-0">
            {redemptionsLoading ? (
              <div className="p-5">
                <TableSkeleton cols={5} />
              </div>
            ) : redemptions.length === 0 ? (
              <div className="p-5">
                <EmptyReport
                  title="No hay canjes en este periodo"
                  description="Prueba otro rango de fechas o confirma que ya se registraron canjes."
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Puntos</TableHead>
                    <TableHead className="hidden md:table-cell">Origen</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {redemptions.map((row) => {
                    const member = memberLabel(row);
                    return (
                      <TableRow key={`${row.movimientoId}-${row.usuarioId}`}>
                        <TableCell>
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate font-medium">{member.primary}</span>
                            <span className="truncate text-xs text-text-muted">
                              {member.secondary}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[18rem] truncate text-text-secondary">
                          {row.descripcion || "Canje de puntos"}
                        </TableCell>
                        <TableCell className="admin-tabular text-right font-semibold">
                          {formatPoints(row.puntos)}
                        </TableCell>
                        <TableCell className="hidden text-text-secondary md:table-cell">
                          {row.origen || "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-text-secondary">
                          {formatDateTime(row.createdAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            {!redemptionsError && !redemptionsLoading ? (
              <nav
                className="flex items-center justify-between border-t px-4 py-3"
                aria-label="Paginación de canjes"
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goRedemptionsPrevious}
                  disabled={redemptionPage === 0}
                >
                  <ChevronLeft />
                  Anterior
                </Button>
                <span className="text-sm text-text-muted">
                  Página {redemptionPage + 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goRedemptionsNext}
                  disabled={!redemptionNext}
                >
                  Siguiente
                  <ChevronRight />
                </Button>
              </nav>
            ) : null}
          </AdminPanelCard>
        </TabsContent>

        <TabsContent value="saldos" className="mt-0 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminMetricCard
              label="Clientes en el ranking"
              value={formatPoints(balances.length)}
              icon={Users}
              loading={balancesLoading}
              hint="Saldo actual según puntosActuales del backend."
            />
            <AdminMetricCard
              label="Mayor saldo"
              value={
                balances[0] ? formatPoints(balances[0].puntosActuales) : "—"
              }
              icon={Trophy}
              loading={balancesLoading}
              variant="featured"
            />
          </div>

          {balancesError ? <AdminInlineAlert>{balancesError}</AdminInlineAlert> : null}

          <AdminPanelCard
            title="Quién tiene más puntos ahora"
            description="Los primeros 20 clientes con saldo mayor a cero."
            actions={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void loadBalances()}
                disabled={balancesLoading}
              >
                Actualizar
              </Button>
            }
            noPadding
            contentClassName="p-0"
          >
            {balancesLoading ? (
              <div className="p-5">
                <TableSkeleton cols={4} />
              </div>
            ) : balances.length === 0 ? (
              <div className="p-5">
                <EmptyReport
                  title="Nadie tiene puntos todavía"
                  description="Cuando los clientes acumulen saldo, aparecerán en este ranking."
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Puesto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden md:table-cell">Nivel</TableHead>
                    <TableHead className="text-right">Puntos actuales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balances.map((row, index) => {
                    const member = memberLabel(row);
                    return (
                      <TableRow key={row.usuarioId}>
                        <TableCell>
                          <RankBadge rank={index + 1} />
                        </TableCell>
                        <TableCell>
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate font-medium">{member.primary}</span>
                            <span className="truncate text-xs text-text-muted">
                              {member.secondary}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden capitalize text-text-secondary md:table-cell">
                          {row.nivel || "—"}
                        </TableCell>
                        <TableCell className="admin-tabular text-right font-semibold">
                          {formatPoints(row.puntosActuales)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </AdminPanelCard>
        </TabsContent>

        <TabsContent value="dia" className="mt-0 flex flex-col gap-4">
          <AdminPanelCard
            title="Día a consultar"
            description="Suma acumulaciones, bonificaciones, devoluciones y ajustes positivos de ese día en México."
          >
            <div className="grid gap-4 sm:grid-cols-[minmax(0,16rem)_auto] sm:items-end">
              <div className="flex flex-col gap-2">
                <Label htmlFor="puntos-dia">Día</Label>
                <DatePickerField
                  id="puntos-dia"
                  value={day}
                  max={defaults.today}
                  onChange={setDay}
                  aria-label="Día para el ranking de puntos obtenidos"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadEarners()}
                disabled={earnersLoading}
              >
                Actualizar
              </Button>
            </div>
          </AdminPanelCard>

          <div className="grid gap-4 sm:grid-cols-3">
            <AdminMetricCard
              label="Puntos obtenidos"
              value={formatPoints(earnersSummary?.totalPuntos ?? 0)}
              icon={Coins}
              loading={earnersLoading}
              variant="featured"
            />
            <AdminMetricCard
              label="Clientes que ganaron"
              value={formatPoints(earnersSummary?.usuarios ?? 0)}
              icon={Users}
              loading={earnersLoading}
            />
            <AdminMetricCard
              label="Movimientos revisados"
              value={formatPoints(earnersSummary?.movimientosRevisados ?? 0)}
              icon={Gift}
              loading={earnersLoading}
            />
          </div>

          {earnersSummary?.truncated ? (
            <AdminInlineAlert variant="info">
              El día tuvo más movimientos de los que se pueden revisar en una
              sola consulta. El ranking prioriza la actividad más reciente para
              no dejar fuera acumulaciones de la tarde.
            </AdminInlineAlert>
          ) : null}

          {earnersError ? <AdminInlineAlert>{earnersError}</AdminInlineAlert> : null}

          <AdminPanelCard
            title="Quién obtuvo más puntos"
            description={`Ranking del ${day}.`}
            noPadding
            contentClassName="p-0"
          >
            {earnersLoading ? (
              <div className="p-5">
                <TableSkeleton cols={4} />
              </div>
            ) : earners.length === 0 ? (
              <div className="p-5">
                <EmptyReport
                  title="Nadie obtuvo puntos ese día"
                  description="Elige otra fecha o revisa si hubo acumulaciones y bonificaciones."
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Puesto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden text-right md:table-cell">
                      Movimientos
                    </TableHead>
                    <TableHead className="text-right">Puntos obtenidos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earners.map((row, index) => {
                    const member = memberLabel(row);
                    return (
                      <TableRow key={row.usuarioId}>
                        <TableCell>
                          <RankBadge rank={index + 1} />
                        </TableCell>
                        <TableCell>
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate font-medium">{member.primary}</span>
                            <span className="truncate text-xs text-text-muted">
                              {member.secondary}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="admin-tabular hidden text-right text-text-secondary md:table-cell">
                          {formatPoints(row.movimientos)}
                        </TableCell>
                        <TableCell className="admin-tabular text-right font-semibold">
                          {formatPoints(row.puntosObtenidos)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </AdminPanelCard>
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}
