"use client";

import Image from "next/image";

interface JerseyPreviewProps {
    imageUrl: string;
    name: string;
    number: string;
}

export function JerseyPreview({ imageUrl, name, number }: JerseyPreviewProps) {
    return (
        <div className="relative w-full max-w-[320px] mx-auto aspect-[4/5] bg-[#f4f4f0] rounded-2xl overflow-hidden border border-black/14 shadow-sm">
            {/* 1. Imagen de fondo */}
            <Image
                src={imageUrl}
                alt="Vista previa"
                fill
                className="object-cover"
                sizes="320px"
                priority
            />

            {/* 2. Gradiente (Movido aquí para que esté DEBAJO del texto) */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: "radial-gradient(circle at center, transparent 20%, rgba(0,0,0,0.15) 100%)",
                }}
            />

            {/* 3. Contenedor de Texto */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-1">
                {/* Número GRANDE */}
                <div
                    className="text-black"
                    style={{
                        fontSize: "clamp(0.1rem, 14vw, 5rem)",
                        fontFamily: "'Arial Black', sans-serif",
                        lineHeight: "2.5",
                        transform: "scaleY(1.55)", // Estira el número un 35% verticalmente
                        transformOrigin: "center", // Asegura que se estire desde el centro
                    }}
                >
                    {number || "00"}
                </div>

                {/* Nombre ARRIBA del número (estilo clásico de jersey) */}
                <div
                    className="text-black"
                    style={{
                        fontSize: "clamp(1.1rem, 2vw, 1rem)",
                        fontFamily: "'Arial Italic', sans-serif",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        marginBottom: "0.2rem",
                        transform: "translateX(4px)"
                    }}
                >
                    {name || "TU NOMBRE"}
                </div>


            </div>
        </div>
    );
}