"use client";

import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";
import { puedeAsignarPuntos } from "@/lib/types";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  earnFromStoreSale,
  getAdminTransactions,
  mxnToAmountCents,
  mxnToPointsPreview,
} from "@/lib/api/loyalty";
import {
  AdminPageHeader,
  AdminPageShell,
} from "@/components/admin/admin-ui";

// ============================================
// TYPES
// ============================================

interface UserData {
    id: string;
    nombre?: string;
    email?: string;
    puntosActuales?: number;
    telefono?: string;
}

interface MovimientoAsignacion {
    id: string;
    usuarioId: string;
    usuarioNombre: string;
    usuarioEmail: string;
    puntos: number;
    descripcion: string;
    origenId: string;
    adminNombre: string;
    adminEmail: string;
    createdAt: string;
}

// ============================================
// CONFIGURACIÓN
// ============================================

// Regla backend: $10 MXN = 1 punto (0.10)

// ============================================
// UTILIDAD: Decodificar JWT (payload sin verificar)
// ============================================

function decodeJwt(token: string): Record<string, unknown> | null {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}

function jwtStringField(payload: Record<string, unknown> | null, key: string): string | null {
    const value = payload?.[key];
    return typeof value === "string" && value.length > 0 ? value : null;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function AdminAssignPoints() {
    const { toast } = useToast();
    const { token, isAuthenticated, isLoading: authLoading, role } = useAuth();

    // Datos del admin/empleado obtenidos del token (más confiable que user)
    const tokenPayload = token ? decodeJwt(token) : null;
    const adminUid = jwtStringField(tokenPayload, "uid") ?? jwtStringField(tokenPayload, "sub");
    const adminName =
        jwtStringField(tokenPayload, "nombre") ??
        jwtStringField(tokenPayload, "email") ??
        "Usuario autenticado";

    // Estados del formulario de asignación
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
    const [scannedUid, setScannedUid] = useState("");
    const [userData, setUserData] = useState<UserData | null>(null);
    const [moneyAmount, setMoneyAmount] = useState<number>(0);
    const [pointsToAssign, setPointsToAssign] = useState<number>(0);
    const [description, setDescription] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingUser, setIsFetchingUser] = useState(false);
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

    // Estado para controlar la visibilidad del UID (input tipo password)
    const [showUid, setShowUid] = useState(false);
    // Estado para habilitar el campo del monto (solo cuando el UID es válido)
    const [isPriceEnabled, setIsPriceEnabled] = useState(false);

    // Historial
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
    const [assignments, setAssignments] = useState<MovimientoAsignacion[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [historyCursor, setHistoryCursor] = useState<string | null>(null);
    const [hasMoreHistory, setHasMoreHistory] = useState(false);
    const [allAssignments, setAllAssignments] = useState<MovimientoAsignacion[]>([]);
    const [isLoadingAllHistory, setIsLoadingAllHistory] = useState(false);
    const [showFullHistoryTable, setShowFullHistoryTable] = useState(true);

    // Referencia para el input QR
    const qrInputRef = useRef<HTMLInputElement>(null);

    // ============================================
    // FUNCIONES DE API
    // ============================================

    // Obtener datos del usuario por UID usando fetch directo con token
    const fetchUserByUid = async (uid: string) => {
        if (!uid || uid.length < 5) return null;
        setIsFetchingUser(true);
        try {
            const response = await fetch(`/api/usuarios/${uid}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const json = await response.json();

            if (!response.ok) {
                throw new Error(json.message || 'Error al obtener el usuario');
            }

            if (json.success && json.data) {
                setUserData(json.data);
                setIsPriceEnabled(true);
                return json.data;
            } else {
                throw new Error("Usuario no encontrado");
            }
        } catch (error) {
            console.error("Error fetching user:", error);
            toast({
                title: "Error",
                description: getApiErrorMessage(error),
                variant: "destructive",
            });
            setUserData(null);
            setIsPriceEnabled(false);
            setMoneyAmount(0);
            setPointsToAssign(0);
            return null;
        } finally {
            setIsFetchingUser(false);
        }
    };

    const refreshAllHistoryData = async () => {
        if (!token) return;
        setAllAssignments([]);
        await loadAllHistoryData();      // Recargar desde el servidor
    };

    // Asignar puntos
    const assignPoints = async () => {
        if (!adminUid) {
            toast({ title: "Error", description: "El usuario administrador no está autenticado", variant: "destructive" });
            return;
        }
        if (!scannedUid) {
            toast({ title: "Error", description: "Escanea o ingresa un UID de usuario", variant: "destructive" });
            return;
        }
        if (!userData) {
            toast({ title: "Error", description: "Usuario no encontrado. Verifica el UID.", variant: "destructive" });
            return;
        }
        if (moneyAmount <= 0) {
            toast({ title: "Error", description: "El monto de la compra debe ser mayor a 0", variant: "destructive" });
            return;
        }
        const saleId = description.trim();
        if (!saleId) {
            toast({ title: "Error", description: "Ingresa el folio o ID de venta", variant: "destructive" });
            return;
        }
        if (!token) {
            toast({ title: "Error", description: "Sesión no válida", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        try {
            const txn = await earnFromStoreSale({
                memberId: scannedUid,
                externalTransactionId: saleId,
                amountCents: mxnToAmountCents(moneyAmount),
                description: `Venta por $${moneyAmount} MXN`,
                token,
            });

            setUserData((prev) =>
                prev ? { ...prev, puntosActuales: txn.balanceAfter } : prev
            );

            toast({
                title: "¡Éxito!",
                description: `Se asignaron ${txn.points} puntos a ${userData.nombre || userData.email}`,
            });
            await refreshAllHistoryData();

            if (isHistoryDialogOpen) {
                loadGlobalHistory(true);
            }

            setMoneyAmount(0);
            setPointsToAssign(0);
            setDescription("");
            setIsAssignDialogOpen(false);
            setIsConfirmDialogOpen(false);
        } catch (error) {
            console.error("Error assigning points:", error);
            toast({
                title: "Error al asignar puntos",
                description: getApiErrorMessage(error),
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const loadGlobalHistory = async (reset = false) => {
        if (!token) {
            console.warn("No hay token disponible para cargar historial");
            return;
        }

        setIsLoadingHistory(true);
        try {
            const result = await getAdminTransactions({
                limit: 20,
                cursor: reset ? undefined : historyCursor ?? undefined,
                token,
            });

            const mapped: MovimientoAsignacion[] = result.items.map((item) => ({
                id: item.transactionId,
                usuarioId: item.memberId,
                usuarioNombre: item.memberId,
                usuarioEmail: "",
                puntos: item.points,
                descripcion: item.description ?? "",
                origenId: item.memberId,
                adminNombre: "",
                adminEmail: "",
                createdAt: item.createdAt,
            }));

            if (reset) {
                setAssignments(mapped);
            } else {
                setAssignments((prev) => [...prev, ...mapped]);
            }
            setHistoryCursor(result.nextCursor);
            setHasMoreHistory(result.hasMore);
        } catch (error) {
            console.error("Error cargando historial:", error);
            toast({
                title: "Error",
                description: getApiErrorMessage(error),
                variant: "destructive",
            });
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const loadMoreHistory = () => {
        if (hasMoreHistory && !isLoadingHistory) {
            loadGlobalHistory(false);
        }
    };

    const loadAllHistoryData = async () => {
        if (!token) return;

        setIsLoadingAllHistory(true);
        try {
            const result = await getAdminTransactions({ limit: 100, token });
            setAllAssignments(
                result.items.map((item) => ({
                    id: item.transactionId,
                    usuarioId: item.memberId,
                    usuarioNombre: item.memberId,
                    usuarioEmail: "",
                    puntos: item.points,
                    descripcion: item.description ?? "",
                    origenId: item.memberId,
                    adminNombre: "",
                    adminEmail: "",
                    createdAt: item.createdAt,
                })),
            );
        } catch (error) {
            console.error("Error cargando historial completo:", error);
            toast({
                title: "Error",
                description: getApiErrorMessage(error),
                variant: "destructive",
            });
        } finally {
            setIsLoadingAllHistory(false);
        }
    };

    // ============================================
    // MANEJO DE QR Y FORMULARIO
    // ============================================

    const handleUidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const uid = e.target.value;
        setScannedUid(uid);
        if (!uid || uid.length < 5) {
            setUserData(null);
            setIsPriceEnabled(false);
            setMoneyAmount(0);
            setPointsToAssign(0);
        } else if (uid.length >= 5) {
            fetchUserByUid(uid);
        }
    };

    const handleMoneyChange = (value: number) => {
        setMoneyAmount(value);
        setPointsToAssign(mxnToPointsPreview(value));
    };

    const resetForm = () => {
        setScannedUid("");
        setUserData(null);
        setMoneyAmount(0);
        setPointsToAssign(0);
        setDescription("");
        setIsPriceEnabled(false);
        if (qrInputRef.current) {
            qrInputRef.current.value = "";
            qrInputRef.current.focus();
        }
    };

    const openAssignDialog = () => {
        resetForm();
        setIsAssignDialogOpen(true);
        setTimeout(() => qrInputRef.current?.focus(), 100);
    };

    // ============================================
    // EFFECTS
    // ============================================
    useEffect(() => {
        setTimeout(() => qrInputRef.current?.focus(), 500);
    }, []);

    useEffect(() => {
        if (isHistoryDialogOpen && assignments.length === 0 && !isLoadingHistory && isAuthenticated) {
            loadGlobalHistory(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isHistoryDialogOpen, isAuthenticated]);

    useEffect(() => {
        if (showFullHistoryTable && allAssignments.length === 0 && !isLoadingAllHistory && isAuthenticated) {
            loadAllHistoryData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showFullHistoryTable, isAuthenticated]);

    // ============================================
    // RENDER (Validación de permisos)
    // ============================================

    if (authLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!isAuthenticated) {
        return <div className="text-center py-12"><p className="text-destructive">No tienes permisos para ver esta página</p></div>;
    }

    // Validar rol usando el campo 'role' del contexto (ya disponible)
    const isAuthorizedRole = puedeAsignarPuntos(role);
    if (!isAuthorizedRole) {
        return <div className="text-center py-12"><p className="text-destructive">No tienes permisos para asignar puntos</p></div>;
    }

    // No necesitamos esperar a 'user' porque obtenemos adminUid y adminName del token

    return (
        <AdminPageShell>
            <AdminPageHeader
                eyebrow="Marketing"
                title="Asignación de puntos"
                description="Escanea el QR del usuario, ingresa el monto total de la compra y asigna puntos automáticamente."
                actions={
                    <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                        <Badge variant="secondary">Asignado por: {adminName}</Badge>
                        <Button onClick={openAssignDialog}>
                            <Plus data-icon="inline-start" />
                            Nueva asignación
                        </Button>
                    </div>
                }
            />

            {/* Diálogo de asignación de puntos */}
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Asignar Puntos</DialogTitle>
                        <DialogDescription>
                            Completa los datos para asignar puntos al usuario
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* UID con tipo password y toggle */}
                        <div className="space-y-2">
                            <Label htmlFor="uid-input">UID del Usuario *</Label>
                            <div className="relative">
                                <Input
                                    id="uid-input"
                                    type={showUid ? "text" : "password"}
                                    placeholder="Escanea el QR o ingresa el UID"
                                    value={scannedUid}
                                    onChange={handleUidChange}
                                    className="font-mono pr-10"
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                                    onClick={() => setShowUid(!showUid)}
                                >
                                    {showUid ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Datos del usuario escaneado */}
                        {userData && (
                            <div className="bg-muted p-3 rounded-lg space-y-1">
                                <p className="text-sm font-medium">{userData.nombre || "Sin nombre"}</p>
                                <p className="text-xs text-muted-foreground">{userData.email}</p>
                                <p className="text-xs">
                                    Puntos actuales: <span className="font-bold">{userData.puntosActuales?.toLocaleString() ?? 0}</span>
                                </p>
                            </div>
                        )}

                        {/* Monto en MXN */}
                        <div className="space-y-2">
                            <Label htmlFor="money-amount">Monto total de la compra (MXN) *</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                <Input
                                    id="money-amount"
                                    type="number"
                                    min="0"
                                    step="10"
                                    value={moneyAmount || ""}
                                    onChange={(e) => handleMoneyChange(Number(e.target.value))}
                                    className="pl-7"
                                    placeholder="0.00"
                                    disabled={!isPriceEnabled}
                                />
                            </div>
                            {moneyAmount > 0 && (
                                <p className="text-xs text-green-600">
                                    Equivalente a <strong>{pointsToAssign}</strong> {pointsToAssign === 1 ? "punto" : "puntos"} (1 punto por cada $10 MXN)
                                </p>
                            )}
                        </div>

                        {/* Descripción opcional */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Folio / ID de venta *</Label>
                            <Textarea
                                id="description"
                                placeholder="Ingresa el ID de la venta hecha en Tienda."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                            />
                        </div>

                        {/* Info del administrador (tomado del token) */}
                        <div className="text-xs text-muted-foreground border-t pt-3">
                            Asignado por: <span className="font-medium">{adminName}</span>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={resetForm} type="button">
                            Limpiar
                        </Button>
                        <Button
                            onClick={() => setIsConfirmDialogOpen(true)} // Cambiado de assignPoints a esto
                            disabled={isLoading || !userData || pointsToAssign <= 0}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Asignando...
                                </>
                            ) : (
                                `Asignar ${pointsToAssign} puntos`
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Modal de Doble Confirmación */}
            <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
                <DialogContent className="sm:max-w-[400px] border-red-900/50 bg-gray-900 text-white">
                    <DialogHeader>
                        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-red-500/10">
                            <AlertTriangle className="size-6 text-red-500" />
                        </div>
                        <DialogTitle className="text-center text-xl">¿Confirmar asignación?</DialogTitle>
                        <DialogDescription className="text-center text-gray-400">
                            Estás a punto de asignar <span className="font-bold text-white">{pointsToAssign} puntos</span> a <span className="font-bold text-white">{userData?.nombre || userData?.email}</span>.
                            Esta acción quedará registrada y no se puede deshacer fácilmente.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
                        <Button
                            variant="ghost"
                            onClick={() => setIsConfirmDialogOpen(false)}
                            className="w-full sm:w-auto hover:bg-white/10"
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            className="w-full sm:w-auto bg-red-600 hover:bg-red-500"
                            onClick={async () => {
                                await assignPoints();
                                setIsConfirmDialogOpen(false); // Cierra el segundo
                                setIsAssignDialogOpen(false);  // Cierra el primero (opcional, mejora UX)
                            }}
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sí, confirmar puntos"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Tabla de historial completo */}
            {showFullHistoryTable && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Historial Completo de Asignaciones</span>
                            {isLoadingAllHistory && <Loader2 className="h-5 w-5 animate-spin" />}
                        </CardTitle>
                        <CardDescription>
                            Registro de todas las asignaciones de puntos realizadas
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoadingAllHistory ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : allAssignments.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">No hay asignaciones registradas aún</div>
                        ) : (
                            <div className="rounded-md border overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Usuario</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead className="text-right">Puntos</TableHead>
                                            <TableHead>Asignado por</TableHead>
                                            <TableHead className="max-w-xs">ID Venta</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {allAssignments.map((item) => {
                                            interface FirebaseTimestamp {
                                                toDate: () => Date;
                                            }


                                            let dateValue: Date | null = null;

                                            if (
                                                item.createdAt &&
                                                typeof item.createdAt === 'object'
                                            ) {
                                                // Caso Timestamp serializado
                                                if ('_seconds' in item.createdAt) {
                                                    dateValue = new Date((item.createdAt as { _seconds: number })._seconds * 1000);
                                                }
                                                // Caso Timestamp normal de Firebase
                                                else if ('toDate' in item.createdAt) {
                                                    dateValue = (item.createdAt as { toDate: () => Date }).toDate();
                                                }
                                            } else if (item.createdAt) {
                                                const tempDate = new Date(item.createdAt);
                                                if (!isNaN(tempDate.getTime())) {
                                                    dateValue = tempDate;
                                                }
                                            }

                                            const formattedDate = dateValue
                                                ? format(
                                                    dateValue,
                                                    "d 'de' MMMM 'de' yyyy 'a las' hh:mm:ss a",
                                                    { locale: es }
                                                )
                                                : "—";

                                            return (
                                                <TableRow key={item.id}>
                                                    <TableCell className="whitespace-nowrap text-sm">
                                                        {formattedDate}
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {item.usuarioNombre}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {item.usuarioEmail}
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-green-600">
                                                        +{item.puntos}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm">
                                                            <Badge variant="secondary" className="text-xs">
                                                                {item.origenId}
                                                            </Badge>
                                                            <div className="text-xs text-muted-foreground mt-1">
                                                                {item.adminNombre}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell
                                                        className="text-sm max-w-xs truncate"
                                                        title={item.descripcion}
                                                    >
                                                        {item.descripcion || "—"}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                        <div className="text-sm text-muted-foreground border-t pt-3 mt-4">
                            Total de asignaciones: <span className="font-semibold">{allAssignments.length}</span>
                        </div>
                    </CardContent>
                </Card>
            )}
        </AdminPageShell>
    );
}
