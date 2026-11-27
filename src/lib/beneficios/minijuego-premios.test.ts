import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_MINIJUEGO_PREMIOS } from "@/lib/api/beneficios";
import { summarizeProbabilities } from "@/lib/minigame-probability";
import {
    SIN_PREMIOS_DISPONIBLES_WARNING,
    SOLO_ESPECIAL_WARNING,
    SPECIAL_SEGMENT_KEY,
    addPointPrize,
    canAddPointPrize,
    countMinijuegoPrizes,
    createPointPrizeRow,
    isPrizeEligible,
    isSpecialPrizeEligible,
    minijuegoPrizeWarnings,
    newPointPrizeKey,
    pointPrizeLabel,
    pointPrizeRemovalNeedsConfirmation,
    removePointPrize,
    roulettePreviewSegments,
    shouldSeedPointPrizes,
    specialPrizeRemainingStock,
    validateMinijuegoPrizeCount,
    validatePointPrizes,
    wheelSliceColorIndexes,
    type PointPrizeInput,
    type SpecialPrizeInput,
} from "./minijuego-premios";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function premio(
    key: string,
    valor: string,
    probabilidad: string,
    extra: Partial<PointPrizeInput> = {},
): PointPrizeInput {
    return {
        key,
        nombre: valor ? `${valor} puntos` : "",
        tipo: "points",
        valor,
        stock: "",
        probabilidad,
        ...extra,
    };
}

const especialOff = { nombre: "", probabilidad: "0.3", stock: "1" };

describe("filas nuevas de premios de puntos", () => {
    it("una fila nueva tiene los puntos vacíos y 0 % para no alterar la suma", () => {
        const row = createPointPrizeRow("k-1");
        assert.deepEqual(row, {
            key: "k-1",
            nombre: "",
            tipo: "points",
            valor: "",
            stock: "",
            probabilidad: "0",
        });

        const before = [premio("a", "10", "60"), premio("b", "20", "40")];
        const after = addPointPrize(before, row);
        assert.equal(after.length, 3);
        assert.equal(
            summarizeProbabilities(after.map((item) => item.probabilidad)).totalUnits,
            100_000,
        );
        assert.notEqual(after, before, "no muta la lista original");
        assert.equal(before.length, 2);
    });

    it("cada fila nueva recibe una key única de crypto.randomUUID()", () => {
        const keys = new Set(Array.from({ length: 500 }, () => createPointPrizeRow().key));
        assert.equal(keys.size, 500);
        for (const key of keys) {
            assert.match(key, UUID_RE);
        }
    });

    it("sin crypto.randomUUID (http sin TLS) sigue generando keys únicas", () => {
        const original = Object.getOwnPropertyDescriptor(globalThis, "crypto");
        assert.ok(original, "Node expone globalThis.crypto");
        Object.defineProperty(globalThis, "crypto", {
            value: {},
            configurable: true,
            writable: true,
        });
        try {
            const keys = new Set(Array.from({ length: 200 }, () => newPointPrizeKey()));
            assert.equal(keys.size, 200);
            for (const key of keys) {
                assert.match(key, /^premio-/);
            }
        } finally {
            Object.defineProperty(globalThis, "crypto", original);
        }
    });
});

describe("eliminar y renumerar", () => {
    it("quita solo la fila indicada y las demás conservan su id y su key", () => {
        const premios = [
            premio("id-a", "10", "50", { id: "id-a" }),
            premio("k-nueva", "15", "0"),
            premio("id-c", "30", "50", { id: "id-c" }),
        ];

        const result = removePointPrize(premios, "k-nueva");
        assert.deepEqual(
            result.map((item) => [item.key, item.id]),
            [
                ["id-a", "id-a"],
                ["id-c", "id-c"],
            ],
        );
        assert.equal(premios.length, 3, "no muta la lista original");
    });

    it("las etiquetas «Premio N» se recalculan por posición sin tocar los ids", () => {
        const premios = [
            premio("id-a", "10", "50", { id: "id-a" }),
            premio("id-b", "20", "0", { id: "id-b" }),
            premio("id-c", "30", "50", { id: "id-c" }),
        ];

        const result = removePointPrize(premios, "id-a");
        assert.deepEqual(
            result.map((item, index) => [pointPrizeLabel(index), item.id]),
            [
                ["Premio 1", "id-b"],
                ["Premio 2", "id-c"],
            ],
        );
    });

    it("una key inexistente no cambia la lista", () => {
        const premios = [premio("a", "10", "100")];
        assert.deepEqual(removePointPrize(premios, "zzz"), premios);
    });

    it("solo los premios guardados (con id) piden confirmación", () => {
        assert.equal(pointPrizeRemovalNeedsConfirmation({ id: "abc" }), true);
        assert.equal(pointPrizeRemovalNeedsConfirmation({}), false);
        assert.equal(pointPrizeRemovalNeedsConfirmation({ id: "  " }), false);
    });
});

