"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, BriefcaseBusiness, LogIn, ShieldCheck, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  getFirebaseIdTokenWithEmailPassword,
  getFirebaseIdTokenWithGooglePopup,
} from "@/lib/firebase/auth";
import {
  getMissingFirebaseEnvVars,
  isFirebaseConfigured,
} from "@/lib/firebase/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Breadcrumbs } from "@/components/storefront/shared/breadcrumbs";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithFirebase, isAuthenticated, isLoading, role } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workerEmail, setWorkerEmail] = useState("");
  const [workerPassword, setWorkerPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = searchParams.get("redirect") || "/";
  const firebaseReady = isFirebaseConfigured();
  const missingFirebaseVars = getMissingFirebaseEnvVars();

  const getTargetRedirect = (currentRole: string | undefined) => {
    switch (currentRole) {
      case "SUPER_ADMIN":
        return "/super-admin/usuarios";
      case "ADMIN":
        return "/admin";
      case "EMPLEADO_CLUB":
        return "/empleado-club/noticias";
      default:
        return redirectTo;
    }
  };

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(getTargetRedirect(role));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading, role, router]);

  const onEmailPasswordLogin = async (workerMode = false) => {
    const targetEmail = workerMode ? workerEmail : email;
    const targetPassword = workerMode ? workerPassword : password;

    if (!targetEmail.trim() || !targetPassword.trim()) {
      toast({
        variant: "destructive",
        title: "Datos incompletos",
        description: "Ingresa email y contraseña para continuar.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const firebaseIdToken = await getFirebaseIdTokenWithEmailPassword(
        targetEmail.trim(),
        targetPassword,
      );
      await signInWithFirebase(firebaseIdToken);
      toast({ title: "Sesión iniciada" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo iniciar sesión",
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onGoogleLogin = async () => {
    setIsSubmitting(true);

    try {
      const firebaseIdToken = await getFirebaseIdTokenWithGooglePopup();
      await signInWithFirebase(firebaseIdToken);
      toast({ title: "Sesión iniciada" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo iniciar sesión con Google",
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="container py-5 md:py-8">
      <div className="mb-6 space-y-3">
        <Breadcrumbs
          items={[
            { label: "Inicio", href: "/" },
            { label: "Cuenta" },
          ]}
        />
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full border border-border">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/74">
              Acceso
            </p>
            <h1 className="mt-1 font-headline text-4xl font-semibold uppercase leading-none tracking-[0.04em] md:text-6xl">
              Iniciar sesión
            </h1>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-border bg-[#121714] p-6 text-white shadow-[var(--shadow-elevated)] md:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#d4af37]">
            La Guarida
          </p>
          <h2 className="mt-4 font-headline text-5xl font-semibold uppercase leading-none tracking-[0.04em] md:text-7xl">
            Compra, seguimiento y cuenta en una sola capa.
          </h2>
          <p className="mt-5 max-w-lg text-sm leading-6 text-white/72 md:text-base">
            El acceso mantiene la integración actual con Firebase y backend, pero ahora vive en una pantalla alineada al storefront premium.
          </p>
          <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/6 p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-[#d4af37]" />
              <p className="text-sm leading-6 text-white/72">
                La autenticación, el rol y el redireccionamiento siguen funcionando igual. Solo cambia la experiencia visual.
              </p>
            </div>
          </div>
        </div>

        <Card className="rounded-[2rem] border-border bg-card shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              Accede a tu cuenta
            </CardTitle>
            <CardDescription>
              Usa tu cuenta habitual o el acceso interno si eres parte del equipo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!firebaseReady ? (
              <div className="rounded-[1.5rem] border border-border bg-muted/45 p-4 text-sm leading-6 text-muted-foreground">
                <p>Falta configuración de Firebase para iniciar sesión.</p>
                <p className="mt-2">Variables faltantes: {missingFirebaseVars.join(", ")}.</p>
              </div>
            ) : (
              <Tabs defaultValue="cliente">
                <TabsList className="grid w-full grid-cols-2 rounded-full p-1">
                  <TabsTrigger value="cliente" className="rounded-full">
                    <User className="mr-2 h-4 w-4" />
                    Cliente
                  </TabsTrigger>
                  <TabsTrigger value="trabajador" className="rounded-full">
                    <BriefcaseBusiness className="mr-2 h-4 w-4" />
                    Trabajador
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="cliente" className="mt-6 space-y-4">
                  <Input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="correo@dominio.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-12 rounded-[1rem]"
                  />
                  <Input
                    type="password"
                    autoComplete="current-password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 rounded-[1rem]"
                  />
                  <Button
                    className="h-12 w-full rounded-full"
                    onClick={() => void onEmailPasswordLogin(false)}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Entrando..." : "Entrar con email"}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 w-full rounded-full"
                    onClick={() => void onGoogleLogin()}
                    disabled={isSubmitting}
                  >
                    Continuar con Google
                  </Button>
                </TabsContent>

                <TabsContent value="trabajador" className="mt-6 space-y-4">
                  <div className="rounded-[1.5rem] border border-border bg-muted/45 p-4 text-sm leading-6 text-muted-foreground">
                    Acceso interno para roles administrativos y de operación.
                  </div>
                  <Input
                    type="email"
                    inputMode="email"
                    placeholder="usuario.interno@dominio.com"
                    value={workerEmail}
                    onChange={(event) => setWorkerEmail(event.target.value)}
                    className="h-12 rounded-[1rem]"
                  />
                  <Input
                    type="password"
                    placeholder="Contraseña corporativa"
                    value={workerPassword}
                    onChange={(event) => setWorkerPassword(event.target.value)}
                    className="h-12 rounded-[1rem]"
                  />
                  <Button
                    className="h-12 w-full rounded-full"
                    onClick={() => void onEmailPasswordLogin(true)}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Autenticando..." : "Acceder al panel"}
                  </Button>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-10 text-sm text-muted-foreground">
          Cargando login...
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
