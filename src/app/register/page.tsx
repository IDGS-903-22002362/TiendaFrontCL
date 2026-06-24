"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { registerWithEmailPassword } from "@/lib/firebase/auth";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import Antigravity from "@/components/Antigravity";

export default function RegisterPage() {
    const router = useRouter();
    const { signInWithFirebase, completeProfile, clearSession } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const [form, setForm] = useState({
        nombre: "",
        email: "",
        password: "",
        confirmPassword: "",
        telefono: "",
        fechaNacimiento: "",
        genero: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.nombre.trim() || !form.email.trim() || !form.password.trim()) {
            toast({
                variant: "destructive",
                title: "Campos obligatorios",
                description: "Nombre, email y contrasena son requeridos.",
            });
            return;
        }

        if (form.password !== form.confirmPassword) {
            toast({
                variant: "destructive",
                title: "Contrasenas no coinciden",
                description: "Por favor, asegurate de que las contrasenas coincidan.",
            });
            return;
        }

        if (!acceptedTerms) {
            toast({
                variant: "destructive",
                title: "Terminos y condiciones",
                description: "Debes aceptar los terminos y condiciones para crear tu cuenta.",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const firebaseIdToken = await registerWithEmailPassword(form.email, form.password);

            await signInWithFirebase(firebaseIdToken);

            const generoMap: Record<string, string> = {
                M: "masculino",
                F: "femenino",
                O: "otro",
            };
            const generoNormalizado = form.genero ? generoMap[form.genero] || form.genero : undefined;

            const fechaNormalizada = form.fechaNacimiento ? form.fechaNacimiento.substring(0, 10) : undefined;

            await completeProfile({
                nombre: form.nombre.trim(),
                telefono: form.telefono.trim(),
                fechaNacimiento: fechaNormalizada,
                genero: generoNormalizado,
            });

            await clearSession();

            toast({ title: "Cuenta creada", description: "Accede con verificacion de correo" });
            router.push(`/login?email=${encodeURIComponent(form.email)}`);
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error al registrarse",
                description: getApiErrorMessage(error),
            });
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

                    <h1 className="text-center text-[clamp(1.375rem,5vw,2.25rem)] font-black tracking-tight text-[#06543b] sm:text-4xl">Registro manual</h1>

                    <p className="mx-auto mt-1.5 max-w-sm text-center text-[clamp(0.6875rem,2.8vw,0.875rem)] leading-relaxed text-gray-600 sm:mt-2 sm:text-sm">
                        Completa tus datos para ser parte del Club León.
                    </p>

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
                            placeholder="Telefono"
                            value={form.telefono}
                            onChange={(e) => {
                                e.target.value = e.target.value.replace(/[^0-9]/g, "");
                                handleChange(e);
                            }}
                            required
                            type="text"
                            inputMode="numeric"
                            maxLength={10}
                            pattern="[0-9]{10}"
                            className="h-10 rounded-2xl border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder-gray-500 transition-all focus:border-[#007A53] focus:ring-2 focus:ring-[#007A53]/15 sm:h-11"
                        />

                        <Input
                            name="fechaNacimiento"
                            type="date"
                            value={form.fechaNacimiento}
                            onChange={handleChange}
                            required
                            className="h-10 rounded-2xl border border-gray-200 bg-white px-3 text-sm text-gray-900 transition-all focus:border-[#007A53] focus:ring-2 focus:ring-[#007A53]/15 sm:h-11"
                        />

                        <select
                            name="genero"
                            value={form.genero}
                            onChange={handleChange}
                            required
                            className="h-10 w-full rounded-2xl border border-gray-200 bg-white px-3 text-sm text-gray-900 transition-all focus:border-[#007A53] focus:ring-2 focus:ring-[#007A53]/15 sm:h-11"
                        >
                            <option value="">Genero</option>
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
                                y el aviso de privacidad del Club Leon.
                            </span>
                        </label>

                        <Button
                            type="submit"
                            className="h-10 w-full rounded-2xl bg-[#007A53] text-sm font-bold text-white shadow-lg shadow-[#007A53]/30 transition-all hover:bg-[#006248] disabled:opacity-70 sm:h-11 sm:text-base"
                            disabled={isSubmitting || !acceptedTerms}
                        >
                            {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
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
                </section>
            </div>
        </div>
    );
}