describe("tope de premios", () => {
    it("el tope compartido es 50 e incluye el especial", () => {
        assert.equal(MAX_MINIJUEGO_PREMIOS, 50);
        assert.equal(countMinijuegoPrizes(49, true), 50);
        assert.equal(canAddPointPrize(49, true), false);
        assert.equal(canAddPointPrize(49, false), true);
        assert.equal(canAddPointPrize(50, false), false);
        assert.equal(canAddPointPrize(0, false), true);
    });

    it("valida mínimo 1 y máximo 50 premios", () => {
        assert.equal(validateMinijuegoPrizeCount(0, false), "Agrega al menos un premio.");
        assert.equal(validateMinijuegoPrizeCount(0, true), null, "solo el especial");
        assert.equal(validateMinijuegoPrizeCount(1, false), null);
        assert.equal(validateMinijuegoPrizeCount(49, true), null);
        assert.equal(validateMinijuegoPrizeCount(50, false), null);
        assert.equal(
            validateMinijuegoPrizeCount(50, true),
            "Un minijuego puede tener máximo 50 premios, incluido el especial (ahora hay 51).",
        );
    });
});

describe("siembra de los 10 premios iniciales", () => {
    it("siembra solo la primera vez al crear", () => {
        assert.equal(shouldSeedPointPrizes({ premiosPuntosIniciados: false, premios: [] }), true);
    });

    it("no vuelve a sembrar al borrar todos los premios", () => {
        assert.equal(shouldSeedPointPrizes({ premiosPuntosIniciados: true, premios: [] }), false);
    });

    it("no siembra si ya hay premios", () => {
        assert.equal(
            shouldSeedPointPrizes({ premiosPuntosIniciados: false, premios: [premio("a", "10", "100")] }),
            false,
        );
    });
});

describe("validación con posición", () => {
    const validos = [
        premio("a", "10", "60"),
        premio("b", "20", "0"),
        premio("c", "30", "40"),
    ];

    it("acepta 0 % y una lista completa", () => {
        assert.equal(validatePointPrizes(validos), null);
    });

    it("pide los puntos con la posición del premio", () => {
        const sinPuntos = [...validos.slice(0, 2), premio("c", "", "40")];
        assert.equal(
            validatePointPrizes(sinPuntos),
            "Premio 3: indica los puntos, de 1 a 10,000.",
        );
        assert.equal(
            validatePointPrizes([premio("a", "0", "100")]),
            "Premio 1: indica los puntos, de 1 a 10,000.",
        );
        assert.equal(
            validatePointPrizes([premio("a", "10001", "100")]),
            "Premio 1: indica los puntos, de 1 a 10,000.",
        );
        assert.equal(validatePointPrizes([premio("a", "10000", "100")]), null);
    });

    it("una probabilidad vacía o con más de 3 decimales es inválida; 0 no", () => {
        assert.equal(
            validatePointPrizes([premio("a", "10", "100"), premio("b", "20", "")]),
            "Premio 2: la probabilidad debe estar entre 0 % y 100 %, con máximo 3 decimales.",
        );
        assert.equal(
            validatePointPrizes([premio("a", "10", "0.0001")]),
            "Premio 1: la probabilidad debe estar entre 0 % y 100 %, con máximo 3 decimales.",
        );
        assert.equal(validatePointPrizes([premio("a", "10", "0")]), null);
    });

    it("valida stock y nombre de premios que no son de puntos", () => {
        assert.equal(
            validatePointPrizes([premio("a", "10", "50"), premio("b", "20", "50", { stock: "x" })]),
            "Premio 2: el stock no es válido.",
        );
        assert.equal(
            validatePointPrizes([premio("a", "", "100", { tipo: "coupon", nombre: " " })]),
            "Premio 1: indica el nombre del premio.",
        );
        assert.equal(
            validatePointPrizes([premio("a", "", "100", { tipo: "coupon", nombre: "Cupón" })]),
            null,
        );
    });
});

