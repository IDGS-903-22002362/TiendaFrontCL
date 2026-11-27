"use client";

import {
    type ChangeEvent,
    type CSSProperties,
    type ReactNode,
    type SyntheticEvent,
    useEffect,
    useId,
    useRef,
    useState,
} from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    ALLOWED_CARTA_IMAGE_TYPES,
    CARTA_IMAGE_RECOMMENDATION,
    MAX_CARTA_IMAGE_PIXELS,
    MAX_CARTA_IMAGE_SIZE_BYTES,
    MIN_CARTA_IMAGE_SIDE_PX,
} from "@/lib/api/beneficios";
import {
    cartaArtFit,
    cartaContainRect,
    cartaFocusTarget,
    cartaPreviewState,
    validateCartaImageDimensions,
} from "@/lib/beneficios/carta-coleccionable";
import { cn } from "@/lib/utils";

/** Archivo elegido que todavía no se sube (se sube al guardar). */
export type CartaPendiente = {
    previewUrl: string;
    nombre: string;
};

// Plantilla de la cara dorada exclusiva (1018×1416) que usa la app.
const CARD_WIDTH = 1018;
const CARD_HEIGHT = 1416;
const PANEL_RECT = { left: 45, top: 42, right: 972, bottom: 1372, radius: 36 };
/** Ventana ART: 872×591, donde va la ilustración. */
const ART_RECT = { left: 73, top: 128, right: 945, bottom: 719, radius: 32 };
/** Color con el que el servidor aplana la transparencia. */
const FLATTEN_COLOR = "#0D3326";
const MAX_SIZE_MB = Math.round(MAX_CARTA_IMAGE_SIZE_BYTES / (1024 * 1024));
const MAX_MEGAPIXELS = MAX_CARTA_IMAGE_PIXELS / 1_000_000;

function templateRectStyle(rect: typeof ART_RECT): CSSProperties {
    const width = rect.right - rect.left;
    const height = rect.bottom - rect.top;
    return {
        left: `${(rect.left / CARD_WIDTH) * 100}%`,
        top: `${(rect.top / CARD_HEIGHT) * 100}%`,
        width: `${(width / CARD_WIDTH) * 100}%`,
        height: `${(height / CARD_HEIGHT) * 100}%`,
        borderRadius: `${(rect.radius / width) * 100}% / ${(rect.radius / height) * 100}%`,
    };
}

type MedidaImagen = { width: number; height: number };

type CardArtProps =
    | {
          kind: "pendiente";
          src: string;
          /** Medidas reales de la imagen elegida, cuando ya cargó. */
          medida: MedidaImagen | null;
          onMeasured: (width: number, height: number) => void;
          onUnreadable: () => void;
      }
    | { kind: "guardada"; src: string };

function CardArt(props: CardArtProps) {
    const [failed, setFailed] = useState(false);

    if (props.kind === "guardada") {
        if (failed) {
            return (
                <div className="absolute inset-0 flex items-center justify-center p-2 text-center text-[10px] leading-tight text-white/85">
                    No se pudo cargar la carta guardada.
                </div>
            );
        }

        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={props.src}
                alt="Carta coleccionable guardada"
                className="absolute inset-0 h-full w-full object-cover"
                onError={() => setFailed(true)}
            />
        );
    }

    const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => {
        props.onMeasured(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight);
    };

    // Mientras no se conocen las medidas se muestra como contain.
    const fit = props.medida ? cartaArtFit(props.medida.width, props.medida.height) : "contain";
    const rect =
        props.medida && fit === "contain"
            ? cartaContainRect(props.medida.width, props.medida.height)
            : null;
    // La transparencia se ve sobre el verde con el que el servidor la aplana.
    const frameStyle: CSSProperties = rect
        ? {
              left: `${rect.left}%`,
              top: `${rect.top}%`,
              width: `${rect.width}%`,
              height: `${rect.height}%`,
              backgroundColor: FLATTEN_COLOR,
          }
        : { inset: 0 };

    // Igual que el servidor: con cover la imagen llena la ventana; con contain
    // va completa y centrada sobre la misma imagen difuminada y oscurecida.
    return (
        <>
            {fit === "contain" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={props.src}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full scale-110 object-cover"
                    style={{
                        filter: "blur(3px) brightness(0.55)",
                        backgroundColor: FLATTEN_COLOR,
                    }}
                />
            ) : null}
            <div className="absolute" style={frameStyle}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={props.src}
                    alt="Imagen elegida para la carta coleccionable"
                    className={cn(
                        "h-full w-full",
                        fit === "cover" ? "object-cover" : "object-contain",
                    )}
                    onLoad={handleLoad}
                    onError={props.onUnreadable}
                />
            </div>
        </>
    );
}

