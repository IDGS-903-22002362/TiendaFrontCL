/**
 * Lógica pura de la lista dinámica de premios de puntos del panel de
 * minijuegos (agregar, eliminar, etiquetas por posición, elegibilidad,
 * avisos y vista previa de la ruleta). El backend vuelve a validar todo.
 */

import {
    MAX_BENEFICIO_PUNTOS_RECOMPENSA,
    MAX_MINIJUEGO_PREMIOS,
} from "@/lib/api/beneficios";
import {
    PROBABILITY_RANGE_MESSAGE,
    parsePercentToUnits,
    summarizeProbabilities,
} from "@/lib/minigame-probability";

/** Lo mínimo que la lógica necesita de una fila del editor. */
export type PointPrizeInput = {
    key: string;
    id?: string;
    nombre: string;
    tipo: string;
    valor: string;
    stock: string;
    /** Porcentaje como texto del input (p. ej. "0.3"). */
    probabilidad: string;
};

export type NewPointPrizeRow = {
    key: string;
    nombre: string;
    tipo: "points";
    valor: string;
    stock: string;
    probabilidad: string;
};

/**
 * Premio especial tal como lo edita el panel; stock es el máximo de ganadores
 * (texto del input). Al editar, los campos «Guardado» son lo que devolvió
 * GET ?admin=1 al cargar; al crear no vienen (o son null).
 */
export type SpecialPrizeInput = {
    nombre: string;
    probabilidad: string;
    stock: string;
    /** maxGanadores guardado del especial. */
    maxGanadoresGuardado?: number | null;
    /** stock guardado del especial: los ganadores que le quedan. */
    stockRestanteGuardado?: number | null;
};

/** Etiqueta visible por posición: «Premio 1», «Premio 2»… */
export function pointPrizeLabel(index: number): string {
    return `Premio ${index + 1}`;
}

let fallbackKeyCounter = 0;