describe("elegibilidad y avisos", () => {
    it("solo puede salir con probabilidad > 0 y stock distinto de 0", () => {
        assert.equal(isPrizeEligible({ probabilidad: "0", stock: "" }), false);
        assert.equal(isPrizeEligible({ probabilidad: "0.000", stock: "" }), false);
        assert.equal(isPrizeEligible({ probabilidad: "", stock: "" }), false);
        assert.equal(isPrizeEligible({ probabilidad: "0.001", stock: "" }), true);
        assert.equal(isPrizeEligible({ probabilidad: "10", stock: "0" }), false);
        assert.equal(isPrizeEligible({ probabilidad: "10", stock: "3" }), true);
        assert.equal(isSpecialPrizeEligible({ nombre: "", probabilidad: "10", stock: "1" }), false);
        assert.equal(isSpecialPrizeEligible({ nombre: "Boletos", probabilidad: "10", stock: "0" }), false);
        assert.equal(isSpecialPrizeEligible({ nombre: "Boletos", probabilidad: "10", stock: "1" }), true);
    });

    it("avisa sin bloquear si solo el especial tiene más de 0 %", () => {
        const premios = [premio("a", "10", "0"), premio("b", "20", "0")];
        assert.deepEqual(
            minijuegoPrizeWarnings(premios, { nombre: "Boletos", probabilidad: "100", stock: "2" }),
            [SOLO_ESPECIAL_WARNING],
        );
        assert.deepEqual(
            minijuegoPrizeWarnings([premio("a", "10", "99.7", { stock: "0" })], {
                nombre: "Boletos",
                probabilidad: "0.3",
                stock: "1",
            }),
            [SOLO_ESPECIAL_WARNING],
            "un premio de puntos agotado tampoco puede salir",
        );
        assert.match(SOLO_ESPECIAL_WARNING, /cuando se agote, el minijuego dejará de tener premios disponibles/);
    });

    it("avisa si ningún premio puede salir", () => {
        assert.deepEqual(
            minijuegoPrizeWarnings([premio("a", "10", "0")], {
                nombre: "Boletos",
                probabilidad: "100",
                stock: "0",
            }),
            [SIN_PREMIOS_DISPONIBLES_WARNING],
        );
        assert.deepEqual(
            minijuegoPrizeWarnings([premio("a", "10", "100", { stock: "0" })], especialOff),
            [SIN_PREMIOS_DISPONIBLES_WARNING],
        );
    });

    it("no avisa si hay premios de puntos que pueden salir o si la suma no es válida", () => {
        assert.deepEqual(
            minijuegoPrizeWarnings([premio("a", "10", "99.7")], {
                nombre: "Boletos",
                probabilidad: "0.3",
                stock: "1",
            }),
            [],
        );
        assert.deepEqual(minijuegoPrizeWarnings([premio("a", "10", "0")], especialOff), []);
    });
});

describe("vista previa de la ruleta", () => {
    it("oculta premios con 0 %, vacíos o agotados y usa la key de cada premio", () => {
        const segments = roulettePreviewSegments(
            [
                premio("a", "10", "50"),
                premio("b", "20", "0"),
                premio("c", "30", ""),
                premio("d", "40", "49.7", { stock: "0" }),
                premio("e", "", "49.7"),
            ],
            { nombre: "Boletos", probabilidad: "0.3", stock: "1" },
        );
        assert.deepEqual(segments, [
            { key: "a", label: "10", especial: false },
            { key: "e", label: "—", especial: false },
            { key: SPECIAL_SEGMENT_KEY, label: "ESP", especial: true },
        ]);
    });

    it("el especial no aparece sin nombre, con 0 % o agotado", () => {
        const premios = [premio("a", "10", "100")];
        for (const especial of [
            { nombre: "", probabilidad: "0.3", stock: "1" },
            { nombre: "Boletos", probabilidad: "0", stock: "1" },
            { nombre: "Boletos", probabilidad: "0.3", stock: "0" },
        ]) {
            assert.deepEqual(
                roulettePreviewSegments(premios, especial).map((segment) => segment.key),
                ["a"],
            );
        }
    });

    it("puede quedar con un solo sector o vacía", () => {
        assert.equal(roulettePreviewSegments([premio("a", "10", "100")], especialOff).length, 1);
        assert.equal(roulettePreviewSegments([premio("a", "10", "0")], especialOff).length, 0);
    });

    it("nunca pinta dos sectores juntos del mismo color, tampoco el último con el primero", () => {
        assert.deepEqual(wheelSliceColorIndexes(0, 11), []);
        assert.deepEqual(wheelSliceColorIndexes(1, 11), [0]);
        for (const paletteSize of [3, 4, 10, 11]) {
            for (let count = 2; count <= 60; count += 1) {
                const indexes = wheelSliceColorIndexes(count, paletteSize);
                assert.equal(indexes.length, count);
                for (let index = 0; index < count; index += 1) {
                    const next = indexes[(index + 1) % count];
                    assert.notEqual(
                        indexes[index],
                        next,
                        `paleta ${paletteSize}, ${count} sectores, sector ${index + 1}`,
                    );
                    assert.ok(indexes[index] >= 0 && indexes[index] < paletteSize);
                }
            }
        }
    });
});

