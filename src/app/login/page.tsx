"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  User,
  HeartHandshake,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  getFirebaseIdTokenWithApplePopup,
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
  CardFooter,
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
  const [showPassword, setShowPassword] = useState(false);

  const redirectTo = searchParams.get("redirect") || "/";
  const firebaseReady = isFirebaseConfigured();

  // Solo usamos las variables faltantes para depuración, no se muestran al usuario
  if (!firebaseReady) {
    console.warn(
      "Firebase no configurado. Variables faltantes:",
      getMissingFirebaseEnvVars()
    );
  }

  const getTargetRedirect = (currentRole: string | undefined) => {
    switch (currentRole) {
      case "SUPER_ADMIN":
        return "/super-admin/usuarios";
      case "ADMIN":
        return "/admin";
      case "EMPLEADO":
        return redirectTo === "/" ? "/admin" : redirectTo;
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
        description: "Por favor, ingresa tu correo y contraseña para continuar.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const firebaseIdToken = await getFirebaseIdTokenWithEmailPassword(
        targetEmail.trim(),
        targetPassword
      );
      await signInWithFirebase(firebaseIdToken);
      toast({ title: "¡Bienvenido de nuevo!", description: "Has iniciado sesión correctamente." });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al iniciar sesión",
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
      toast({ title: "¡Bienvenido!", description: "Sesión iniciada con Google." });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No pudimos conectar con Google",
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  // Dentro de onEmailPasswordLogin, onGoogleLogin, agrega:
  const onAppleLogin = async () => {
    setIsSubmitting(true);
    try {
      const firebaseIdToken = await getFirebaseIdTokenWithApplePopup();
      await signInWithFirebase(firebaseIdToken);
      toast({ title: "¡Bienvenido!", description: "Sesión iniciada con Apple." });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No pudimos conectar con Apple",
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    toast({
      title: "Recuperar contraseña",
      description: "Pronto habilitaremos esta función. Contacta con soporte si lo necesitas.",
    });
  };

  const handleRegister = () => {
    toast({
      title: "Crear cuenta",
      description: "El registro de usuarios está disponible dentro de nuestra app móvil. Descárgala gratis para unirte al club y disfrutar de todos los beneficios.",
    });
  };

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="container py-5 md:py-8">
      <div className="mb-6 space-y-3">
        <Breadcrumbs
          items={[{ label: "Inicio", href: "/" }, { label: "Mi cuenta" }]}
        />
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full border border-border transition-all hover:scale-105"
          >
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80">
              Bienvenido
            </p>
            <h1 className="mt-1 font-headline text-4xl font-semibold uppercase leading-none tracking-[0.04em] md:text-2xl">
              Accede a tu cuenta
            </h1>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Columna izquierda - Panel de bienvenida */}
        <div className="relative overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-[#0f1a16] to-[#121714] p-6 text-white shadow-xl md:p-8">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
          <HeartHandshake className="h-10 w-10 text-[#d4af37] opacity-80" />
          <h2 className="mt-6 font-headline text-4xl font-semibold uppercase leading-tight tracking-[0.04em] md:text-5xl">
            Tu club, tus beneficios, un solo lugar.
          </h2>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-white/80">
            Inicia sesión para ver el historial de tus pedidos, acumular puntos, disfrutar de promociones exclusivas y gestionar todo desde un panel sencillo y seguro.
          </p>
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-[#d4af37]" />
              <p className="text-sm leading-relaxed text-white/80">
                Tus datos están protegidos. Además, al iniciar sesión accedes a promociones exclusivas y a la comunidad del club.
              </p>
            </div>
          </div>
        </div>

        {/* Columna derecha - Formulario de acceso */}
        <Card className="rounded-[2rem] border-border bg-card shadow-2xl transition-all duration-300 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <LogIn className="h-6 w-6 text-primary" />
              Iniciar Sesión
            </CardTitle>
            <CardDescription className="text-base">
              Elige tu perfil e ingresa con tus credenciales. ¡Nos alegra verte de nuevo!
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!firebaseReady ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center text-amber-800 dark:border-amber-800/30 dark:bg-amber-950/30 dark:text-amber-200">
                <p className="font-medium">✨ Servicio de acceso en mantenimiento</p>
                <p className="mt-2 text-sm">
                  Estamos mejorando la experiencia. Por favor, inténtalo de nuevo más tarde o contacta con nuestro soporte.
                </p>
              </div>
            ) : (
              <Tabs defaultValue="cliente" className="w-full">


                {/* TAB CLIENTE */}
                <TabsContent value="cliente" className="mt-2 space-y-5">
                  <Input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-12 rounded-xl border-muted-foreground/20 bg-background px-4 transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <div className="relative w-full">
                    <Input
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Tu contraseña"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-12 rounded-xl border-muted-foreground/20 bg-background pr-12 transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-sm text-muted-foreground underline-offset-4 transition-all hover:text-primary hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <Button
                    className="h-12 w-full rounded-full bg-primary font-semibold transition-all hover:scale-[1.01] hover:bg-primary/90"
                    onClick={() => void onEmailPasswordLogin(false)}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Ingresando..." : "Iniciar sesión con email"}
                  </Button>
                  <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-muted-foreground/20" />
                    </div>
                    <span className="relative flex justify-center text-xs uppercase text-muted-foreground">
                      <span className="bg-card px-2">o continúa con</span>
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    className="h-12 w-full rounded-full border-muted-foreground/30 transition-all hover:scale-[1.01] hover:bg-muted/50"
                    onClick={() => void onGoogleLogin()}
                    disabled={isSubmitting}
                  >
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Google
                  </Button>
                </TabsContent>

                {/* TAB COLABORADOR */}
                <TabsContent value="trabajador" className="mt-2 space-y-5">
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed text-primary/90">
                    👋 ¡Hola, equipo! Este acceso es para colaboradores, administradores y personal operativo. Usa tus credenciales corporativas.
                  </div>
                  <Input
                    type="email"
                    inputMode="email"
                    placeholder="tu.correo@empresa.com"
                    value={workerEmail}
                    onChange={(event) => setWorkerEmail(event.target.value)}
                    className="h-12 rounded-xl border-muted-foreground/20 bg-background px-4 transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <Input
                    type="password"
                    placeholder="Contraseña corporativa"
                    value={workerPassword}
                    onChange={(event) => setWorkerPassword(event.target.value)}
                    className="h-12 rounded-xl border-muted-foreground/20 bg-background px-4 transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <Button
                    className="h-12 w-full rounded-full bg-primary font-semibold transition-all hover:scale-[1.01] hover:bg-primary/90"
                    onClick={() => void onEmailPasswordLogin(true)}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Autenticando..." : "Ingresar al panel de control"}
                  </Button>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border/50 pt-4">
            <p className="text-sm text-muted-foreground">
              ¿No tienes cuenta?{" "}
              <Link href="/register" className="font-medium text-primary underline-offset-4 transition-all hover:underline">
                Regístrate aquí
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="container flex min-h-[60vh] items-center justify-center py-10 text-center text-muted-foreground">
          Cargando tu experiencia segura...
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}