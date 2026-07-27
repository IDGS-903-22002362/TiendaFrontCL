import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ApiError } from "../api/client";
import {
  getRemainingOtpAttempts,
  requiresNewOtpCode,
} from "./otp-verification";

describe("getRemainingOtpAttempts", () => {
  it("lee los intentos restantes del payload del 401", () => {
    const error = new ApiError(401, "Código incorrecto. Te quedan 2 intentos", {
      success: false,
      message: "Código incorrecto. Te quedan 2 intentos",
      remainingAttempts: 2,
    });

    assert.equal(getRemainingOtpAttempts(error), 2);
  });

  it("reconoce el cero para no confundirlo con ausencia de dato", () => {
    const error = new ApiError(401, "Demasiados intentos fallidos", {
      success: false,
      remainingAttempts: 0,
    });

    assert.equal(getRemainingOtpAttempts(error), 0);
  });

  it("devuelve undefined cuando el error no trae el dato", () => {
    const sinDato = new ApiError(500, "Error interno", { success: false });

    assert.equal(getRemainingOtpAttempts(sinDato), undefined);
    assert.equal(getRemainingOtpAttempts(new Error("network")), undefined);
    assert.equal(getRemainingOtpAttempts(undefined), undefined);
  });

  it("ignora valores no numéricos", () => {
    const error = new ApiError(401, "Código incorrecto", {
      success: false,
      remainingAttempts: "2",
    });

    assert.equal(getRemainingOtpAttempts(error), undefined);
  });
});

describe("requiresNewOtpCode", () => {
  it("pide un código nuevo cuando ya no quedan intentos", () => {
    const agotado = new ApiError(401, "Demasiados intentos fallidos", {
      success: false,
      remainingAttempts: 0,
    });

    assert.equal(requiresNewOtpCode(agotado), true);
  });

  it("mantiene al usuario en la pantalla del código si aún quedan intentos", () => {
    const conIntentos = new ApiError(401, "Código incorrecto", {
      success: false,
      remainingAttempts: 1,
    });

    assert.equal(requiresNewOtpCode(conIntentos), false);
  });

  it("no cierra el flujo ante errores de red o del servidor", () => {
    assert.equal(requiresNewOtpCode(new ApiError(0, "Sin conexión")), false);
    assert.equal(requiresNewOtpCode(new ApiError(429, "Demasiadas peticiones")), false);
    assert.equal(requiresNewOtpCode(new Error("boom")), false);
  });
});
