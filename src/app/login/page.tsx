"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, LogIn, BriefcaseBusiness, User } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithFirebase, isAuthenticated, isLoading, role } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // For worker tab
  const [workerEmail, setWorkerEmail] = useState("");
  const [workerPassword, setWorkerPassword] = useState("");

  const redirectTo = searchParams.get("redirect") || "/";
  const firebaseReady = isFirebaseConfigured();
  const missingFirebaseVars = getMissingFirebaseEnvVars();

  const getTargetRedirect = (currentRole: string | undefined) => {
    if (currentRole === "ADMIN" || currentRole === "EMPLEADO") {
      return "/admin";
    }
    return redirectTo;
  };

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(getTargetRedirect(role));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading, redirectTo, router, role]);

  const onEmailPasswordLogin = async (isWorkerLogin: boolean = false) => {
    const targetEmail = isWorkerLogin ? workerEmail : email;
    const targetPassword = isWorkerLogin ? workerPassword : password;

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
      // Wait for signInWithFirebase to complete and update context.
      // Usually, context update redirects via useEffect, but we'll also log here.
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
    return null; // Will redirect via useEffect
  }

  return (
    <div className="container max-w-md py-10">
      <div className="mb-4">
        <Button asChild variant="ghost" className="-ml-3">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>

      <Card className="border-primary/15">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5" />
            Iniciar sesión
          </CardTitle>
          <CardDescription>
            Ingresa a tu cuenta para continuar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!firebaseReady ? (
            <div className="space-y-2 text-sm text-text-secondary">
              <p>Falta configuración Firebase para iniciar sesión.</p>
              <p>Variables faltantes: {missingFirebaseVars.join(", ")}.</p>
              <p>
                Agrega esas variables en <strong>.env.local</strong> y reinicia
                el servidor `npm run dev`.
              </p>
            </div>
          ) : (
            <Tabs defaultValue="cliente" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="cliente" className="flex items-center gap-2">
                  <User className="h-4 w-4"/> Cliente
                </TabsTrigger>
                <TabsTrigger value="trabajador" className="flex items-center gap-2">
                  <BriefcaseBusiness className="h-4 w-4"/> Soy Trabajador
                </TabsTrigger>
              </TabsList>

              <TabsContent value="cliente" className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="correo@dominio.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                  <Input
                    type="password"
                    autoComplete="current-password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>

                <Button
                  className="h-12 w-full"
                  onClick={() => void onEmailPasswordLogin(false)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Iniciando..." : "Entrar con email"}
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      O continuar con
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="h-12 w-full"
                  onClick={() => void onGoogleLogin()}
                  disabled={isSubmitting}
                >
                  Google
                </Button>
              </TabsContent>

              <TabsContent value="trabajador" className="space-y-4">
                <div className="mb-4 rounded-[22px] border border-secondary/20 bg-secondary/10 p-3 text-sm text-text-secondary">
                  <strong>Acceso restringido:</strong> Exclusivo para personal administrativo y de almacén.
                </div>
                <div className="space-y-2">
                  <Input
                    type="email"
                    inputMode="email"
                    placeholder="usuario.interno@dominio.com"
                    value={workerEmail}
                    onChange={(event) => setWorkerEmail(event.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder="Contraseña corporativa"
                    value={workerPassword}
                    onChange={(event) => setWorkerPassword(event.target.value)}
                  />
                </div>

                <Button
                  className="h-12 w-full"
                  onClick={() => void onEmailPasswordLogin(true)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Autenticando..." : "Acceder al Panel"}
                </Button>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-md px-4 py-8 text-sm text-muted-foreground">
          Cargando login...
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
