/**
 * Probabilidades porcentuales de premios de minijuegos (panel de beneficios).
 *
 * Misma representación que el backend (BackendCL minijuego.probability.ts):
 * unidades enteras de 0.001 %, de modo que 100 % = 100000 unidades. Se parsea
 * el texto del input sin pasar por punto flotante para que la suma sea exacta.
 * El backend vuelve a validar todo; esto es solo para guiar al administrador.
 */

export const PROBABILITY_DECIMALS = 3;
export const PROBABILITY_SCALE = 1000;
export const PROBABILITY_TOTAL_UNITS = 100 * PROBABILITY_SCALE;

const PERCENT_INPUT_RE = /^(\d{1,3})(?:\.(\d{1,3}))?$/;

/** Limpia lo que escribe el usuario: solo dígitos y un separador decimal. */
export function sanitizePercentInput(value: string): string {
    const normalized = value.replace(",", ".").replace(/[^\d.]/g, "");
    const [entero, ...resto] = normalized.split(".");
    if (resto.length === 0) return entero.slice(0, 3);
    return `${entero.slice(0, 3)}.${resto.join("").slice(0, PROBABILITY_DECIMALS)}`;
}

/**
 * "30" -> 30000, "0.3" -> 300, "0.001" -> 1.
 * Devuelve null si está vacío, no es numérico, tiene más de 3 decimales o
 * supera 100 %.
 */
export function parsePercentToUnits(value: string): number | null {
    const match = PERCENT_INPUT_RE.exec(value.trim());
    if (!match) return null;
    const entero = Number.parseInt(match[1], 10);
    const fraccion = Number.parseInt((match[2] ?? "").padEnd(PROBABILITY_DECIMALS, "0"), 10);
    const units = entero * PROBABILITY_SCALE + fraccion;
    return units <= PROBABILITY_TOTAL_UNITS ? units : null;
}

/** 300 -> "0.3", 100000 -> "100". */
export function formatUnits(units: number): string {
    const entero = Math.floor(units / PROBABILITY_SCALE);
    const fraccion = String(units % PROBABILITY_SCALE)
        .padStart(PROBABILITY_DECIMALS, "0")
        .replace(/0+$/, "");
    return fraccion ? `${entero}.${fraccion}` : String(entero);
}

/** Convierte el porcentaje numérico que manda el backend al texto del input. */
export function percentNumberToInput(value: number | undefined | null): string {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return "";
    return formatUnits(Math.round(value * PROBABILITY_SCALE));
}

/** Texto del input al número que espera el API (con hasta 3 decimales). */
export function percentInputToNumber(value: string): number | null {
    const units = parsePercentToUnits(value);
    return units == null ? null : units / PROBABILITY_SCALE;
}

export type ProbabilityTotalStatus = "valid" | "missing" | "exceeded" | "invalid";

export type ProbabilitySummary = {
    status: ProbabilityTotalStatus;
    totalUnits: number;
    message: string;
};

/** Mensaje para una probabilidad vacía, no numérica, con más de 3 decimales o mayor a 100 %. */
export const PROBABILITY_RANGE_MESSAGE =
    "entre 0 % y 100 %, con máximo 3 decimales";

/**
 * Suma las probabilidades configuradas. Los premios deshabilitados (por
 * ejemplo, un premio especial sin nombre) no deben incluirse en `values`.
 * 0 % es válido (el premio queda guardado pero nunca sale); vacío o no
 * numérico invalida la configuración.
 */
export function summarizeProbabilities(values: string[]): ProbabilitySummary {
    let totalUnits = 0;
    let invalid = false;
    for (const value of values) {
        const units = parsePercentToUnits(value);
        if (units == null) {
            invalid = true;
            continue;
        }
        totalUnits += units;
    }

    const total = formatUnits(totalUnits);
    if (invalid) {
        return {
            status: "invalid",
            totalUnits,
            message: `Cada premio necesita una probabilidad ${PROBABILITY_RANGE_MESSAGE}.`,
        };
    }
    if (totalUnits === PROBABILITY_TOTAL_UNITS) {
        return {
            status: "valid",
            totalUnits,
            message: `Probabilidad total: ${total}%. Configuración válida.`,
        };
    }
    if (totalUnits < PROBABILITY_TOTAL_UNITS) {
        return {
            status: "missing",
            totalUnits,
            message: `Probabilidad total: ${total}%. Falta asignar ${formatUnits(
                PROBABILITY_TOTAL_UNITS - totalUnits,
            )}%.`,
        };
    }
    return {
        status: "exceeded",
        totalUnits,
        message: `Probabilidad total: ${total}%. Excedes el límite por ${formatUnits(
            totalUnits - PROBABILITY_TOTAL_UNITS,
        )}%.`,
    };
}
