import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    ALLOWED_CARTA_IMAGE_TYPES,
    CARTA_IMAGE_HEIGHT_PX,
    CARTA_IMAGE_RECOMMENDATION,
    CARTA_IMAGE_WIDTH_PX,
    MAX_CARTA_IMAGE_PIXELS,
    MAX_CARTA_IMAGE_SIZE_BYTES,
} from "@/lib/api/beneficios";
import {
    CARTA_ART_ASPECT_RATIO,
    cartaArtFit,
    cartaContainRect,
    cartaFocusTarget,
    cartaImagenUrlFromPremio,
    cartaPreviewState,
    resolveCartaImagenUrlPayload,
    validateCartaImageDimensions,
    validateCartaImageFile,
} from "./carta-coleccionable";

const MB = 1024 * 1024;
const URL_A = "https://storage.googleapis.com/app-oficial-leon.firebasestorage.app/minijuegos/cartas/0b6f2c1e-8a7d-4c1b-9f3e-2d5a6b7c8d9e.webp";
const URL_B = "http://127.0.0.1:9199/app-oficial-leon.firebasestorage.app/minijuegos/cartas/5f0e1d2c-3b4a-4968-8776-a5b4c3d2e1f0.webp";

describe("constantes de la carta", () => {
    it("coinciden con el contrato", () => {
        assert.deepEqual([...ALLOWED_CARTA_IMAGE_TYPES], ["image/jpeg", "image/png", "image/webp"]);
        assert.equal(MAX_CARTA_IMAGE_SIZE_BYTES, 10 * MB);
        assert.equal(MAX_CARTA_IMAGE_PIXELS, 40_000_000);
        assert.equal(CARTA_IMAGE_WIDTH_PX, 1744);
        assert.equal(CARTA_IMAGE_HEIGHT_PX, 1182);
        assert.equal(CARTA_IMAGE_RECOMMENDATION, "1744 × 1182 px (horizontal, proporción 1.48:1)");
        assert.ok(Math.abs(CARTA_ART_ASPECT_RATIO - 872 / 591) < 1e-9);
    });
});

describe("validación al elegir el archivo", () => {
    it("acepta JPG, PNG y WEBP de hasta 10 MB", () => {
        for (const type of ["image/jpeg", "image/png", "image/webp"]) {
            assert.equal(validateCartaImageFile({ type, size: 2 * MB }), null, type);
        }
        assert.equal(validateCartaImageFile({ type: "image/png", size: 10 * MB }), null);
    });

    it("rechaza GIF, SVG, HEIC y archivos sin tipo", () => {
        for (const type of ["image/gif", "image/svg+xml", "image/heic", "application/pdf", ""]) {
            assert.equal(
                validateCartaImageFile({ type, size: MB }),
                "La carta solo acepta imágenes JPG, PNG o WEBP.",
                type,
            );
        }
    });

    it("rechaza archivos vacíos o de más de 10 MB", () => {
        assert.equal(
            validateCartaImageFile({ type: "image/jpeg", size: 0 }),
            "El archivo está vacío. Elige otra imagen.",
        );
        assert.equal(
            validateCartaImageFile({ type: "image/jpeg", size: 10 * MB + 1 }),
            "La imagen de la carta no puede pesar más de 10 MB.",
        );
    });

    it("cada lado debe medir al menos 400 px", () => {
        assert.equal(validateCartaImageDimensions(400, 400), null);
        assert.equal(validateCartaImageDimensions(1744, 1182), null);
        assert.equal(
            validateCartaImageDimensions(399, 1200),
            "La imagen mide 399 × 1200 px; cada lado debe medir al menos 400 px.",
        );
        assert.equal(
            validateCartaImageDimensions(0, 0),
            "No pudimos leer las medidas de la imagen. Elige otro archivo.",
        );
    });

    it("rechaza imágenes de más de 40 megapíxeles, como el servidor", () => {
        assert.equal(validateCartaImageDimensions(8000, 5000), null, "40 MP exactos");
        assert.equal(
            validateCartaImageDimensions(8000, 6000),
            "La imagen mide 8000 × 6000 px; el máximo es 40 megapíxeles. Usa una versión de menor resolución.",
        );
    });
});