function CardMockup({
    premioNombre,
    children,
}: {
    premioNombre: string;
    children: ReactNode;
}) {
    const nombre = premioNombre.trim() || "Nombre del premio";

    return (
        <div
            className="relative aspect-[1018/1416] w-[200px] shrink-0 overflow-hidden rounded-[14px] border border-black/10 bg-[#E4DED0] shadow-sm"
        >
            <div
                className="absolute bg-[linear-gradient(160deg,#F4D98A_0%,#E2BC55_55%,#C9A227_100%)]"
                style={templateRectStyle(PANEL_RECT)}
                aria-hidden="true"
            />
            <div
                className="absolute overflow-hidden shadow-[inset_0_0_0_1px_rgba(0,0,0,0.25)]"
                style={{ ...templateRectStyle(ART_RECT), backgroundColor: FLATTEN_COLOR }}
            >
                {children}
            </div>
            <div
                className="absolute inset-x-[10%] top-[53%] flex flex-col items-center text-center text-[#14352C]"
                aria-hidden="true"
            >
                <span className="text-[6px] font-semibold uppercase tracking-[0.25em]">
                    Carta exclusiva
                </span>
                <span className="mt-1 line-clamp-2 text-[11px] font-extrabold uppercase leading-tight">
                    {nombre}
                </span>
                <span className="mt-3 text-[5px] font-semibold uppercase tracking-[0.25em]">
                    Otorgada a
                </span>
                <span className="text-[9px] font-bold">Nombre del ganador</span>
                <span className="mt-3 text-[5px] uppercase tracking-[0.15em]">
                    Ganado el 00/00/0000 · Folio ······
                </span>
            </div>
        </div>
    );
}

type CartaColeccionableFieldProps = {
    premioNombre: string;
    /** URL guardada que se conserva ('' si no hay o si se quitó). */
    savedUrl: string;
    /** URL con la que se cargó el premio ('' si no tenía carta). */
    initialUrl: string;
    pendiente: CartaPendiente | null;
    onSelect: (file: File) => void;
    onRemove: () => void;
    /** Vuelve a usar la carta guardada después de «Quitar». */
    onRestore: () => void;
    /** La imagen elegida no sirve (no se pudo leer o sus medidas no se aceptan). */
    onRejected: (message: string) => void;
    disabled?: boolean;
};