/**
 * Copia de resolveSpecialStock (BackendCL-integracion/functions/src/services/
 * minijuego.logic.ts) para comparar. awarded son los ganadores de ese premio.
 */
function resolveSpecialStockServidor(input: {
    requestedMax: number;
    previousMax: number | null;
    previousStock: number | null;
    awarded: number;
}): number {
    const awarded = Math.max(0, input.awarded);
    if (
        input.previousMax != null &&
        input.requestedMax === input.previousMax &&
        input.previousStock != null
    ) {
        return input.previousStock;
    }
    if (
        input.previousMax == null &&
        input.previousStock != null &&
        input.requestedMax === input.previousStock
    ) {
        return input.previousStock;
    }
    return Math.max(0, input.requestedMax - awarded);
}

describe("stock restante del premio especial", () => {
    const especial = (extra: Partial<SpecialPrizeInput> = {}): SpecialPrizeInput => ({
        nombre: "Boletos",
        probabilidad: "100",
        stock: "2",
        ...extra,
    });
    /** Máximo 2 guardado y ya lo ganaron 2 personas: el servidor tiene stock 0. */
    const agotadoGuardado = { maxGanadoresGuardado: 2, stockRestanteGuardado: 0 };

    it("al crear, el restante es el máximo", () => {
        assert.equal(specialPrizeRemainingStock(especial()), "2");
        assert.equal(
            specialPrizeRemainingStock(
                especial({ maxGanadoresGuardado: null, stockRestanteGuardado: null }),
            ),
            "2",
        );
        assert.equal(specialPrizeRemainingStock(especial({ stock: "0" })), "0");
    });

    it("si el máximo no cambia, usa el restante guardado", () => {
        assert.equal(specialPrizeRemainingStock(especial(agotadoGuardado)), "0");
        assert.equal(
            specialPrizeRemainingStock(
                especial({ maxGanadoresGuardado: 2, stockRestanteGuardado: 1 }),
            ),
            "1",
        );
        assert.equal(
            specialPrizeRemainingStock(especial({ stock: " 2 ", ...agotadoGuardado })),
            "0",
        );
    });

    it("si el máximo cambia, descuenta a los que ya ganaron (máximo guardado − restante guardado)", () => {
        assert.equal(specialPrizeRemainingStock(especial({ stock: "5", ...agotadoGuardado })), "3");
        assert.equal(specialPrizeRemainingStock(especial({ stock: "1", ...agotadoGuardado })), "0");
        const ganoUnoDeCinco = { maxGanadoresGuardado: 5, stockRestanteGuardado: 4 };
        assert.equal(specialPrizeRemainingStock(especial({ stock: "3", ...ganoUnoDeCinco })), "2");
        assert.equal(specialPrizeRemainingStock(especial({ stock: "0", ...ganoUnoDeCinco })), "0");
    });

    it("da el mismo stock que resolveSpecialStock del servidor al guardar", () => {
        for (let maximoGuardado = 0; maximoGuardado <= 6; maximoGuardado += 1) {
            for (let ganados = 0; ganados <= maximoGuardado; ganados += 1) {
                const restanteGuardado = maximoGuardado - ganados;
                for (let maximo = 0; maximo <= 9; maximo += 1) {
                    assert.equal(
                        specialPrizeRemainingStock(
                            especial({
                                stock: String(maximo),
                                maxGanadoresGuardado: maximoGuardado,
                                stockRestanteGuardado: restanteGuardado,
                            }),
                        ),
                        String(
                            resolveSpecialStockServidor({
                                requestedMax: maximo,
                                previousMax: maximoGuardado,
                                previousStock: restanteGuardado,
                                awarded: ganados,
                            }),
                        ),
                        `máximo ${maximoGuardado} → ${maximo}, ya ganaron ${ganados}`,
                    );
                }
            }
        }

        // Especial nuevo: el servidor no descuenta a nadie.
        for (let maximo = 0; maximo <= 9; maximo += 1) {
            assert.equal(
                specialPrizeRemainingStock(especial({ stock: String(maximo) })),
                String(
                    resolveSpecialStockServidor({
                        requestedMax: maximo,
                        previousMax: null,
                        previousStock: null,
                        awarded: 0,
                    }),
                ),
            );
        }
    });

    it("sin maxGanadores guardado (registro antiguo) usa el máximo del input, que se cargó del stock", () => {
        assert.equal(
            specialPrizeRemainingStock(
                especial({ stock: "3", maxGanadoresGuardado: null, stockRestanteGuardado: 3 }),
            ),
            "3",
        );
    });

    it("un restante guardado negativo cuenta como agotado (el servidor sortea con stock > 0)", () => {
        assert.equal(
            specialPrizeRemainingStock(
                especial({ maxGanadoresGuardado: 2, stockRestanteGuardado: -1 }),
            ),
            "0",
        );
    });

    it("un máximo que no es entero se devuelve tal cual", () => {
        assert.equal(specialPrizeRemainingStock(especial({ stock: "", ...agotadoGuardado })), "");
        assert.equal(specialPrizeRemainingStock(especial({ stock: "x", ...agotadoGuardado })), "x");
    });

    it("no cambia el premio: stock sigue siendo el máximo editado que se envía al servidor", () => {
        const input = especial({ stock: "5", ...agotadoGuardado });
        const before = { ...input };
        specialPrizeRemainingStock(input);
        isSpecialPrizeEligible(input);
        minijuegoPrizeWarnings([premio("a", "10", "0")], input);
        assert.deepEqual(input, before);
        assert.equal(input.stock, "5");
    });

    it("el especial agotado no puede salir aunque su máximo sea mayor que 0", () => {
        assert.equal(isSpecialPrizeEligible(especial(agotadoGuardado)), false);
        assert.equal(
            isSpecialPrizeEligible(especial({ maxGanadoresGuardado: 2, stockRestanteGuardado: 1 })),
            true,
        );
        assert.equal(
            isSpecialPrizeEligible(especial({ stock: "3", ...agotadoGuardado })),
            true,
            "al subir el máximo vuelve a tener ganadores disponibles",
        );
    });

    it("solo el especial con % pero agotado: avisa que ningún premio puede salir", () => {
        const premios = [premio("a", "10", "0"), premio("b", "20", "0")];
        assert.deepEqual(minijuegoPrizeWarnings(premios, especial(agotadoGuardado)), [
            SIN_PREMIOS_DISPONIBLES_WARNING,
        ]);
        assert.deepEqual(
            minijuegoPrizeWarnings(premios, especial({ stock: "3", ...agotadoGuardado })),
            [SOLO_ESPECIAL_WARNING],
        );
    });

    it("la vista previa no dibuja el sector del especial agotado", () => {
        const premios = [premio("a", "10", "99.7")];
        const conDatosGuardados = especial({ probabilidad: "0.3", ...agotadoGuardado });
        assert.deepEqual(
            roulettePreviewSegments(premios, conDatosGuardados).map((segment) => segment.key),
            ["a"],
        );

        // Así lo arma RoulettePointsEditor con especialStock = stock restante.
        const comoEditor = {
            nombre: conDatosGuardados.nombre,
            probabilidad: conDatosGuardados.probabilidad,
            stock: specialPrizeRemainingStock(conDatosGuardados),
        };
        assert.deepEqual(
            roulettePreviewSegments(premios, comoEditor).map((segment) => segment.key),
            ["a"],
        );
        assert.deepEqual(
            roulettePreviewSegments([premio("a", "10", "0")], comoEditor),
            [],
            "con los puntos en 0 % queda el estado vacío",
        );

        const conGanadores = especial({ probabilidad: "0.3", stock: "3", ...agotadoGuardado });
        assert.deepEqual(
            roulettePreviewSegments(premios, {
                ...comoEditor,
                stock: specialPrizeRemainingStock(conGanadores),
            }).map((segment) => segment.key),
            ["a", SPECIAL_SEGMENT_KEY],
        );
    });
});
