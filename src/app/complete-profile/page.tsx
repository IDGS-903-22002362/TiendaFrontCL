"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Calendar, Phone, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { completeUserProfile } from "@/lib/api/users";
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
import { Breadcrumbs } from "@/components/storefront/shared/breadcrumbs";

export default function CompleteProfilePage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading, completeProfile: updateProfile } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [form, setForm] = useState({
        nombre: "",
        telefono: "",
        fechaNacimiento: "",
        genero: "",
    });

    // Redirigir si no está autenticado o si el perfil ya está completo
    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated) {
                router.replace("/login?redirect=/complete-profile");
                return;
            }

            if (user?.perfilCompleto) {
                router.replace("/");
                return;
            }

            // Pre-llenar con datos existentes si los hay
            setForm({
                nombre: user?.nombre || "",
                telefono: user?.telefono || "",
                fechaNacimiento: user?.fechaNacimiento || "",
                genero: user?.genero || "",
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, isLoading, user?.perfilCompleto, router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const normalizeGenero = (genero: string): string | undefined => {
        if (!genero) return undefined;
        const generoMap: Record<string, string> = {
            "M": "masculino",
            "F": "femenino",
            "O": "otro",
            "masculino": "masculino",
            "femenino": "femenino",
            "otro": "otro",
        };
        return generoMap[genero.toUpperCase()] || genero;
    };

    const normalizeFechaNacimiento = (fecha: string): string | undefined => {
        if (!fecha) return undefined;
        // Extraer solo los primeros 10 caracteres (YYYY-MM-DD)
        // Esto maneja fechas en formato: YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss.SSS
        return fecha.substring(0, 10);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validar que al menos el teléfono se complete
        if (!form.telefono.trim()) {
            toast({
                variant: "destructive",
                title: "Datos incompletos",
                description: "Por favor, ingresa tu teléfono.",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            // Enviar datos al backend
            await updateProfile({
                nombre: form.nombre.trim() || undefined,
                telefono: form.telefono.trim(),
                fechaNacimiento: form.fechaNacimiento ? normalizeFechaNacimiento(form.fechaNacimiento) : undefined,
                genero: normalizeGenero(form.genero) || undefined,
            });

            toast({
                title: "¡Perfil completado!",
                description: "Tus datos han sido guardados correctamente.",
            });

            // Redirigir al home
            setTimeout(() => {
                router.push("/");
            }, 1500);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al completar perfil",
                description: getApiErrorMessage(error),
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSkip = () => {
        // Permitir saltar por ahora, pero el usuario puede completar después
        router.push("/");
    };

    if (isLoading) {
        return (
            <div className="container flex min-h-[60vh] items-center justify-center py-10 text-center text-muted-foreground">
                Cargando tu perfil...
            </div>
        );
    }

    if (!isAuthenticated || user?.perfilCompleto) {
        return null;
    }

    return (
        <div className="container py-5 md:py-8">
            <div className="mb-6 space-y-3">
                <Breadcrumbs
                    items={[
                        { label: "Inicio", href: "/" },
                        { label: "Completar perfil" },
                    ]}
                />
                <div className="flex items-center gap-3">
                    <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full border border-border"
                    >
                        <Link href="/">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80">
                            Perfil
                        </p>
                        <h1 className="mt-1 font-headline text-3xl font-semibold uppercase leading-none">
                            Completa tu perfil
                        </h1>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-2xl">
                <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
                    {/* Panel de información */}
                    <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-primary/10 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="rounded-full bg-primary/20 p-3">
                                <CheckCircle className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-foreground">¡Hola, {user?.nombre || "Usuario"}!</h2>
                                <p className="text-sm text-muted-foreground">Bienvenido a Club León</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="rounded-lg bg-background/50 p-4 border border-border/50">
                                <p className="text-xs font-medium uppercase text-muted-foreground mb-2">
                                    ✓ Datos verificados
                                </p>
                                <p className="text-sm font-medium">{user?.email}</p>
                            </div>

                            <p className="text-sm leading-relaxed text-muted-foreground">
                                Para aprovechar al máximo los beneficios de Club León, completa tu perfil con
                                información adicional. Esto nos ayuda a personalizar tu experiencia.
                            </p>

                            <div className="space-y-3 bg-background/50 rounded-lg p-4 border border-border/50">
                                <div className="flex items-start gap-3">
                                    <Phone className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs font-medium text-primary">Teléfono</p>
                                        <p className="text-xs text-muted-foreground">
                                            Para notificaciones de pedidos
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Calendar className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs font-medium text-primary">Fecha de nacimiento</p>
                                        <p className="text-xs text-muted-foreground">
                                            Para ofertas personalizadas
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Formulario */}
                    <Card className="rounded-2xl border-border shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Información personal
                            </CardTitle>
                            <CardDescription>
                                Completa los campos para personalizar tu experiencia
                            </CardDescription>
                        </CardHeader>
                        <form onSubmit={handleSubmit}>
                            <CardContent className="space-y-5">
                                {/* Nombre */}
                                <div className="space-y-2">
                                    <label htmlFor="nombre" className="text-sm font-medium text-foreground">
                                        Nombre *
                                    </label>
                                    <Input
                                        id="nombre"
                                        name="nombre"
                                        type="text"
                                        placeholder="Tu nombre completo"
                                        value={form.nombre}
                                        onChange={handleChange}
                                        required
                                        className="h-11 rounded-lg"
                                        disabled={isSubmitting}
                                        autoComplete="name"
                                    />
                                </div>

                                {/* Teléfono */}
                                <div className="space-y-2">
                                    <label htmlFor="telefono" className="text-sm font-medium text-foreground">
                                        Teléfono *
                                    </label>
                                    <Input
                                        id="telefono"
                                        name="telefono"
                                        type="tel"
                                        placeholder="4771234567"
                                        value={form.telefono}
                                        onChange={(e) => {
                                            // Bloquea letras y símbolos antes de actualizar el estado
                                            e.target.value = e.target.value.replace(/[^0-9]/g, '');
                                            handleChange(e);
                                        }}
                                        required
                                        className="h-11 rounded-lg"
                                        inputMode="numeric"
                                        disabled={isSubmitting}
                                        autoComplete="tel"
                                        maxLength={10}
                                        pattern="[0-9]{10}"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Incluye código de país
                                    </p>
                                </div>

                                {/* Fecha de Nacimiento */}
                                <div className="space-y-2">
                                    <label htmlFor="fechaNacimiento" className="text-sm font-medium text-foreground">
                                        Fecha de nacimiento (opcional)
                                    </label>
                                    <Input
                                        id="fechaNacimiento"
                                        name="fechaNacimiento"
                                        type="date"
                                        value={form.fechaNacimiento}
                                        onChange={handleChange}
                                        className="h-11 rounded-lg"
                                        disabled={isSubmitting}
                                    />
                                </div>

                                {/* Género */}
                                <div className="space-y-2">
                                    <label htmlFor="genero" className="text-sm font-medium text-foreground">
                                        Género (opcional)
                                    </label>
                                    <select
                                        id="genero"
                                        name="genero"
                                        value={form.genero}
                                        onChange={handleChange}
                                        className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                                        disabled={isSubmitting}
                                    >
                                        <option value="">Selecciona tu género</option>
                                        <option value="masculino">Masculino</option>
                                        <option value="femenino">Femenino</option>
                                        <option value="otro">Otro</option>
                                    </select>
                                </div>

                                <div className="rounded-lg bg-blue-50 p-4 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-800/30">
                                    <p className="text-xs text-blue-700 dark:text-blue-200 leading-relaxed">
                                        Tus datos están protegidos y no serán compartidos con terceros sin tu consentimiento.
                                    </p>
                                </div>
                            </CardContent>

                            <div className="flex flex-col gap-3 px-6 pb-6">
                                <Button
                                    type="submit"
                                    className="h-11 rounded-lg bg-primary font-semibold hover:bg-primary/90"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? "Guardando..." : "Guardar y continuar"}
                                </Button>

                            </div>
                        </form>
                    </Card>
                </div>
            </div>
        </div>
    );
}