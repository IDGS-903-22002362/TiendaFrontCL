"use client";

import { useEffect, useState, useCallback } from "react";
import { Copy, RefreshCw, Filter, Search, X } from "lucide-react";
import { ordersApi } from "@/lib/api/orders";
import type { Orden } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const badgeVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDIENTE: "outline",
  CONFIRMADA: "secondary",
  ENVIADA: "default",
  ENTREGADA: "default",
  CANCELADA: "destructive",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Orden[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [estadoFilter, setEstadoFilter] = useState<string>("TODOS");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const loadOrders = useCallback(async (estado?: string) => {
    setIsLoading(true);
    try {
      const query = estado && estado !== "TODOS" ? { estado } : {};
      const list = await ordersApi.list(query);
      
      // Sort newest first
      list.sort((a, b) => {
        const first = new Date(a.createdAt ?? 0).getTime();
        const second = new Date(b.createdAt ?? 0).getTime();
        return second - first;
      });

      setOrders(list);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al cargar órdenes",
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadOrders(estadoFilter);
  }, [loadOrders, estadoFilter]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await ordersApi.updateEstado(orderId, newStatus);
      toast({ title: "Estado actualizado exitosamente" });
      void loadOrders(estadoFilter);
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error al cambiar estado",
        description: getApiErrorMessage(error),
      });
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm("¿Seguro que deseas cancelar esta orden permanentemente?")) return;
    try {
      await ordersApi.cancel(orderId);
      toast({ title: "Orden cancelada exitosamente" });
      void loadOrders(estadoFilter);
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error al cancelar orden",
        description: getApiErrorMessage(error),
      });
    }
  }

  const filteredOrders = orders.filter((order) => {
    if (!searchTerm) return true;
    return order.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
           (order.usuarioId && order.usuarioId.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-MX", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
         <div>
            <h1 className="font-headline text-3xl font-bold">Gestión de Órdenes</h1>
            <p className="text-sm text-muted-foreground">Administra y da seguimiento a los pedidos logísticos.</p>
         </div>
         <Button variant="outline" size="sm" onClick={() => void loadOrders(estadoFilter)}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refrescar
         </Button>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="flex items-center gap-2 text-lg">
             <Filter className="h-4 w-4 text-muted-foreground"/> Filtros y Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 flex flex-col sm:flex-row gap-4">
           <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID de orden o usuario..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button title="Limpiar búsqueda" type="button" onClick={() => setSearchTerm("")} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4"/>
                </button>
              )}
           </div>
           
           <div className="w-full sm:w-[200px]">
              <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por Etapa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todas las etapas</SelectItem>
                  <SelectItem value="PENDIENTE">PENDIENTE</SelectItem>
                  <SelectItem value="CONFIRMADA">CONFIRMADA</SelectItem>
                  <SelectItem value="ENVIADA">ENVIADA</SelectItem>
                  <SelectItem value="ENTREGADA">ENTREGADA</SelectItem>
                  <SelectItem value="CANCELADA">CANCELADA</SelectItem>
                </SelectContent>
              </Select>
           </div>
        </CardContent>
      </Card>

      <div className="rounded-md border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">ID Orden</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado Actual</TableHead>
                <TableHead className="text-right min-w-[200px]">Acciones Operativas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Cargando órdenes de la base de datos...
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No hay órdenes con los filtros actuales.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium text-xs font-mono">
                       <div className="flex items-center gap-1">
                          {order.id}
                          <button
                            title="Copiar ID"
                            type="button" 
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              void navigator.clipboard.writeText(order.id);
                              toast({ description: "ID copiado al portapapeles" });
                            }}
                          >
                             <Copy className="h-3 w-3" />
                          </button>
                       </div>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{formatDate(order.createdAt)}</TableCell>
                    <TableCell className="text-sm">
                      {order.usuarioId ? (
                        <span className="truncate max-w-[120px] block" title={order.usuarioId}>{order.usuarioId}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Anónimo</span>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold">${order.total.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={badgeVariants[order.estado] || "default"}>
                        {order.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-2">
                      <Select 
                        value={order.estado} 
                        onValueChange={(val) => void handleStatusChange(order.id, val)}
                        disabled={order.estado === "CANCELADA" || order.estado === "ENTREGADA"}
                      >
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <SelectValue placeholder="Cambiar a..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDIENTE" disabled>PENDIENTE</SelectItem>
                          <SelectItem value="CONFIRMADA">CONFIRMADA</SelectItem>
                          <SelectItem value="ENVIADA">ENVIADA</SelectItem>
                          <SelectItem value="ENTREGADA">ENTREGADA</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {(order.estado === "PENDIENTE" || order.estado === "CONFIRMADA") && (
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="h-8 text-xs px-2"
                          onClick={() => void handleCancelOrder(order.id)}
                        >
                          Cancelar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
