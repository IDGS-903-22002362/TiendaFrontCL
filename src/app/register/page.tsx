"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getApiErrorMessage } from "@/lib/api/errors";
import { showErrorToast, showInfoToast, showSuccessToast } from "@/lib/app-toast";
import { AppNotificationBanner } from "@/components/ui/app-notification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Checkbox } from "@/components/ui/checkbox";
import Antigravity from "@/components/Antigravity";
import { apiFetch } from "@/lib/api/client";
import {
    OTP_TOTAL_ATTEMPTS,
    getRemainingOtpAttempts,
    requiresNewOtpCode,
} from "@/lib/auth/otp-verification";

interface RequestVerificationResponse {
    success: boolean;
    message?: string;
    expiresIn?: number;
}

interface VerifyRegistrationResponse {
    success: boolean;
    message?: string;
    remainingAttempts?: number;
}

const VALID_GENEROS = ["M", "F", "O"] as const;

export default function RegisterPage() {
    const router = useRouter();
    const { clearSession } = useAuth();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const [showVerification, setShowVerification] = useState(false);
    const [verificationCode, setVerificationCode] = useState("");
    const [pendingEmail, setPendingEmail] = useState("");
    const [isRequestingCode, setIsRequestingCode] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);
    const [attempts, setAttempts] = useState(OTP_TOTAL_ATTEMPTS);
    const [errorMessage, setErrorMessage] = useState("");
    const [isVerificationComplete, setIsVerificationComplete] = useState(false);
    const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);
    const lastSubmittedCodeRef = useRef("");

    const [form, setForm] = useState({
        nombre: "",
        email: "",
        password: "",
        confirmPassword: "",
        telefono: "",
        fechaNacimiento: "",
        genero: "",
    });

    const esOtpValido = verificationCode.length === 6;

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

    useEffect(() => {
        if (
            showVerification &&
            verificationCode.length === 6 &&
            !isSubmitting &&
            lastSubmittedCodeRef.current !== verificationCode
        ) {
            void onVerifyCode();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [verificationCode, showVerification, isSubmitting]);

    useEffect(() => {
        if (verificationCode.length < 6) {
            lastSubmittedCodeRef.current = "";
        }
    }, [verificationCode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

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

    const buildRegistrationPayload = () => {
        const generoMap: Record<string, string> = {
            M: "masculino",
            F: "femenino",
            O: "otro",
        };
        const generoNormalizado = form.genero ? generoMap[form.genero] || form.genero : undefined;
        const fechaNormalizada = form.fechaNacimiento
            ? form.fechaNacimiento.substring(0, 10)
            : undefined;

        const telefono = form.telefono.trim();

        return {
            nombre: form.nombre.trim(),
            email: form.email.trim(),
            password: form.password,
            telefono: telefono || undefined,
            fechaNacimiento: fechaNormalizada,
            genero: generoNormalizado,
        };
    };

    const onRequestRegistrationCode = async () => {
        if (
            form.genero &&
            !VALID_GENEROS.includes(form.genero as (typeof VALID_GENEROS)[number])
        ) {
            showErrorToast({
                
                title: "Genero invalido",
                description: "Selecciona una opcion de genero valida.",
            });
            return false;
        }

        setIsRequestingCode(true);
        setErrorMessage("");

        try {
            await apiFetch<RequestVerificationResponse>(
                "/api/auth/request-registration-code",
                {
                    method: "POST",
                    body: JSON.stringify(buildRegistrationPayload()),
                },
                { local: true, skipAuthRecovery: true },
            );

            setPendingEmail(form.email.trim());
            setShowVerification(true);
            setVerificationCode("");
            lastSubmittedCodeRef.current = "";
            setAttempts(OTP_TOTAL_ATTEMPTS);
            setResendTimer(60);
            showInfoToast({
                title: "Código enviado",
                description: `Hemos enviado un código de verificación a ${form.email.trim()}`,
            });
            return true;
        } catch (error) {
            const errorMsg = getApiErrorMessage(error);
            setErrorMessage(errorMsg);
            showErrorToast({
                
                title: "Error",
                description: errorMsg,
            });
            return false;
        } finally {
            setIsRequestingCode(false);
        }
    };

    const onResendCode = async () => {
        if (resendTimer > 0 || !pendingEmail) return;

        await onRequestRegistrationCode();
    };

    /** Regresa al formulario cuando el registro pendiente ya no puede verificarse. */
    const resetVerificationFlow = () => {
        setShowVerification(false);
        setVerificationCode("");
        setPendingEmail("");
        setAttempts(OTP_TOTAL_ATTEMPTS);
        setResendTimer(0);
        lastSubmittedCodeRef.current = "";
    };

    const onVerifyCode = async () => {
        const code = verificationCode.trim();

        if (code.length !== 6) {
            showErrorToast({
                
                title: "Código inválido",
                description: "Por favor, ingresa el código de 6 dígitos",
            });
            return;
        }

        if (isSubmitting) {
            return;
        }

        lastSubmittedCodeRef.current = code;
        setIsSubmitting(true);
        setIsVerificationComplete(false);
        setErrorMessage("");

        let keepLoading = false;

        try {
            await apiFetch<VerifyRegistrationResponse>(
                "/api/auth/verify-registration",
                {
                    method: "POST",
                    body: JSON.stringify({
                        email: pendingEmail,
                        verificationCode: code,
                    }),
                },
                { local: true, skipAuthRecovery: true },
            );

            keepLoading = true;
            setIsVerificationComplete(true);
            await clearSession();
            showSuccessToast({
                title: "Correo verificado",
                description: "Tu cuenta está lista. Inicia sesión con tu correo.",
            });
            router.replace(`/login?email=${encodeURIComponent(pendingEmail)}`);
        } catch (error) {
            const errorMsg = getApiErrorMessage(error);
            const remainingAttempts = getRemainingOtpAttempts(error);

            // Vaciar el codigo evita que el auto-envio se vuelva a disparar en bucle.
            setVerificationCode("");
            setErrorMessage(errorMsg);

            if (remainingAttempts !== undefined) {
                setAttempts(Math.max(remainingAttempts, 0));
            }

            if (requiresNewOtpCode(error)) {
                resetVerificationFlow();
                showErrorToast({
                    title: "Demasiados intentos",
                    description: "Solicita un nuevo código para continuar.",
                });
            } else {
                showErrorToast({
                    
                    title: "Error al verificar",
                    description: errorMsg,
                });
            }
        } finally {
            if (!keepLoading) {
                setIsSubmitting(false);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.nombre.trim() || !form.email.trim() || !form.password.trim()) {
            showErrorToast({
                
                title: "Campos obligatorios",
                description: "Nombre, email y contrasena son requeridos.",
            });
            return;
        }

        if (form.password !== form.confirmPassword) {
            showErrorToast({
                
                title: "Contrasenas no coinciden",
                description: "Por favor, asegurate de que las contrasenas coincidan.",
            });
            return;
        }

        const telefono = form.telefono.trim();
        if (telefono && telefono.length !== 10) {
            showErrorToast({
                title: "Telefono invalido",
                description: "Si agregas telefono, debe tener exactamente 10 digitos.",
            });
            return;
        }

        if (!acceptedTerms) {
            showErrorToast({
                
                title: "Terminos y condiciones",
                description: "Debes aceptar los terminos y condiciones para crear tu cuenta.",
            });
            return;
        }

        if (
            form.genero &&
            !VALID_GENEROS.includes(form.genero as (typeof VALID_GENEROS)[number])
        ) {
            showErrorToast({
                
                title: "Genero invalido",
                description: "Selecciona una opcion de genero valida.",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            await onRequestRegistrationCode();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="relative flex min-h-[100dvh] w-full flex-col overflow-x-hidden bg-white">
            <div className="absolute inset-0 z-0" aria-hidden="true">
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

            <div className="absolute left-3 top-3 z-20 sm:left-5 sm:top-5">
                <button
                    onClick={() => router.push("/login")}
                    className="flex items-center gap-2 rounded-full bg-black/30 px-3 py-2 text-white backdrop-blur-md transition-all hover:bg-black/45 sm:px-4"
                >
                    <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-sm font-medium">Volver</span>
                </button>
            </div>

            <div className="pointer-events-none relative z-10 flex flex-1 items-start justify-center overflow-y-auto px-[clamp(0.75rem,4vw,1.5rem)] pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(4.5rem,calc(env(safe-area-inset-top)+3.5rem))] sm:items-center sm:px-6 sm:py-10 lg:py-14">
                <section className="pointer-events-auto relative mx-auto w-[min(100%,calc(100vw-1.5rem))] min-w-0 max-w-md rounded-[1.25rem] border border-white/55 bg-white/95 px-[clamp(1rem,4vw,2rem)] pb-[clamp(1rem,4vw,2rem)] pt-[clamp(3rem,10vw,5rem)] shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-md sm:max-w-lg sm:rounded-[2rem] md:max-w-xl lg:pb-12 lg:pt-24">
                    <img
                        src="/images/leon.png"
                        alt="Club Leon Logo"
                        className="absolute left-1/2 top-0 h-[clamp(3.5rem,12vw,5rem)] w-auto max-w-[min(85%,12rem)] -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-lg sm:h-24 md:h-28 lg:h-32"
                    />

                    <h1 className="text-center text-[clamp(1.375rem,5vw,2.25rem)] font-black tracking-tight text-[#06543b] sm:text-4xl">
                        {showVerification ? "Verifica tu correo" : "Registro manual"}
                    </h1>

                    <p className="mx-auto mt-1.5 max-w-sm text-center text-[clamp(0.6875rem,2.8vw,0.875rem)] leading-relaxed text-gray-600 sm:mt-2 sm:text-sm">
                        {showVerification
                            ? "Ingresa el codigo que enviamos a tu correo para activar tu cuenta."
                            : "Completa tus datos para ser parte del Club León."}
                    </p>

                    {errorMessage ? (
                        <AppNotificationBanner
                            variant="error"
                            title="No pudimos completar el registro"
                            description={errorMessage}
                            className="mt-4 shadow-none"
                        />
                    ) : null}

                    {isSubmitting && (
                        <div className="mt-4 rounded-3xl border border-emerald-100 bg-emerald-50 p-6 text-center">
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
                                {isVerificationComplete
                                    ? "¡Correo verificado! Redirigiendo..."
                                    : showVerification
                                      ? "Verificando código..."
                                      : "Enviando código..."}
                            </p>
                        </div>
                    )}

                    {!isSubmitting && showVerification ? (
                        <div className="mt-4 space-y-4 rounded-3xl border border-[#e7ece9] bg-[#f8fbf9] p-[clamp(0.75rem,3vw,1rem)] shadow-sm sm:mt-5">
                            <div className="text-center">
                                <p className="text-sm text-gray-600">Hemos enviado un código de verificación a</p>
                                <p className="mt-1 break-all px-1 font-semibold text-[#007A53]">{pendingEmail}</p>
                            </div>

                            <div className="space-y-2" onPaste={handleOtpPaste}>
                                <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                                    Código de 6 dígitos
                                </p>
                                <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
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
                                                disabled={isSubmitting || isRequestingCode}
                                                onChange={(event) => handleOtpChange(index, event.target.value)}
                                                onKeyDown={(event) => handleOtpKeyDown(index, event)}
                                                className="aspect-square h-auto w-full min-w-0 max-h-14 rounded-xl border border-gray-200 bg-white text-center text-lg font-bold text-gray-900 shadow-sm transition-all focus:border-[#007A53] focus:ring-2 focus:ring-[#007A53]/20 sm:text-xl"
                                                aria-label={`Dígito ${index + 1} del código`}
                                            />
                                        );
                                    })}
                                </div>
                            </div>

                            {attempts < OTP_TOTAL_ATTEMPTS && attempts > 0 ? (
                                <p className="text-center text-xs font-medium text-orange-600">
                                    Te quedan {attempts} intento{attempts !== 1 ? "s" : ""}
                                </p>
                            ) : null}

                            <Button
                                type="button"
                                className="h-10 w-full rounded-2xl bg-[#007A53] text-sm font-bold text-white shadow-lg shadow-[#007A53]/30 transition-all hover:bg-[#006248] disabled:opacity-70 sm:h-11 sm:text-base"
                                onClick={() => void onVerifyCode()}
                                disabled={isSubmitting || !esOtpValido || isRequestingCode}
                            >
                                {isSubmitting ? "Verificando..." : "Verificar correo"}
                            </Button>

                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={() => void onResendCode()}
                                    disabled={resendTimer > 0 || isRequestingCode}
                                    className="text-sm font-bold text-[#007A53] underline-offset-4 hover:underline disabled:opacity-50"
                                >
                                    {resendTimer > 0
                                        ? `Reenviar código en ${resendTimer}s`
                                        : "¿No recibiste el código? Reenviar"}
                                </button>
                            </div>

                            <p className="text-center text-xs text-gray-500">
                                Si no recibes el código, revisa tu bandeja de spam o correo no deseado.
                            </p>
                        </div>
                    ) : !isSubmitting ? (
                        <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-3xl border border-[#e7ece9] bg-[#f8fbf9] p-[clamp(0.75rem,3vw,1rem)] shadow-sm sm:mt-5">
                            <Input
                                name="nombre"
                                placeholder="Nombre completo"
                                value={form.nombre}
                                onChange={handleChange}
                                required
                                className="h-10 rounded-2xl border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder-gray-500 transition-all focus:border-[#007A53] focus:ring-2 focus:ring-[#007A53]/15 sm:h-11"
                            />

                            <Input
                                name="email"
                                type="email"
                                inputMode="email"
                                autoComplete="email"
                                placeholder="Correo electronico"
                                value={form.email}
                                onChange={handleChange}
                                required
                                className="h-10 rounded-2xl border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder-gray-500 transition-all focus:border-[#007A53] focus:ring-2 focus:ring-[#007A53]/15 sm:h-11"
                            />

                            <div className="relative">
                                <Input
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Contrasena"
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                    className="h-10 rounded-2xl border border-gray-200 bg-white px-3 pr-10 text-sm text-gray-900 placeholder-gray-500 transition-all focus:border-[#007A53] focus:ring-2 focus:ring-[#007A53]/15 sm:h-11"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            <div className="relative">
                                <Input
                                    name="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Confirmar contrasena"
                                    value={form.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    className="h-10 rounded-2xl border border-gray-200 bg-white px-3 pr-10 text-sm text-gray-900 placeholder-gray-500 transition-all focus:border-[#007A53] focus:ring-2 focus:ring-[#007A53]/15 sm:h-11"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            <Input
                                name="telefono"
                                placeholder="Telefono (opcional)"
                                aria-label="Telefono (opcional)"
                                value={form.telefono}
                                onChange={(e) => {
                                    e.target.value = e.target.value.replace(/[^0-9]/g, "");
                                    handleChange(e);
                                }}
                                type="text"
                                inputMode="numeric"
                                maxLength={10}
                                pattern="[0-9]{10}"
                                className="h-10 rounded-2xl border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder-gray-500 transition-all focus:border-[#007A53] focus:ring-2 focus:ring-[#007A53]/15 sm:h-11"
                            />

                            <DatePickerField
                                value={form.fechaNacimiento}
                                onChange={(fechaNacimiento) =>
                                    setForm((prev) => ({ ...prev, fechaNacimiento }))
                                }
                                max={new Date().toISOString().slice(0, 10)}
                                placeholder="Fecha de nacimiento (opcional)"
                                aria-label="Fecha de nacimiento (opcional)"
                                className="h-10 rounded-2xl border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-none transition-all hover:bg-white focus-visible:border-[#007A53] focus-visible:ring-2 focus-visible:ring-[#007A53]/15 sm:h-11"
                            />

                            <select
                                name="genero"
                                value={form.genero}
                                onChange={handleChange}
                                aria-label="Genero (opcional)"
                                className="h-10 w-full rounded-2xl border border-gray-200 bg-white px-3 text-sm text-gray-900 transition-all focus:border-[#007A53] focus:ring-2 focus:ring-[#007A53]/15 sm:h-11"
                            >
                                <option value="">
                                    Genero (opcional)
                                </option>
                                <option value="M">Masculino</option>
                                <option value="F">Femenino</option>
                                <option value="O">Otro</option>
                            </select>

                            <label
                                htmlFor="register-terms"
                                className="flex items-start gap-2.5 rounded-2xl border border-[#e7ece9] bg-white p-3"
                            >
                                <Checkbox
                                    id="register-terms"
                                    checked={acceptedTerms}
                                    onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                                    disabled={isSubmitting}
                                    className="mt-0.5"
                                    aria-required="true"
                                />
                                <span className="text-xs leading-relaxed text-gray-600 sm:text-sm">
                                    Acepto los{" "}
                                    <Link
                                        href="/TerminosCondiciones"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-semibold text-[#007A53] underline-offset-4 hover:underline"
                                    >
                                        terminos y condiciones
                                    </Link>{" "}
                                    y el{" "}
                                    <Link
                                        href="/aviso-de-privacidad"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-semibold text-[#007A53] underline-offset-4 hover:underline"
                                    >
                                        aviso de privacidad
                                    </Link>{" "}
                                    del Club Leon.
                                </span>
                            </label>

                            <Button
                                type="submit"
                                className="h-10 w-full rounded-2xl bg-[#007A53] text-sm font-bold text-white shadow-lg shadow-[#007A53]/30 transition-all hover:bg-[#006248] disabled:opacity-70 sm:h-11 sm:text-base"
                                disabled={isSubmitting || !acceptedTerms}
                            >
                                {isSubmitting ? "Enviando código..." : "Crear cuenta"}
                            </Button>

                            <div className="text-center">
                                <p className="text-sm text-gray-600">
                                    Ya tienes cuenta?{" "}
                                    <Link href="/login" className="font-bold text-[#007A53] underline-offset-4 hover:underline">
                                        Inicia sesion
                                    </Link>
                                </p>
                            </div>
                        </form>
                    ) : null}
                </section>
            </div>
        </div>
    );
}
