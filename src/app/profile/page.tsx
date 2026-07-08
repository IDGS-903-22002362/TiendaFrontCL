"use client";

import { useEffect, useMemo, useState } from "react";
import { User, Mail, Shield, ShoppingBag, Clock, ChevronRight, Star, Pencil, Sparkles } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { getMyPoints, getMyProfile, saveEditableProfile, usuariosApi } from "@/lib/api/users";
import { useToast } from "@/hooks/use-toast";
import { ProfileRecommendations } from "@/components/storefront/recommendations/profile-recommendations";
import { DatePickerField } from "@/components/ui/date-picker-field";

export default function ProfilePage() {
  const { user, role, isAuthenticated, isLoading, refreshSession } = useAuth();
  const { toast } = useToast();
  const [points, setPoints] = useState<number | null>(null);
  const [profileName, setProfileName] = useState<string>("");
  const [profileLevel, setProfileLevel] = useState<string>("");
  const [isLoadingPoints, setIsLoadingPoints] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [activeSection, setActiveSection] = useState<"personal" | "compras" | "recomendaciones">("personal");
  const [profileForm, setProfileForm] = useState({
    nombre: "",
    email: "",
    telefono: "",
    fechaNacimiento: "",
    genero: "",
  });

  const effectivePoints = points ?? 0;

  const displayName = useMemo(() => {
    const sessionName = (user as { nombre?: unknown } | null)?.nombre;
    if (profileName.trim()) {
      return profileName;
    }
    if (typeof sessionName === "string" && sessionName.trim().length > 0) {
      return sessionName;
    }
    return "León";
  }, [profileName, user]);

  const displayLevel = useMemo(() => {
    if (isLoadingPoints) {
      return "...";
    }

    return profileLevel.trim() || "Sin nivel asignado";
  }, [isLoadingPoints, profileLevel]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    let isMounted = true;

    const loadSummary = async () => {
      setIsLoadingPoints(true);
      const uid = (user as { uid?: string } | null)?.uid;

      try {
        const [pointsResult, profileResult] = await Promise.allSettled([
          getMyPoints(),
          uid ? usuariosApi.getById(uid) : Promise.resolve(null),
        ]);

        if (!isMounted) {
          return;
        }

        const backendUser =
          profileResult.status === "fulfilled" ? profileResult.value : null;
        const walletPoints =
          pointsResult.status === "fulfilled"
            ? Number(pointsResult.value.points ?? 0)
            : null;
        const legacyPoints =
          typeof backendUser?.puntosActuales === "number"
            ? backendUser.puntosActuales
            : null;

        if (walletPoints !== null && walletPoints > 0) {
          setPoints(walletPoints);
          if (pointsResult.status === "fulfilled" && pointsResult.value.level) {
            setProfileLevel(pointsResult.value.level);
          }
        } else if (legacyPoints !== null) {
          setPoints(legacyPoints);
        } else if (walletPoints !== null) {
          setPoints(walletPoints);
        } else {
          setPoints(null);
          if (pointsResult.status === "rejected" && !backendUser) {
            toast({
              title: "No se pudieron cargar tus puntos",
              description: "Intenta recargar la página en unos segundos.",
              variant: "destructive",
            });
          }
        }

        if (backendUser) {
          setProfileName(backendUser.nombre ?? "");
          setProfileLevel(backendUser.nivel ?? "");
        }
      } finally {
        if (isMounted) {
          setIsLoadingPoints(false);
        }
      }
    };

    void loadSummary();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user, toast]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    let isMounted = true;

    const loadEditableProfile = async () => {
      const uid = (user as { uid?: string } | null)?.uid;
      try {
        const profileData = await getMyProfile(uid);
        if (!isMounted) {
          return;
        }

        setProfileForm({
          nombre: profileData.nombre ?? "",
          email: profileData.email ?? "",
          telefono: profileData.telefono ?? "",
          fechaNacimiento: (profileData.fechaNacimiento ?? "").slice(0, 10),
          genero: profileData.genero ?? "",
        });

        if (profileData.nombre) {
          setProfileName(profileData.nombre);
        }

        if (profileData.nivel) {
          setProfileLevel(profileData.nivel);
        }
      } catch {
        if (!isMounted) {
          return;
        }

        setProfileForm((prev) => ({
          ...prev,
          nombre: typeof (user as { nombre?: unknown } | null)?.nombre === "string" ? ((user as { nombre?: string } | null)?.nombre ?? "") : "",
          email: typeof (user as { email?: unknown } | null)?.email === "string" ? ((user as { email?: string } | null)?.email ?? "") : "",
        }));
      }
    };

    void loadEditableProfile();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user]);

  const onSaveProfile = async () => {
    const phone = profileForm.telefono.replace(/\D/g, "");
    const date = profileForm.fechaNacimiento.trim();
    const gender = profileForm.genero.trim();

    if (phone.length !== 10) {
      toast({
        variant: "destructive",
        title: "Telefono invalido",
        description: "El telefono debe tener exactamente 10 digitos.",
      });
      return;
    }

    const today = new Date();
    const todayKey = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
      .toISOString()
      .slice(0, 10);

    if (date && date > todayKey) {
      toast({
        variant: "destructive",
        title: "Fecha invalida",
        description: "La fecha de nacimiento no puede ser futura.",
      });
      return;
    }

    const shouldSendExtended = Boolean(date) || Boolean(gender);

    setIsSavingProfile(true);
    try {
      await saveEditableProfile({
        telefono: phone,
        fechaNacimiento: shouldSendExtended ? date || undefined : undefined,
        genero: shouldSendExtended ? gender || undefined : undefined,
      });

      await refreshSession();

      setProfileForm((prev) => ({
        ...prev,
        telefono: phone,
        fechaNacimiento: date,
        genero: gender,
      }));

      setIsEditingProfile(false);
      toast({ title: "Datos actualizados", description: "Tu perfil se guardo correctamente." });
    } catch {
      toast({
        variant: "destructive",
        title: "No se pudo guardar",
        description: "Verifica tus datos e intenta nuevamente.",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-8 text-center text-muted-foreground">
        Cargando perfil...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="container flex min-h-[60vh] flex-col items-center justify-center py-8 text-center">
        <h2 className="mb-4 text-2xl font-bold">No has iniciado sesión</h2>
        <p className="mb-8 text-text-secondary">
          Por favor inicia sesión para ver tu perfil y tus pedidos.
        </p>
        <Button asChild>
          <Link href="/login">Ir al Login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-5 md:py-8">
      <h1 className="mb-6 font-headline text-3xl font-bold md:mb-8 md:text-4xl">Mi Perfil</h1>

      <Card className="mb-4 overflow-hidden border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent shadow-lg md:mb-6">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
                Hola {displayName}
              </p>
              <p className="mt-2 text-sm text-muted-foreground md:text-base">
                Actualmente eres nivel:
                <span className="ml-2 inline-flex rounded-full border border-primary/30 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-primary md:text-sm">
                  {displayLevel}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-white/80 px-4 py-3 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 md:h-12 md:w-12">
                <Star className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/70">Puntos disponibles</p>
                <p className="text-2xl font-black leading-none text-primary md:text-3xl">
                  {isLoadingPoints ? "..." : effectivePoints.toLocaleString("es-MX")}
                </p>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      <div className="mb-4 inline-flex rounded-xl border border-border bg-background p-1 md:mb-6">
        <button
          type="button"
          onClick={() => setActiveSection("personal")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${activeSection === "personal"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
            }`}
        >
          Datos Personales
        </button>
        <button
          type="button"
          onClick={() => setActiveSection("compras")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${activeSection === "compras"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
            }`}
        >
          Mis Compras
        </button>
        <button
          type="button"
          onClick={() => setActiveSection("recomendaciones")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${activeSection === "recomendaciones"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
            }`}
        >
          Recomendaciones
        </button>
      </div>

      {activeSection === "recomendaciones" ? (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Recomendaciones
            </CardTitle>
            <CardDescription>
              Productos basados en lo que has visto y comprado en la tienda.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileRecommendations />
          </CardContent>
        </Card>
      ) : activeSection === "personal" ? (
        <Card className="w-full">
          <CardHeader className="pb-2 pt-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Datos Personales</CardTitle>
              </div>

              {!isEditingProfile ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setIsEditingProfile(true)}
                >
                  <Pencil className="h-4 w-4" />
                  Editar datos
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">

            <div className="flex flex-col space-y-1">
              <span className="flex items-center text-sm text-muted-foreground">
                <Mail className="mr-2 h-4 w-4" /> Email
              </span>
              <span className="font-medium break-all">{user.email}</span>
            </div>

            <div className="flex flex-col space-y-1">
              <span className="flex items-center text-sm text-muted-foreground">
                <Shield className="mr-2 h-4 w-4" /> Rol
              </span>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={role === "ADMIN" ? "destructive" : role === "EMPLEADO" ? "default" : "secondary"}>
                  {role}
                </Badge>
              </div>
            </div>

            {isEditingProfile ? (
              <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Nombre</p>
                  <input
                    value={profileForm.nombre}
                    readOnly
                    disabled
                    className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-sm text-muted-foreground"
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Correo</p>
                  <input
                    value={profileForm.email}
                    readOnly
                    disabled
                    className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-sm text-muted-foreground"
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Telefono</p>
                  <input
                    value={profileForm.telefono}
                    onChange={(event) => {
                      const value = event.target.value.replace(/[^0-9]/g, "").slice(0, 10);
                      setProfileForm((prev) => ({ ...prev, telefono: value }));
                    }}
                    inputMode="numeric"
                    maxLength={10}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Fecha de nacimiento (opcional)</p>
                  <DatePickerField
                    value={profileForm.fechaNacimiento}
                    onChange={(fechaNacimiento) =>
                      setProfileForm((prev) => ({ ...prev, fechaNacimiento }))
                    }
                    max={new Date().toISOString().slice(0, 10)}
                    placeholder="Selecciona una fecha"
                    className="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-none hover:bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Genero (opcional)</p>
                  <select
                    value={profileForm.genero}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, genero: event.target.value }))}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Selecciona</option>
                    <option value="masculino">Masculino</option>
                    <option value="femenino">Femenino</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={() => void onSaveProfile()}
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile ? "Guardando..." : "Guardar"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    disabled={isSavingProfile}
                    onClick={() => setIsEditingProfile(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Mis Compras
              </CardTitle>
              <CardDescription>
                Accede rápidamente a tu historial y da seguimiento a tus pedidos
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 md:gap-4">
              <Link href="/order-history" className="group rounded-[20px] border border-border p-4 transition-colors hover:bg-muted/50 md:rounded-[22px]">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">Historial de Pedidos</p>
                    <p className="text-sm text-text-secondary">Revisa todas tus compras anteriores</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
              </Link>

              <Link href="/order-history" className="group rounded-[20px] border border-border p-4 transition-colors hover:bg-muted/50 md:rounded-[22px]">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">Seguimiento</p>
                    <p className="text-sm text-text-secondary">Revisa el estatus de pedidos recientes</p>
                  </div>
                  <Clock className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            </CardContent>
          </Card>

          {role === "ADMIN" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Accesos del Personal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link href="/admin" className="group flex items-center justify-between rounded-[20px] border border-border p-4 transition-colors hover:bg-muted/50 md:rounded-[22px]">
                  <div className="space-y-1">
                    <p className="font-medium font-headline">Panel de Administración</p>
                    <p className="text-sm text-text-secondary">Gestionar productos, inventario y órdenes de clientes</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}