describe("ajuste del arte en la ventana de la carta", () => {
    it("usa cover si la proporción difiere hasta 3 %", () => {
        assert.equal(cartaArtFit(1744, 1182), "cover");
        assert.equal(cartaArtFit(872, 591), "cover");
        assert.equal(cartaArtFit(1600, 1100), "cover");
        assert.equal(cartaArtFit(1519, 1000), "cover");
    });

    it("usa contain sobre fondo difuminado si difiere más", () => {
        assert.equal(cartaArtFit(1525, 1000), "contain");
        assert.equal(cartaArtFit(1920, 1080), "contain");
        assert.equal(cartaArtFit(1000, 1000), "contain");
        assert.equal(cartaArtFit(1018, 1416), "contain");
        assert.equal(cartaArtFit(0, 100), "contain");
    });

    it("con contain la imagen completa queda centrada en la ventana", () => {
        const close = (actual: number, expected: number) =>
            assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≈ ${expected}`);

        // Cuadrada: ocupa todo el alto y queda centrada a lo ancho.
        const cuadrada = cartaContainRect(1000, 1000);
        close(cuadrada.width, (591 / 872) * 100);
        close(cuadrada.height, 100);
        close(cuadrada.top, 0);
        close(cuadrada.left, (100 - cuadrada.width) / 2);

        // 16:9: ocupa todo el ancho y queda centrada a lo alto.
        const panoramica = cartaContainRect(1920, 1080);
        close(panoramica.width, 100);
        close(panoramica.left, 0);
        close(panoramica.height, ((872 / 591) / (1920 / 1080)) * 100);
        close(panoramica.top, (100 - panoramica.height) / 2);

        // Misma proporción o medidas inválidas: toda la ventana.
        assert.deepEqual(cartaContainRect(1744, 1182), { left: 0, top: 0, width: 100, height: 100 });
        assert.deepEqual(cartaContainRect(0, 0), { left: 0, top: 0, width: 100, height: 100 });
    });
});

describe("cartaImagenUrl del payload", () => {
    it("una carta recién subida reemplaza a la guardada", () => {
        assert.deepEqual(
            resolveCartaImagenUrlPayload({ uploadedUrl: URL_B, savedUrl: URL_A, initialUrl: URL_A }),
            { cartaImagenUrl: URL_B },
        );
        assert.deepEqual(
            resolveCartaImagenUrlPayload({ uploadedUrl: URL_B, savedUrl: "", initialUrl: "" }),
            { cartaImagenUrl: URL_B },
        );
    });

    it("sin archivo nuevo conserva la carta guardada mandándola tal cual", () => {
        assert.deepEqual(
            resolveCartaImagenUrlPayload({ uploadedUrl: null, savedUrl: URL_A, initialUrl: URL_A }),
            { cartaImagenUrl: URL_A },
        );
    });

    it("si se quitó la carta guardada manda null", () => {
        const payload = resolveCartaImagenUrlPayload({ savedUrl: "", initialUrl: URL_A });
        assert.deepEqual(payload, { cartaImagenUrl: null });
        assert.equal(JSON.stringify({ especial: true, ...payload }), '{"especial":true,"cartaImagenUrl":null}');
    });

    it("si nunca hubo carta no manda la clave", () => {
        const payload = resolveCartaImagenUrlPayload({ uploadedUrl: "  ", savedUrl: " ", initialUrl: "" });
        assert.deepEqual(payload, {});
        assert.equal("cartaImagenUrl" in payload, false);
        assert.equal(JSON.stringify({ especial: true, ...payload }), '{"especial":true}');
    });
});

describe("estado del campo de la carta", () => {
    it("distingue pendiente, guardada, quitada y vacía", () => {
        assert.equal(cartaPreviewState({ hasPendingFile: true, savedUrl: URL_A, initialUrl: URL_A }), "pendiente");
        assert.equal(cartaPreviewState({ hasPendingFile: false, savedUrl: URL_A, initialUrl: URL_A }), "guardada");
        assert.equal(cartaPreviewState({ hasPendingFile: false, savedUrl: "", initialUrl: URL_A }), "quitada");
        assert.equal(cartaPreviewState({ hasPendingFile: false, savedUrl: "", initialUrl: "" }), "vacia");
    });

    it("lee la URL guardada del premio aunque venga null o ausente", () => {
        assert.equal(cartaImagenUrlFromPremio(` ${URL_A} `), URL_A);
        assert.equal(cartaImagenUrlFromPremio(null), "");
        assert.equal(cartaImagenUrlFromPremio(undefined), "");
        assert.equal(cartaImagenUrlFromPremio(42), "");
    });
});

describe("foco del campo de la carta", () => {
    /** Estado al que queda el campo y adónde va el foco. */
    const focoTras = (input: { hasPendingFile: boolean; savedUrl: string; initialUrl: string }) =>
        cartaFocusTarget(cartaPreviewState(input));

    it("tras elegir un archivo va a «Reemplazar» (el input visible se oculta)", () => {
        for (const savedUrl of ["", URL_A]) {
            for (const initialUrl of ["", URL_A]) {
                assert.equal(
                    focoTras({ hasPendingFile: true, savedUrl, initialUrl }),
                    "reemplazar",
                    `guardada «${savedUrl}», inicial «${initialUrl}»`,
                );
            }
        }
    });

    it("tras «Quitar» va a «Conservar la carta guardada» si queda quitada", () => {
        // Desde la carta guardada o desde un archivo que la iba a reemplazar.
        assert.equal(focoTras({ hasPendingFile: false, savedUrl: "", initialUrl: URL_A }), "conservar");
    });

    it("tras «Quitar» va al input de archivo si queda vacía", () => {
        // Archivo elegido en un premio que no tenía carta.
        assert.equal(focoTras({ hasPendingFile: false, savedUrl: "", initialUrl: "" }), "archivo");
    });

    it("tras «Conservar la carta guardada» va a «Reemplazar»", () => {
        assert.equal(focoTras({ hasPendingFile: false, savedUrl: URL_A, initialUrl: URL_A }), "reemplazar");
    });

    it("el destino siempre está visible en el estado que queda", () => {
        // «Reemplazar» solo existe con vista previa; «Conservar», solo con la
        // carta quitada; el input de archivo se ve cuando no hay vista previa.
        assert.equal(cartaFocusTarget("pendiente"), "reemplazar");
        assert.equal(cartaFocusTarget("guardada"), "reemplazar");
        assert.equal(cartaFocusTarget("quitada"), "conservar");
        assert.equal(cartaFocusTarget("vacia"), "archivo");
    });
});
