"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api/client";
import { createLocalSessionFromBackendToken } from "@/lib/api/auth";
import { UserRole } from "@/lib/types";

// Definir tipos para las respuestas de la API
interface RequestVerificationResponse {
  success: boolean;
  message?: string;
  expiresIn?: number;
}

interface VerifyAndLoginResponse {
  success: boolean;
  message?: string;
  remainingAttempts?: number;
  data?: {
    token: string;
    user: {
      uid: string;
      email: string;
      nombre: string;
      rol: string;
      perfilCompleto: boolean;
    };
  };
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithFirebase, isAuthenticated, isLoading, role, user, refreshSession } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Estados para verificación OTP
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [attempts, setAttempts] = useState(3);

  const firebaseReady = isFirebaseConfigured();

  if (!firebaseReady) {
    console.warn(
      "Firebase no configurado. Variables faltantes:",
      getMissingFirebaseEnvVars()
    );
  }

  const getTargetRedirect = (
    currentRole: string | undefined,
    isProfileComplete: boolean | undefined,
  ) => {
    if (isProfileComplete === false) {
      return "/complete-profile";
    }

    switch (currentRole) {
      case "SUPER_ADMIN":
        return "/super-admin/usuarios";
      case "ADMIN":
        return "/admin";
      case "EMPLEADO":
        return "/admin";
      case "EMPLEADO_CLUB":
        return "/empleado-club/noticias";
      default:
        return "/";
    }
  };

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(getTargetRedirect(role, user?.perfilCompleto));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading, role, user?.perfilCompleto, router]);

  // Timer para reenviar código
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Solicitar código de verificación
  const onRequestVerificationCode = async () => {
    if (!email.trim()) {
      toast({
        variant: "destructive",
        title: "Datos incompletos",
        description: "Por favor, ingresa tu correo electrónico.",
      });
      return;
    }

    setIsRequestingCode(true);
    setErrorMessage("");

    try {
      const response = await apiFetch<RequestVerificationResponse>("/api/auth/request-verification-code", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });

      if (response.success) {
        setPendingEmail(email.trim());
        setShowVerification(true);
        setAttempts(3);
        setResendTimer(60);
        toast({
          title: "Código enviado",
          description: `Hemos enviado un código de verificación a ${email.trim()}`,
        });
      } else {
        setErrorMessage(response.message || "Error al enviar el código");
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message || "Error al enviar el código de verificación",
        });
      }
    } catch (error) {
      const errorMsg = getApiErrorMessage(error);
      setErrorMessage(errorMsg);
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMsg,
      });
    } finally {
      setIsRequestingCode(false);
    }
  };

  // Reenviar código
  const onResendCode = async () => {
    if (resendTimer > 0) return;

    setIsRequestingCode(true);
    setErrorMessage("");

    try {
      const response = await apiFetch<RequestVerificationResponse>("/api/auth/request-verification-code", {
        method: "POST",
        body: JSON.stringify({ email: pendingEmail }),
      });

      if (response.success) {
        setResendTimer(60);
        setAttempts(3);
        toast({
          title: "Código reenviado",
          description: "Revisa tu correo electrónico",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message || "Error al reenviar el código",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsRequestingCode(false);
    }
  };

  // Verificar código e iniciar sesión
  const onVerifyAndLogin = async () => {
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      toast({
        variant: "destructive",
        title: "Código inválido",
        description: "Por favor, ingresa el código de 6 dígitos",
      });
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await apiFetch<VerifyAndLoginResponse>("/api/auth/verify-and-login", {
        method: "POST",
        body: JSON.stringify({
          email: pendingEmail,
          verificationCode: verificationCode.trim(),
        }),
      });

      if (response.success && response.data?.token) {
        await createLocalSessionFromBackendToken(
          response.data.token,
          {
            ...response.data.user,
            rol: response.data.user.rol as UserRole, // Cast necesario si el backend devuelve el rol como string
          }
        );
        await refreshSession();
        toast({ title: "¡Bienvenido!", description: "Sesión iniciada correctamente." });
      } else {
        setAttempts(response.remainingAttempts || attempts - 1);
        setErrorMessage(response.message || "Código incorrecto");

        if (response.remainingAttempts === 0) {
          setShowVerification(false);
          setVerificationCode("");
          setPendingEmail("");
          toast({
            variant: "destructive",
            title: "Demasiados intentos",
            description: "Por favor, solicita un nuevo código",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Código incorrecto",
            description: response.message || `Te quedan ${response.remainingAttempts || attempts - 1} intentos`,
          });
        }
      }
    } catch (error) {
      const errorMsg = getApiErrorMessage(error);
      setErrorMessage(errorMsg);
      toast({
        variant: "destructive",
        title: "Error al verificar",
        description: errorMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onEmailPasswordLogin = async () => {
    // Redirigir al flujo OTP
    onRequestVerificationCode();
  };

  const onGoogleLogin = async () => {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const firebaseIdToken = await getFirebaseIdTokenWithGooglePopup();
      await signInWithFirebase(firebaseIdToken);
      toast({ title: "¡Bienvenido!", description: "Sesión iniciada con Google." });
    } catch (error) {
      const errorMsg = getApiErrorMessage(error);
      setErrorMessage(errorMsg);
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onAppleLogin = async () => {
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const firebaseIdToken = await getFirebaseIdTokenWithApplePopup();
      await signInWithFirebase(firebaseIdToken);
      toast({ title: "¡Bienvenido!", description: "Sesión iniciada con Apple." });
    } catch (error) {
      const errorMsg = getApiErrorMessage(error);
      setErrorMessage(errorMsg);
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoBack = () => {
    if (showVerification) {
      setShowVerification(false);
      setVerificationCode("");
      setPendingEmail("");
      setErrorMessage("");
      setAttempts(3);
    } else {
      router.push("/");
    }
  };

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#007A53]">
      {/* Back button */}
      <div className="absolute left-4 top-4 z-10">
        <button
          onClick={handleGoBack}
          className="flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-white backdrop-blur-sm transition-all hover:bg-white/30"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm">Volver</span>
        </button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-8">
        {/* Logo */}
        <img src="/images/leon.png" alt="Club León Logo" className="mb-8 h-30 w-auto object-contain" />

        {/* Title */}
        <h1 className="mb-3 text-center text-5xl font-bold text-white">CLUB LEÓN</h1>

        {/* Description */}
        <p className="mb-8 max-w-sm text-center text-base leading-relaxed text-white/90">
          Consulta contenido exclusivo del Club León, regístrate, guarda tu progreso y desbloquea grandes beneficios.
        </p>

        {/* Error message */}
        {errorMessage && (
          <div className="mb-6 w-full max-w-sm rounded-2xl border border-red-400/30 bg-red-500/15 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        {/* Loading state */}
        {isSubmitting && (
          <div className="mb-6 flex flex-col items-center">
            <svg
              className="mb-4 h-16 w-16 animate-spin text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-20"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-100"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="text-center text-white font-medium">
              {showVerification ? "Verificando código..." : "Iniciando sesión"}
            </p>
          </div>
        )}

        {!isSubmitting && !firebaseReady && (
          <div className="mb-6 w-full max-w-sm rounded-2xl border border-amber-200/30 bg-amber-500/15 p-5 text-center text-amber-100">
            <p className="font-medium">Servicio en mantenimiento</p>
            <p className="mt-2 text-sm">Intenta más tarde o contacta con soporte.</p>
          </div>
        )}

        {!isSubmitting && firebaseReady && (
          <>
            {!showVerification ? (
              // Formulario de login inicial
              <div className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-8 shadow-2xl">
                {/* Email Input */}
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  </div>
                  <Input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="Correo electrónico"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={isRequestingCode}
                    className="h-14 rounded-full border-0 border-b-2 border-gray-300 bg-white/50 pl-12 pr-4 text-gray-900 placeholder-gray-500 transition-all focus:border-[#007A53] focus:bg-white focus:ring-0"
                  />
                </div>

                {/* Login Button - Ahora es "Continuar" */}
                <Button
                  className="h-14 w-full rounded-full bg-[#007A53] text-lg font-bold text-white transition-all hover:bg-[#006248] disabled:opacity-70"
                  onClick={onRequestVerificationCode}
                  disabled={isRequestingCode}
                >
                  {isRequestingCode ? "Enviando..." : "Continuar"}
                </Button>

                {/* Register Link */}
                <div className="text-center">
                  <Link
                    href="/register"
                    className="text-sm font-bold text-[#007A53] underline-offset-4 hover:underline"
                  >
                    ¿No tienes cuenta? Regístrate aquí
                  </Link>
                </div>
              </div>
            ) : (
              // Formulario de verificación de código
              <div className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-8 shadow-2xl">
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Hemos enviado un código de verificación a
                  </p>
                  <p className="mt-1 font-semibold text-[#007A53]">
                    {pendingEmail}
                  </p>
                </div>

                {/* Código Input */}
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="Código de 6 dígitos"
                    value={verificationCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setVerificationCode(value);
                    }}
                    disabled={isSubmitting}
                    className="h-14 rounded-full border-0 border-b-2 border-gray-300 bg-white/50 pl-12 text-center text-2xl tracking-widest text-gray-900 placeholder-gray-500 transition-all focus:border-[#007A53] focus:bg-white focus:ring-0"
                    maxLength={6}
                  />
                </div>

                {/* Intentos restantes */}
                {attempts < 3 && attempts > 0 && (
                  <p className="text-center text-xs text-orange-600">
                    Te quedan {attempts} intento{attempts !== 1 ? 's' : ''}
                  </p>
                )}

                {/* Botones */}
                <Button
                  className="h-14 w-full rounded-full bg-[#007A53] text-lg font-bold text-white transition-all hover:bg-[#006248] disabled:opacity-70"
                  onClick={onVerifyAndLogin}
                  disabled={isSubmitting || verificationCode.length !== 6}
                >
                  {isSubmitting ? "Verificando..." : "Verificar e Iniciar Sesión"}
                </Button>

                <div className="text-center">
                  <button
                    onClick={onResendCode}
                    disabled={resendTimer > 0 || isRequestingCode}
                    className="text-sm font-bold text-[#007A53] underline-offset-4 hover:underline disabled:opacity-50"
                  >
                    {resendTimer > 0
                      ? `Reenviar código en ${resendTimer}s`
                      : "¿No recibiste el código? Reenviar"}
                  </button>
                </div>

                <div className="text-center">
                  <button
                    onClick={() => {
                      setShowVerification(false);
                      setVerificationCode("");
                      setPendingEmail("");
                      setErrorMessage("");
                      setAttempts(3);
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    ← Usar otro correo
                  </button>
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="my-2 flex w-full max-w-sm items-center gap-4">
              <div className="h-px flex-1 bg-white/20" />
              <span className="text-sm text-white/70">O inicia con</span>
              <div className="h-px flex-1 bg-white/20" />
            </div>

            {/* Social Buttons */}
            <div className="w-full max-w-sm space-y-3">
              {/* Google Button */}
              <Button
                className="h-14 w-full rounded-full bg-white text-lg font-semibold text-gray-900 transition-all hover:bg-gray-50 disabled:opacity-70"
                onClick={onGoogleLogin}
                disabled={isSubmitting || isRequestingCode}
              >
                <svg className="mr-3 h-6 w-6" viewBox="0 0 24 24">
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
                Continuar con Google
              </Button>

              {/* Apple Button */}
              <Button
                className="h-14 w-full rounded-full bg-black text-lg font-semibold text-white transition-all hover:bg-gray-900 disabled:opacity-70"
                onClick={onAppleLogin}
                disabled={isSubmitting || isRequestingCode}
              >
                <svg className="mr-3 h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.05 13.5c-.02-1.96 1.6-2.92 1.68-2.96-.92-1.34-2.35-1.52-2.86-1.54-1.2-.13-2.36.71-2.97.71-.6 0-1.54-.69-2.53-.67-1.3.02-2.5.76-3.16 1.92-1.35 2.33-.34 5.76 1 7.65.67.93 1.47 1.96 2.51 1.92 1.01-.04 1.39-.65 2.6-.65 1.2 0 1.55.65 2.6.62 1.08-.02 1.76-.95 2.41-1.88.76-1.1 1.07-2.17 1.08-2.23-.05-.01-2.11-.81-2.13-3.18zm-2.03-6.86c.54-.65.9-1.55.8-2.45-.77.03-1.71.51-2.27 1.15-.5.58-.94 1.5-.82 2.38.86.07 1.74-.44 2.29-1.08z" />
                </svg>
                Continuar con Apple
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#007A53] text-center text-white">
          Cargando...
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}