/** Key de React única por fila. No es el id del premio: ese lo asigna el servidor. */
export function newPointPrizeKey(): string {
    const cryptoRef = (globalThis as { crypto?: Partial<Crypto> }).crypto;
    if (cryptoRef && typeof cryptoRef.randomUUID === "function") {
        return cryptoRef.randomUUID();
    }

    // crypto.randomUUID solo existe en contextos seguros (https o localhost).
    fallbackKeyCounter += 1;
    return `premio-${Date.now().toString(36)}-${fallbackKeyCounter.toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;
}

/** Fila nueva: puntos por completar y 0 % para no alterar la suma. */
export function createPointPrizeRow(key: string = newPointPrizeKey()): NewPointPrizeRow {
    return {
        key,
        nombre: "",
        tipo: "points",
        valor: "",
        stock: "",
        probabilidad: "0",
    };
}

/** Total de premios del minijuego: los de puntos más el especial si está habilitado. */
export function countMinijuegoPrizes(pointPrizes: number, especialHabilitado: boolean): number {
    return pointPrizes + (especialHabilitado ? 1 : 0);
}

export function canAddPointPrize(
    pointPrizes: number,
    especialHabilitado: boolean,
    max: number = MAX_MINIJUEGO_PREMIOS,
): boolean {
    return countMinijuegoPrizes(pointPrizes, especialHabilitado) < max;
}

export function addPointPrize<T>(premios: readonly T[], row: T): T[] {
    return [...premios, row];
}

/** Quita la fila por key; las demás conservan su id y su key. */
export function removePointPrize<T extends { key: string }>(
    premios: readonly T[],
    key: string,
): T[] {
    return premios.filter((premio) => premio.key !== key);
}

/** Un premio ya guardado (con id) se archiva al guardar, así que se confirma antes de quitarlo. */
export function pointPrizeRemovalNeedsConfirmation(premio: { id?: string }): boolean {
    return Boolean(premio.id?.trim());
}

/**
 * Los 10 premios iniciales se siembran solo la primera vez que se elige
 * «Minijuego» al crear. Nunca al editar, al borrar premios ni al cambiar el
 * tipo de juego.
 */
export function shouldSeedPointPrizes(state: {
    premiosPuntosIniciados: boolean;
    premios: readonly unknown[];
}): boolean {
    return !state.premiosPuntosIniciados && state.premios.length === 0;
}

function parseWholeNumber(value: string): number | null {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) {
        return null;
    }

    const parsed = Number.parseInt(trimmed, 10);
    return Number.isSafeInteger(parsed) ? parsed : null;
}

/** Stock vacío = ilimitado; 0 = agotado. */
function hasStock(stock: string): boolean {
    const parsed = parseWholeNumber(stock);
    return parsed == null || parsed !== 0;
}

/**
 * Mismo criterio que el servidor: puede salir si su probabilidad es mayor a
 * 0 % y su stock no es 0. Con 0 % queda guardado pero nunca sale.
 */
export function isPrizeEligible(premio: { probabilidad: string; stock: string }): boolean {
    const units = parsePercentToUnits(premio.probabilidad);
    return units != null && units > 0 && hasStock(premio.stock);
}

export function isSpecialPrizeEnabled(especial: { nombre: string }): boolean {
    return especial.nombre.trim().length > 0;
}

/**
 * Ganadores que le quedarán al especial al guardar (como texto de stock),
 * igual que resolveSpecialStock en el servidor: si el máximo editado es el
 * guardado, se conserva el restante guardado; si cambió, se le restan los que
 * ya ganaron (máximo guardado − restante guardado). Al crear, el restante es
 * el máximo. Un máximo que no es entero se devuelve tal cual (la validación
 * del formulario lo rechaza al guardar).
 */
export function specialPrizeRemainingStock(especial: SpecialPrizeInput): string {
    const maximo = parseWholeNumber(especial.stock);
    const maximoGuardado = especial.maxGanadoresGuardado;
    const restanteGuardado = especial.stockRestanteGuardado;
    if (maximo == null || maximoGuardado == null || restanteGuardado == null) {
        return especial.stock;
    }

    // El servidor solo sortea con stock > 0: un restante negativo es agotado.
    if (maximo === maximoGuardado) {
        return String(Math.max(0, restanteGuardado));
    }

    const ganados = Math.max(0, maximoGuardado - restanteGuardado);
    return String(Math.max(0, maximo - ganados));
}

/** Decide con los ganadores que le quedan al especial, no con el máximo. */
export function isSpecialPrizeEligible(especial: SpecialPrizeInput): boolean {
    return (
        isSpecialPrizeEnabled(especial) &&
        isPrizeEligible({
            probabilidad: especial.probabilidad,
            stock: specialPrizeRemainingStock(especial),
        })
    );
}

function formatPuntos(value: number): string {
    return value.toLocaleString("es-MX");
}

/**
 * Valida los premios de puntos en orden y devuelve el primer error con su
 * posición visible («Premio 3: …»), o null.
 */
export function validatePointPrizes(
    premios: readonly PointPrizeInput[],
    maxPuntos: number = MAX_BENEFICIO_PUNTOS_RECOMPENSA,
): string | null {
    for (let index = 0; index < premios.length; index += 1) {
        const premio = premios[index];
        const etiqueta = pointPrizeLabel(index);

        if (premio.tipo === "points") {
            const valor = parseWholeNumber(premio.valor);
            if (valor == null || valor < 1 || valor > maxPuntos) {
                return `${etiqueta}: indica los puntos, de 1 a ${formatPuntos(maxPuntos)}.`;
            }
        } else {
            if (!premio.nombre.trim()) {
                return `${etiqueta}: indica el nombre del premio.`;
            }
            if (premio.valor.trim() && parseWholeNumber(premio.valor) == null) {
                return `${etiqueta}: el valor del premio no es válido.`;
            }
        }

        if (parsePercentToUnits(premio.probabilidad) == null) {
            return `${etiqueta}: la probabilidad debe estar ${PROBABILITY_RANGE_MESSAGE}.`;
        }

        if (premio.stock.trim() && parseWholeNumber(premio.stock) == null) {
            return `${etiqueta}: el stock no es válido.`;
        }
    }

    return null;
}

/** Mínimo 1 premio y máximo MAX_MINIJUEGO_PREMIOS, contando el especial. */
export function validateMinijuegoPrizeCount(
    pointPrizes: number,
    especialHabilitado: boolean,
    max: number = MAX_MINIJUEGO_PREMIOS,
): string | null {
    const total = countMinijuegoPrizes(pointPrizes, especialHabilitado);
    if (total === 0) {
        return "Agrega al menos un premio.";
    }
    if (total > max) {
        return `Un minijuego puede tener máximo ${max} premios, incluido el especial (ahora hay ${total}).`;
    }
    return null;
}

export const SOLO_ESPECIAL_WARNING =
    "Solo el premio especial puede salir (los demás tienen 0 % o están agotados): cuando se agote, el minijuego dejará de tener premios disponibles.";

export const SIN_PREMIOS_DISPONIBLES_WARNING =
    "Ningún premio puede salir con esta configuración: el minijuego no tendrá premios disponibles.";

/**
 * Avisos no bloqueantes sobre los premios que pueden salir. Solo se calculan
 * con una suma válida; si no, el indicador del total ya explica el problema.
 */
export function minijuegoPrizeWarnings(
    premios: readonly { probabilidad: string; stock: string }[],
    especial: SpecialPrizeInput,
): string[] {
    const values = [
        ...premios.map((premio) => premio.probabilidad),
        ...(isSpecialPrizeEnabled(especial) ? [especial.probabilidad] : []),
    ];
    if (summarizeProbabilities(values).status !== "valid") {
        return [];
    }

    if (premios.some((premio) => isPrizeEligible(premio))) {
        return [];
    }

    return [
        isSpecialPrizeEligible(especial)
            ? SOLO_ESPECIAL_WARNING
            : SIN_PREMIOS_DISPONIBLES_WARNING,
    ];
}

export const SPECIAL_SEGMENT_KEY = "__premio-especial__";

export type RoulettePreviewSegment = {
    key: string;
    label: string;
    especial: boolean;
};

/**
 * Sectores de la vista previa: misma regla que el servidor, solo premios que
 * pueden salir (los de 0 % o agotados no aparecen). El especial va al final.
 */
export function roulettePreviewSegments(
    premios: readonly { key: string; valor: string; probabilidad: string; stock: string }[],
    especial: SpecialPrizeInput,
): RoulettePreviewSegment[] {
    const segments: RoulettePreviewSegment[] = premios
        .filter((premio) => isPrizeEligible(premio))
        .map((premio) => ({
            key: premio.key,
            label: premio.valor.trim() || "—",
            especial: false,
        }));

    if (isSpecialPrizeEligible(especial)) {
        segments.push({ key: SPECIAL_SEGMENT_KEY, label: "ESP", especial: true });
    }

    return segments;
}

/**
 * Índice de color de cada sector: nunca dos iguales juntos, tampoco el último
 * junto al primero (la ruleta es circular). Requiere al menos 3 colores.
 */
export function wheelSliceColorIndexes(count: number, paletteSize: number): number[] {
    const total = Math.max(0, Math.floor(count));
    const indexes = Array.from({ length: total }, (_, index) => index % paletteSize);

    if (total > 1 && indexes[total - 1] === indexes[0]) {
        const previous = indexes[total - 2];
        for (let candidate = 0; candidate < paletteSize; candidate += 1) {
            if (candidate !== previous && candidate !== indexes[0]) {
                indexes[total - 1] = candidate;
                break;
            }
        }
    }

    return indexes;
}
