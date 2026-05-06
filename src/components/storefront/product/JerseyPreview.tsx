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
            {/* Imagen de fondo (jersey desde Firebase) */}
            <Image
                src={imageUrl}
                alt="Vista previa de jersey personalizado"
                fill
                className="object-cover"
                sizes="320px"
                priority
            />

            {/* Contenedor para nombre y número - posicionado sobre el jersey */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                {/* Nombre del jugador */}
                <div
                    className="text-center font-black text-white drop-shadow-lg"
                    style={{
                        fontSize: "clamp(1.25rem, 5vw, 2rem)",
                        fontFamily: "'Arial Black', 'Impact', system-ui, sans-serif",
                        fontWeight: 900,
                        letterSpacing: "0.08em",
                        textShadow: "2px 2px 0 rgba(0,0,0,0.6), -1px -1px 0 rgba(0,0,0,0.3)",
                        lineHeight: "1",
                        marginBottom: "0.5rem",
                        textTransform: "uppercase",
                        maxWidth: "90%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    {name || "TU NOMBRE"}
                </div>

                {/* Número grande */}
                <div
                    className="text-center font-black text-white drop-shadow-lg"
                    style={{
                        fontSize: "clamp(3rem, 14vw, 6rem)",
                        fontFamily: "'Arial Black', 'Impact', system-ui, sans-serif",
                        fontWeight: 900,
                        textShadow: "3px 3px 0 rgba(0,0,0,0.7), -2px -2px 0 rgba(0,0,0,0.4)",
                        lineHeight: "0.9",
                    }}
                >
                    {number || "00"}
                </div>
            </div>

            {/* Gradiente sutil para mejorar legibilidad (opcional) */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: "radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.1) 100%)",
                }}
            />
        </div>
    );
}