"use client";

import { ChangeEvent, Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  getFirebaseIdTokenWithApplePopup,
  getFirebaseIdTokenWithEmailPassword,
  getFirebaseIdTokenWithGooglePopup,
  registerWithEmailPassword,
  sendPasswordReset,
} from "@/lib/firebase/auth";
import {
  getMissingFirebaseEnvVars,
  isFirebaseConfigured,
} from "@/lib/firebase/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Antigravity from "@/components/Antigravity";
import { apiFetch } from "@/lib/api/client";
import { createLocalSessionFromBackendToken } from "@/lib/api/auth";
import { UserRole } from "@/lib/types";
import { useIsFromMobileApp } from "@/hooks/use-from-mobile-app";

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

  // Estado para mostrar formulario de correo y contraseña
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);

  // Estado para mostrar pantalla de recuperación de contraseña
  const [showPasswordRecovery, setShowPasswordRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryEmailSent, setRecoveryEmailSent] = useState(false);
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const { isFromMobileApp } = useIsFromMobileApp();

  const firebaseReady = isFirebaseConfigured();


  const esOtpValido = verificationCode.length === 6;

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

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam?.trim()) {
      setEmail(emailParam.trim());
    }

    if (searchParams.get("mode") === "password") {
      setShowPasswordLogin(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setIsSubmitting(false);
      setShowVerification(false);
      if (searchParams.get("mode") !== "password") {
        setShowPasswordLogin(false);
      }
      setShowPasswordRecovery(false);
      setVerificationCode("");
      setPendingEmail("");
      setPassword("");
      setErrorMessage("");
      setAttempts(3);
      setResendTimer(0);
    }
  }, [isAuthenticated, isLoading, searchParams]);

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

  useEffect(() => {
    if (showVerification && !isSubmitting) {
      otpInputRefs.current[0]?.focus();
    }
  }, [showVerification, isSubmitting]);

  const hasAutoSubmitted = useRef(false);

  useEffect(() => {
    if (
      showVerification &&
      verificationCode.length === 6 &&
      !isSubmitting &&
      !hasAutoSubmitted.current
    ) {
      hasAutoSubmitted.current = true;
      void onVerifyAndLogin();
    }
  }, [verificationCode, showVerification, isSubmitting]);

  useEffect(() => {
    if (verificationCode.length < 6) {
      hasAutoSubmitted.current = false;
    }
  }, [verificationCode]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      hasAutoSubmitted.current = false;
    }
  }, [isAuthenticated, isLoading]);

  const updateOtpDigit = (index: number, nextDigit: string) => {
    const safeDigit = nextDigit.replace(/\D/g, "").slice(-1);
    const digits = verificationCode.split("").slice(0, 6);

    while (digits.length < 6) {
      digits.push("");
    }

    digits[index] = safeDigit;
    setVerificationCode(digits.join("").replace(/\s/g, ""));
  };

  const handleOtpChange = (index: number, value: string) => {
    const cleanValue = value.replace(/\D/g, "");

    if (!cleanValue) {
      updateOtpDigit(index, "");
      return;
    }

    if (cleanValue.length > 1) {
      const pasted = cleanValue.slice(0, 6).split("");
      const digits = ["", "", "", "", "", ""];
      pasted.forEach((digit, digitIndex) => {
        digits[digitIndex] = digit;
      });
      setVerificationCode(digits.join(""));

      const focusIndex = Math.min(pasted.length, 5);
      otpInputRefs.current[focusIndex]?.focus();
      return;
    }

    updateOtpDigit(index, cleanValue);

    if (index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      const digits = verificationCode.split("");
      const currentValue = digits[index] ?? "";

      if (!currentValue && index > 0) {
        otpInputRefs.current[index - 1]?.focus();
      }
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      otpInputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < 5) {
      event.preventDefault();
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);

    if (!pasted) {
      return;
    }

    const digits = ["", "", "", "", "", ""];
    pasted.split("").forEach((digit, index) => {
      digits[index] = digit;
    });

    setVerificationCode(digits.join(""));
    const focusIndex = Math.min(pasted.length, 5);
    otpInputRefs.current[focusIndex]?.focus();
  };

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
      const response = await apiFetch<RequestVerificationResponse>(
        "/api/auth/request-verification-code",
        {
          method: "POST",
          body: JSON.stringify({ email: email.trim() }),
        },
        { local: true },
      );

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
      const response = await apiFetch<RequestVerificationResponse>(
        "/api/auth/request-verification-code",
        {
          method: "POST",
          body: JSON.stringify({ email: pendingEmail }),
        },
        { local: true },
      );

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
      const response = await apiFetch<VerifyAndLoginResponse>(
        "/api/auth/verify-and-login",
        {
          method: "POST",
          body: JSON.stringify({
            email: pendingEmail,
            verificationCode: verificationCode.trim(),
          }),
        },
        { local: true },
      );

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
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Por favor ingresa correo y contraseña");
      toast({
        variant: "destructive",
        title: "Datos incompletos",
        description: "Por favor ingresa correo y contraseña",
      });
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const firebaseIdToken = await getFirebaseIdTokenWithEmailPassword(
        email.trim(),
        password.trim()
      );
      await signInWithFirebase(firebaseIdToken);
      toast({ title: "¡Bienvenido!", description: "Sesión iniciada correctamente." });
    } catch (error) {
      const errorMsg = getApiErrorMessage(error);
      setErrorMessage(errorMsg);
      toast({
        variant: "destructive",
        title: "Error al iniciar sesión",
        description: errorMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

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

  const onSendPasswordReset = async () => {
    if (!recoveryEmail.trim()) {
      setErrorMessage("Por favor ingresa tu correo electrónico");
      toast({
        variant: "destructive",
        title: "Correo requerido",
        description: "Por favor ingresa tu correo electrónico",
      });
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await sendPasswordReset(recoveryEmail.trim());
      setRecoveryEmailSent(true);
      toast({
        title: "¡Email enviado!",
        description: `Hemos enviado un enlace de recuperación a ${recoveryEmail.trim()}`,
      });
    } catch (error) {
      const errorMsg = getApiErrorMessage(error);
      setErrorMessage(errorMsg);
      toast({
        variant: "destructive",
        title: "Error al enviar email",
        description: errorMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoBack = () => {
    if (showPasswordRecovery) {
      setShowPasswordRecovery(false);
      setRecoveryEmail("");
      setRecoveryEmailSent(false);
      setErrorMessage("");
      setShowPasswordLogin(true);
    } else if (showPasswordLogin) {
      setShowPasswordLogin(false);
      setPassword("");
      setErrorMessage("");
      setShowPassword(false);
    } else if (showVerification) {
      // Volver a la pantalla de email/contraseña
      setShowVerification(false);
      setVerificationCode("");
      setPendingEmail("");
      setErrorMessage("");
      setAttempts(3);
      setEmail("");
      setShowPasswordLogin(true);
    } else {
      router.push("/");
    }
  };

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col overflow-x-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        <div className="h-full w-full">
          <Antigravity
            count={250}
            magnetRadius={9}
            ringRadius={8}
            waveSpeed={0.7}
            waveAmplitude={1.5}
            particleSize={1.5}
            lerpSpeed={0.1}
            color="#006A54"
            autoAnimate
            particleVariance={0.8}
            rotationSpeed={0}
            depthFactor={0.6}
            pulseSpeed={3}
            particleShape="sphere"
            fieldStrength={10}
          />
        </div>
      </div>

      {/* Back button */}
      {!isFromMobileApp ? (
        <div className="absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20 sm:left-5">
          <button
            type="button"
            onClick={handleGoBack}
            aria-label="Volver"
            className="flex items-center gap-2 rounded-full bg-black/30 px-3 py-2 text-white backdrop-blur-md transition-all hover:bg-black/45 sm:px-4"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
            <span className="text-sm font-medium">Volver</span>
          </button>
        </div>
      ) : (null)}

      {/* Main content */}
      <div className="pointer-events-none relative z-10 flex w-full flex-1 items-start justify-center overflow-y-auto px-[clamp(0.75rem,4vw,1.5rem)] pt-[max(5rem,calc(env(safe-area-inset-top)+4rem))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:px-6 sm:pt-[max(5.5rem,calc(env(safe-area-inset-top)+4.5rem))] sm:pb-8 lg:pt-[max(6rem,calc(env(safe-area-inset-top)+5rem))] lg:pb-12">
        <section className="pointer-events-auto relative mx-auto w-[min(100%,calc(100vw-1.5rem))] min-w-0 max-w-md rounded-[1.25rem] border border-white/55 bg-white/95 px-[clamp(1rem,4vw,2rem)] pb-[clamp(1.25rem,4vw,2rem)] pt-[clamp(3.5rem,10vw,5rem)] shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-md sm:max-w-lg sm:rounded-[2rem] md:max-w-xl lg:pb-12 lg:pt-24">
          <img
            src="/images/leon.png"
            alt="Club León Logo"
            className="absolute left-1/2 top-0 h-[clamp(3.5rem,12vw,5rem)] w-auto max-w-[min(85%,12rem)] -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-lg sm:h-24 md:h-28 lg:h-32"
          />

          <h1 className="text-center text-[clamp(1.375rem,5vw,2.25rem)] font-black tracking-tight text-[#06543b] sm:text-4xl lg:text-5xl">CLUB LEÓN</h1>

          <p className="mx-auto mt-2 max-w-sm text-pretty text-center text-[clamp(0.6875rem,2.8vw,0.9375rem)] leading-relaxed text-gray-600 sm:text-sm lg:text-base">
            Consulta contenido exclusivo del Club León, regístrate, guarda tu progreso y desbloquea grandes beneficios.
          </p>

          {/* Error message */}
          {errorMessage && (
            <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {/* Loading state */}
          {isSubmitting && (
            <div className="mt-6 rounded-3xl border border-emerald-100 bg-emerald-50 p-6 text-center">
              <svg
                className="mx-auto mb-3 h-12 w-12 animate-spin text-[#007A53]"
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
              <p className="text-sm font-semibold text-[#066246]">
                {showVerification ? "Verificando código..." : "Iniciando sesión"}
              </p>
            </div>
          )}

          {!isSubmitting && !firebaseReady && (
            <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-center text-amber-900">
              <p className="font-semibold">Servicio en mantenimiento</p>
              <p className="mt-2 text-sm">Intenta más tarde o contacta con soporte.</p>
            </div>
          )}

          {!isSubmitting && firebaseReady && (
            <>
              {!showVerification && !showPasswordLogin && !showPasswordRecovery ? (
                // Pantalla inicial: Email + Google/Apple
                <div className="mt-6 space-y-4 rounded-3xl border border-[#e7ece9] bg-[#f8fbf9] p-[clamp(0.75rem,3vw,1.25rem)] shadow-sm sm:mt-7">
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
                      aria-label="Correo electrónico"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={isRequestingCode}
                      className="h-11 rounded-2xl border border-gray-200 bg-white pl-12 pr-4 text-gray-900 placeholder-gray-500 transition-all focus:border-[#007A53] focus:ring-2 focus:ring-[#007A53]/15 sm:h-12 md:h-14"
                    />
                  </div>

                  <Button
                    className="h-11 w-full rounded-2xl bg-[#007A53] text-sm font-bold text-white shadow-lg shadow-[#007A53]/30 transition-all hover:bg-[#006248] disabled:opacity-70 sm:h-12 sm:text-base md:h-14 md:text-lg"
                    onClick={onRequestVerificationCode}
                    disabled={isRequestingCode}
                  >
                    {isRequestingCode ? "Enviando..." : "Continuar"}
                  </Button>

                  <div className="text-center">
                    <Link
                      href="/register"
                      className="text-sm font-bold text-[#007A53] underline-offset-4 hover:underline"
                    >
                      ¿No tienes cuenta? Regístrate aquí
                    </Link>
                  </div>
                </div>
              ) : showVerification && !showPasswordLogin && !showPasswordRecovery ? (
                // Formulario de verificación de código
                <div className="mt-6 space-y-4 rounded-3xl border border-[#e7ece9] bg-[#f8fbf9] p-[clamp(0.75rem,3vw,1.25rem)] shadow-sm sm:mt-7">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      Hemos enviado un código de verificación a
                    </p>
                    <p className="mt-1 break-all px-1 font-semibold text-[#007A53]">
                      {pendingEmail}
                    </p>
                  </div>

                  {/* Código Input estilo cubitos */}
                  <div className="space-y-2" onPaste={handleOtpPaste}>
                    <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                      Código de 6 dígitos
                    </p>
                    <div className="grid grid-cols-6 gap-1.5 sm:gap-2 md:gap-3">
                      {Array.from({ length: 6 }).map((_, index) => {
                        const digit = verificationCode[index] ?? "";

                        return (
                          <input
                            key={index}
                            ref={(element) => {
                              otpInputRefs.current[index] = element;
                            }}
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            pattern="[0-9]*"
                            maxLength={1}
                            value={digit}
                            disabled={isSubmitting}
                            onChange={(event) => handleOtpChange(index, event.target.value)}
                            onKeyDown={(event) => handleOtpKeyDown(index, event)}
                            className="aspect-square h-auto w-full min-w-0 max-h-14 rounded-xl border border-gray-200 bg-white text-center text-lg font-bold text-gray-900 shadow-sm transition-all focus:border-[#007A53] focus:ring-2 focus:ring-[#007A53]/20 sm:text-xl md:text-2xl"
                            aria-label={`Dígito ${index + 1} del código`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {attempts < 3 && attempts > 0 && (
                    <p className="text-center text-xs font-medium text-orange-600">
                      Te quedan {attempts} intento{attempts !== 1 ? "s" : ""}
                    </p>
                  )}

                  <Button
                    className="h-11 w-full rounded-2xl bg-[#007A53] text-sm font-bold text-white shadow-lg shadow-[#007A53]/30 transition-all hover:bg-[#006248] disabled:opacity-70 sm:h-12 sm:text-base md:h-14 md:text-lg"
                    onClick={onVerifyAndLogin}
                    disabled={isSubmitting || verificationCode.length !== 6 || !esOtpValido}
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

                  <div className="space-y-3 border-t border-gray-200 pt-4">
                    <p className="text-center text-sm font-semibold text-gray-600">
                      ¿Prefieres iniciar sesión con correo y contraseña?
                    </p>
                    <Button
                      className="h-12 w-full rounded-2xl border-2 border-[#007A53] bg-white text-base font-bold text-[#007A53] transition-all hover:bg-[#f0f7f5] sm:h-14 sm:text-lg"
                      onClick={() => {
                        setShowVerification(false);
                        setShowPasswordLogin(true);
                        setPassword("");
                        setShowPassword(false);
                        setErrorMessage("");
                        setVerificationCode("");
                        setPendingEmail("");
                      }}
                      disabled={isSubmitting}
                    >
                      Cambiar a Correo y Contraseña
                    </Button>
                  </div>

                  <div className="text-center">
                    <button
                      onClick={() => {
                        setShowVerification(false);
                        setShowPasswordLogin(true);
                        setVerificationCode("");
                        setPendingEmail("");
                        setErrorMessage("");
                        setAttempts(3);
                        setEmail("");
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      ← Usar otro correo
                    </button>
                  </div>
                </div>
              ) : showPasswordLogin ? (
                // Formulario de correo y contraseña
                <div className="mt-6 space-y-4 rounded-3xl border border-[#e7ece9] bg-[#f8fbf9] p-[clamp(0.75rem,3vw,1.25rem)] shadow-sm sm:mt-7">
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
                      aria-label="Correo electrónico"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={isSubmitting}
                      className="h-11 rounded-2xl border border-gray-200 bg-white pl-12 pr-4 text-gray-900 placeholder-gray-500 transition-all focus:border-[#007A53] focus:ring-2 focus:ring-[#007A53]/15 sm:h-12 md:h-14"
                    />
                  </div>

                  {/* Password Input */}
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <Input
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Contraseña"
                      aria-label="Contraseña"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={isSubmitting}
                      className="h-12 rounded-2xl border border-gray-200 bg-white pl-12 pr-12 text-gray-900 placeholder-gray-500 transition-all focus:border-[#007A53] focus:ring-2 focus:ring-[#007A53]/15 sm:h-14"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
                      disabled={isSubmitting}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  <Button
                    className="h-11 w-full rounded-2xl bg-[#007A53] text-sm font-bold text-white shadow-lg shadow-[#007A53]/30 transition-all hover:bg-[#006248] disabled:opacity-70 sm:h-12 sm:text-base md:h-14 md:text-lg"
                    onClick={onEmailPasswordLogin}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Iniciando sesión..." : "Iniciar Sesión"}
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordLogin(false);
                        setShowPasswordRecovery(true);
                        setRecoveryEmail(email);
                        setErrorMessage("");
                      }}
                      className="text-sm font-semibold text-[#007A53] underline-offset-4 hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                </div>
              ) : showPasswordRecovery ? (
                // Pantalla de recuperación de contraseña
                <div className="mt-6 space-y-4 rounded-3xl border border-[#e7ece9] bg-[#f8fbf9] p-[clamp(0.75rem,3vw,1.25rem)] shadow-sm sm:mt-7">
                  {!recoveryEmailSent ? (
                    <>
                      <div className="text-center mb-4">
                        <h2 className="text-lg font-bold text-[#007A53]">Recuperar Contraseña</h2>
                        <p className="text-sm text-gray-600 mt-2">Ingresa tu correo para recibir un enlace de recuperación</p>
                      </div>

                      {errorMessage && (
                        <div className="rounded-xl bg-red-50 p-3 border border-red-200">
                          <p className="text-sm text-red-700">{errorMessage}</p>
                        </div>
                      )}

                      {/* Recovery Email Input */}
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
                          aria-label="Correo electrónico para recuperación"
                          value={recoveryEmail}
                          onChange={(event) => setRecoveryEmail(event.target.value)}
                          disabled={isSubmitting}
                          className="h-11 rounded-2xl border border-gray-200 bg-white pl-12 pr-4 text-gray-900 placeholder-gray-500 transition-all focus:border-[#007A53] focus:ring-2 focus:ring-[#007A53]/15 sm:h-12 md:h-14"
                        />
                      </div>

                      <Button
                        className="h-11 w-full rounded-2xl bg-[#007A53] text-sm font-bold text-white shadow-lg shadow-[#007A53]/30 transition-all hover:bg-[#006248] disabled:opacity-70 sm:h-12 sm:text-base md:h-14 md:text-lg"
                        onClick={onSendPasswordReset}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Enviando..." : "Enviar Enlace de Recuperación"}
                      </Button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordRecovery(false);
                          setShowPasswordLogin(true);
                          setRecoveryEmail("");
                          setErrorMessage("");
                        }}
                        className="w-full text-sm font-semibold text-[#007A53] underline-offset-4 hover:underline"
                      >
                        Volver al Login
                      </button>
                    </>
                  ) : (
                    <div className="text-center space-y-4">
                      <div className="rounded-full bg-green-100 w-16 h-16 flex items-center justify-center mx-auto">
                        <svg className="h-8 w-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-[#007A53]">¡Email enviado!</h3>
                      <p className="text-sm text-gray-600">
                        Hemos enviado un enlace de recuperación a <strong>{recoveryEmail}</strong>
                      </p>
                      <p className="text-sm text-gray-500">
                        Por favor revisa tu bandeja de entrada o en spam y sigue las instrucciones para restablecer tu contraseña.
                      </p>
                      <Button
                        className="h-12 w-full rounded-2xl bg-[#007A53] text-base font-bold text-white shadow-lg shadow-[#007A53]/30 transition-all hover:bg-[#006248] sm:h-14 sm:text-lg"
                        onClick={() => {
                          setShowPasswordRecovery(false);
                          setShowPasswordLogin(true);
                          setRecoveryEmail("");
                          setRecoveryEmailSent(false);
                          setErrorMessage("");
                        }}
                      >
                        Volver al Login
                      </Button>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="my-6 flex min-w-0 items-center gap-2 sm:gap-4">
                <div className="h-px min-w-0 flex-1 bg-gray-300" />
                <span className="shrink-0 text-xs font-medium text-gray-500 sm:text-sm">O inicia con</span>
                <div className="h-px min-w-0 flex-1 bg-gray-300" />
              </div>

              {/* Social Buttons */}
              <div className="space-y-3">
                {/* Google Button */}
                <Button
                  className="h-11 w-full min-w-0 justify-center gap-2 rounded-full border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-900 transition-all hover:bg-gray-50 disabled:opacity-70 sm:h-12 sm:gap-3 sm:px-4 sm:text-sm md:h-14 md:text-base"
                  onClick={onGoogleLogin}
                  disabled={isSubmitting || isRequestingCode}
                >
                  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
                  className="h-11 w-full min-w-0 justify-center gap-2 rounded-full bg-black px-3 text-xs font-semibold text-white transition-all hover:bg-gray-900 disabled:opacity-70 sm:h-12 sm:gap-3 sm:px-4 sm:text-sm md:h-14 md:text-base"
                  onClick={onAppleLogin}
                  disabled={isSubmitting || isRequestingCode}
                >
                  <svg className="-ml-2 h-6 w-6 shrink-0" fill="currentColor" viewBox="0 0 384 512" aria-hidden="true">
                    <path d="M318.7 268.6c-.2-36.7 16.3-64.3 49.8-84.9-18.7-26.8-47-41.6-84.6-44.5-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141 16 187.3 16 267.5c0 24.1 4.4 49 13.3 74.8 11.9 34.2 54.9 118.2 99.7 116.8 23.4-.6 39.9-16.6 70.4-16.6 29.6 0 44.9 16.6 71 16.6 45.2-.6 84.1-77 95.4-111.3-65.8-31-47.1-126.8-47.1-129.2zM262.2 107.5c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-51.9 16.4-67.8 34.9-17.5 20.1-27.8 44.9-25.6 72.5 26 .2 50.2-13 69.4-34.9z" />
                  </svg>
                  Continuar con Apple
                </Button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100svh] items-center justify-center bg-[#007A53] px-4 text-center text-white">
          Cargando...
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}