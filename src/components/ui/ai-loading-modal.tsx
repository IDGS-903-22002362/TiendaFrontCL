"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Sparkles, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface AILoadingModalProps {
    isOpen: boolean;
    onOpenChange?: (open: boolean) => void;
    progress: number; // 0-100
    mode: "ai" | "normal";
    status?: string; // mensaje opcional (ej: "Generando imagen 2 de 5")
    title?: string;
}

export function AILoadingModal({
    isOpen,
    onOpenChange,
    progress,
    mode,
    status,
    title = "Procesando...",
}: AILoadingModalProps) {
    // Pequeña animación para que la barra no sea tan estática
    const [displayProgress, setDisplayProgress] = useState(0);

    useEffect(() => {
        // Suavizar la actualización de la barra (opcional)
        const timeout = setTimeout(() => {
            setDisplayProgress(progress);
        }, 50);
        return () => clearTimeout(timeout);
    }, [progress]);

    // No permitir cerrar manualmente mientras se está generando
    const handleOpenChange = (open: boolean) => {
        if (!open && progress < 100) return; // Bloquear cierre si no ha terminado
        onOpenChange?.(open);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md" hideClose={progress < 100}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {mode === "ai" ? (
                            <>
                                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                                <span>Generando con IA</span>
                            </>
                        ) : (
                            title
                        )}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Barra de progreso con estilo según modo */}
                    <div className="relative">
                        <Progress
                            value={displayProgress}
                            className={cn(
                                "h-3 w-full transition-all",
                                mode === "ai" && "bg-gradient-to-r from-purple-200 via-pink-200 to-blue-200"
                            )}
                            // Podemos personalizar el indicador con CSS adicional
                            indicatorClassName={cn(
                                mode === "ai" &&
                                "bg-gradient-to-r from-purple-600 via-pink-500 to-blue-600 animate-pulse"
                            )}
                        />
                        {mode === "ai" && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="h-3 w-full overflow-hidden rounded-full">
                                    <div
                                        className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                        style={{
                                            transform: `translateX(${displayProgress - 100}%)`,
                                            transition: "transform 0.3s ease",
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Mensaje de estado */}
                    {status && (
                        <p className="text-sm text-center text-muted-foreground flex items-center justify-center gap-2">
                            {mode === "ai" && <Loader2 className="h-4 w-4 animate-spin" />}
                            {status}
                        </p>
                    )}

                    {/* Porcentaje numérico (opcional) */}
                    <p className="text-xs text-center text-muted-foreground">
                        {Math.round(progress)}%
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}