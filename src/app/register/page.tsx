"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserPlus, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { registerWithEmailPassword } from "@/lib/firebase/auth";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Breadcrumbs } from "@/components/storefront/shared/breadcrumbs";

export default function RegisterPage() {
    const router = useRouter();
    const { signInWithFirebase, completeProfile, clearSession } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
                description: "Nombre, email y contraseña son requeridos.",
            });
            return;
        }

        if (form.password !== form.confirmPassword) {
            toast({
                variant: "destructive",
                title: "Contraseñas no coinciden",
                description: "Por favor, asegúrate de que las contraseñas coincidan.",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Crear usuario en Firebase Auth (solo email + password)
            const firebaseIdToken = await registerWithEmailPassword(form.email, form.password);

            // 2. Iniciar sesión en tu backend (crea el usuario básico en Firestore)
            await signInWithFirebase(firebaseIdToken);

            // 3. Completar el perfil con los datos adicionales del formulario
            // Normalizar género: M -> masculino, F -> femenino, O -> otro
            const generoMap: Record<string, string> = {
                "M": "masculino",
                "F": "femenino",
                "O": "otro",
            };
            const generoNormalizado = form.genero ? generoMap[form.genero] || form.genero : undefined;

            // Normalizar fecha a formato YYYY-MM-DD (extraer solo los primeros 10 caracteres)
            const fechaNormalizada = form.fechaNacimiento ? form.fechaNacimiento.substring(0, 10) : undefined;

            // Usar el método del contexto para completar el perfil
            // Esto actualiza automáticamente el estado del usuario en el contexto
            await completeProfile({
                nombre: form.nombre.trim(),
                telefono: form.telefono.trim(),
                fechaNacimiento: fechaNormalizada,
                genero: generoNormalizado,
            });

            await clearSession();

            toast({ title: "¡Cuenta creada!", description: "Accede con verficación de correo" });
            router.push(`/login?email=${encodeURIComponent(form.email)}`); // Redirige a la página principal o donde corresponda
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
        <div className="container py-5 md:py-8">
            <div className="mb-6 space-y-3">
                <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Registro" }]} />
                <div className="flex items-center gap-3">
                    <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full border border-border">
                        <Link href="/login">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80">Únete al club</p>
                        <h1 className="mt-1 font-headline text-4xl font-semibold uppercase leading-none">Crear cuenta</h1>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-md">
                <Card className="rounded-2xl border-border shadow-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-2xl">
                            <UserPlus className="h-6 w-6 text-primary" />
                            Registro manual
                        </CardTitle>
                        <CardDescription>Completa tus datos para ser parte del Club León.</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            <Input
                                name="nombre"
                                placeholder="Nombre completo *"
                                value={form.nombre}
                                onChange={handleChange}
                                required
                                className="h-12 rounded-xl"
                            />
                            <Input
                                name="email"
                                type="email"
                                placeholder="Correo electrónico *"
                                value={form.email}
                                onChange={handleChange}
                                required
                                className="h-12 rounded-xl"
                            />
                            <div className="relative">
                                <Input
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Contraseña *"
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                    className="h-12 rounded-xl pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <div className="relative">
                                <Input
                                    name="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Confirmar contraseña *"
                                    value={form.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    className="h-12 rounded-xl"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <Input
                                name="telefono"
                                placeholder="Teléfono *"
                                value={form.telefono}
                                onChange={(e) => {
                                    // Bloquea letras y símbolos antes de actualizar el estado
                                    e.target.value = e.target.value.replace(/[^0-9]/g, '');
                                    handleChange(e);
                                }}
                                required
                                type="text"
                                inputMode="numeric"
                                maxLength={10}
                                pattern="[0-9]{10}"
                                className="h-12 rounded-xl"
                            />
                            <Input
                                name="fechaNacimiento"
                                type="date"
                                placeholder="Fecha de nacimiento"
                                value={form.fechaNacimiento}
                                onChange={handleChange}
                                required
                                className="h-12 rounded-xl"
                            />
                            <select
                                name="genero"
                                value={form.genero}
                                onChange={handleChange}
                                required
                                className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                            >
                                <option value="">Género</option>
                                <option value="M">Masculino</option>
                                <option value="F">Femenino</option>
                                <option value="O">Otro</option>
                            </select>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4">
                            <Button type="submit" className="h-12 w-full rounded-full" disabled={isSubmitting}>
                                {isSubmitting ? "Creando cuenta..." : "Registrarme"}
                            </Button>
                            <p className="text-sm text-muted-foreground">
                                ¿Ya tienes cuenta?{" "}
                                <Link href="/login" className="font-medium text-primary hover:underline">
                                    Inicia sesión
                                </Link>
                            </p>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
}