export function CartaColeccionableField({
    premioNombre,
    savedUrl,
    initialUrl,
    pendiente,
    onSelect,
    onRemove,
    onRestore,
    onRejected,
    disabled,
}: CartaColeccionableFieldProps) {
    const inputId = useId();
    const helpId = `${inputId}-ayuda`;
    const inputRef = useRef<HTMLInputElement>(null);
    const reemplazarRef = useRef<HTMLButtonElement>(null);
    const conservarRef = useRef<HTMLButtonElement>(null);
    const fieldRef = useRef<HTMLDivElement>(null);
    /**
     * Al elegir, quitar o conservar, el control activado se oculta o se
     * desmonta; el foco se mueve cuando ya se renderizó el estado nuevo.
     */
    const focusAfterRenderRef = useRef(false);
    const [medida, setMedida] = useState<(MedidaImagen & { src: string }) | null>(null);
    const state = cartaPreviewState({
        hasPendingFile: pendiente != null,
        savedUrl,
        initialUrl,
    });
    const showPreview = state === "pendiente" || state === "guardada";
    const pendingMeasure =
        pendiente && medida?.src === pendiente.previewUrl ? medida : null;
    const fit = pendingMeasure
        ? cartaArtFit(pendingMeasure.width, pendingMeasure.height)
        : "contain";

    useEffect(() => {
        if (!focusAfterRenderRef.current) {
            return;
        }

        focusAfterRenderRef.current = false;
        const target = cartaFocusTarget(state);
        const element =
            target === "reemplazar"
                ? reemplazarRef.current
                : target === "conservar"
                  ? conservarRef.current
                  : inputRef.current;
        element?.focus();
    }, [state, pendiente?.previewUrl, savedUrl]);

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        // Permite volver a elegir el mismo archivo después de quitarlo.
        event.target.value = "";
        if (file) {
            // El input visible se oculta en cuanto hay vista previa.
            focusAfterRenderRef.current = true;
            onSelect(file);
        }
    };

    /**
     * La imagen elegida no sirve y el campo vuelve al estado anterior. Si el
     * foco estaba en el campo (p. ej. en «Reemplazar», que puede desmontarse),
     * se reubica igual que al quitar.
     */
    const reject = (message: string) => {
        if (fieldRef.current?.contains(document.activeElement)) {
            focusAfterRenderRef.current = true;
        }
        onRejected(message);
    };

    const handleMeasured = (width: number, height: number) => {
        if (!pendiente) {
            return;
        }

        const error = validateCartaImageDimensions(width, height);
        if (error) {
            reject(error);
            return;
        }

        setMedida({ src: pendiente.previewUrl, width, height });
    };

    return (
        <div ref={fieldRef} className="space-y-3 sm:col-span-2">
            <div className="space-y-1">
                <Label htmlFor={inputId}>Carta coleccionable (opcional)</Label>
                <p id={helpId} className="text-xs leading-relaxed text-muted-foreground">
                    Es la ilustración de la carta exclusiva que recibe quien gane este premio (en la app,
                    Rewards → Cartas). No es la «Imagen (opcional)» del premio ni tiene que ver con el
                    minijuego «Elige una carta». Si no subes una, la carta usa el diseño predeterminado.
                    Si después la cambias o la quitas, quienes ya ganaron conservan la carta que recibieron.
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground/80">Recomendación:</span>{" "}
                    {CARTA_IMAGE_RECOMMENDATION}. JPG, PNG o WEBP de hasta {MAX_SIZE_MB} MB, al menos{" "}
                    {MIN_CARTA_IMAGE_SIDE_PX} px por lado y máximo {MAX_MEGAPIXELS} megapíxeles. Si la
                    proporción es otra, se muestra completa
                    sobre un fondo difuminado de la misma imagen, sin recortes ni deformación.
                </p>
            </div>

            <Input
                ref={inputRef}
                id={inputId}
                type="file"
                accept={ALLOWED_CARTA_IMAGE_TYPES.join(",")}
                onChange={handleChange}
                disabled={disabled}
                aria-describedby={helpId}
                className={cn(showPreview && "hidden")}
            />

            {showPreview ? (
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                    <figure className="shrink-0 space-y-1">
                        <CardMockup premioNombre={premioNombre}>
                            {state === "pendiente" && pendiente ? (
                                <CardArt
                                    key={pendiente.previewUrl}
                                    kind="pendiente"
                                    src={pendiente.previewUrl}
                                    medida={pendingMeasure}
                                    onMeasured={handleMeasured}
                                    onUnreadable={() =>
                                        reject(
                                            "No pudimos leer la imagen. Elige un archivo JPG, PNG o WEBP válido.",
                                        )
                                    }
                                />
                            ) : (
                                <CardArt key={savedUrl} kind="guardada" src={savedUrl} />
                            )}
                        </CardMockup>
                        <figcaption className="max-w-[200px] text-center text-[11px] leading-snug text-muted-foreground">
                            Vista previa aproximada. El marco, los textos y los efectos los pone la app.
                        </figcaption>
                    </figure>

                    <div className="w-full min-w-0 space-y-3 text-xs leading-relaxed text-muted-foreground">
                        {state === "pendiente" && pendiente ? (
                            <div className="space-y-1">
                                <p className="break-words font-medium text-foreground/80">
                                    Nueva imagen: {pendiente.nombre}
                                </p>
                                <p>Se sube al guardar el minijuego.</p>
                                {pendingMeasure ? (
                                    <p>
                                        Mide {pendingMeasure.width} × {pendingMeasure.height} px.{" "}
                                        {fit === "cover"
                                            ? "Su proporción casi coincide: llena la ventana de la carta."
                                            : "Su proporción no es 1.48:1: se verá completa sobre un fondo difuminado."}
                                    </p>
                                ) : null}
                                {initialUrl.trim() ? (
                                    <p>
                                        Reemplazará la carta guardada; quienes ya la ganaron conservan la anterior.
                                    </p>
                                ) : null}
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <p className="font-medium text-foreground/80">Carta guardada</p>
                                <p>
                                    Si la reemplazas o la quitas, el cambio se aplica al guardar y quienes ya la
                                    ganaron conservan la que recibieron.
                                </p>
                            </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                            <Button
                                ref={reemplazarRef}
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => inputRef.current?.click()}
                                disabled={disabled}
                                aria-label="Reemplazar la imagen de la carta coleccionable"
                            >
                                <RefreshCw aria-hidden="true" /> Reemplazar
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => {
                                    focusAfterRenderRef.current = true;
                                    onRemove();
                                }}
                                disabled={disabled}
                                aria-label="Quitar la carta coleccionable"
                            >
                                <Trash2 aria-hidden="true" /> Quitar
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}

            {state === "quitada" ? (
                <div
                    role="status"
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900"
                >
                    <span>
                        La carta guardada se quitará al guardar y se usará el diseño predeterminado. Quienes ya
                        la ganaron conservan su carta.
                    </span>
                    <Button
                        ref={conservarRef}
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto px-0 text-xs text-amber-900"
                        onClick={() => {
                            focusAfterRenderRef.current = true;
                            onRestore();
                        }}
                        disabled={disabled}
                    >
                        Conservar la carta guardada
                    </Button>
                </div>
            ) : null}
        </div>
    );
}
