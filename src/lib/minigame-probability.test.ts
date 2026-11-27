import assert from "node:assert/strict";
import test from "node:test";
import {
  formatUnits,
  parsePercentToUnits,
  percentInputToNumber,
  percentNumberToInput,
  sanitizePercentInput,
  summarizeProbabilities,
} from "./minigame-probability";

const EJEMPLO = ["30", "25", "15", "10", "7", "5", "3", "2", "1.5", "1.2", "0.3"];

test("parsea porcentajes decimales a unidades enteras sin punto flotante", () => {
  assert.equal(parsePercentToUnits("30"), 30_000);
  assert.equal(parsePercentToUnits("1.5"), 1_500);
  assert.equal(parsePercentToUnits("0.3"), 300);
  assert.equal(parsePercentToUnits("0.05"), 50);
  assert.equal(parsePercentToUnits("0.001"), 1);
  assert.equal(parsePercentToUnits("100"), 100_000);
});

test("rechaza vacíos, negativos, texto, más de 3 decimales y más de 100%", () => {
  for (const value of ["", "-1", "abc", "0.0001", "100.001", "101", "1.2.3", "1e2"]) {
    assert.equal(parsePercentToUnits(value), null, value);
  }
});

test("el ejemplo de la ruleta suma exactamente 100%", () => {
  const summary = summarizeProbabilities(EJEMPLO);
  assert.equal(summary.status, "valid");
  assert.equal(summary.totalUnits, 100_000);
  assert.equal(summary.message, "Probabilidad total: 100%. Configuración válida.");
});

test("suma 0.1 + 0.2 sin error de redondeo", () => {
  const summary = summarizeProbabilities(["0.1", "0.2", "99.7"]);
  assert.equal(summary.status, "valid");
});

test("indica cuánto falta cuando la suma es menor a 100%", () => {
  const summary = summarizeProbabilities(["50", "45"]);
  assert.equal(summary.status, "missing");
  assert.equal(summary.message, "Probabilidad total: 95%. Falta asignar 5%.");
});

test("indica el exceso cuando la suma es mayor a 100%", () => {
  const summary = summarizeProbabilities(["60", "43"]);
  assert.equal(summary.status, "exceeded");
  assert.equal(summary.message, "Probabilidad total: 103%. Excedes el límite por 3%.");
});

test("un exceso decimal pequeño también bloquea", () => {
  const summary = summarizeProbabilities(["99.7", "0.301"]);
  assert.equal(summary.status, "exceeded");
  assert.equal(summary.message, "Probabilidad total: 100.001%. Excedes el límite por 0.001%.");
});

test("0% es válido: el premio queda guardado pero no suma", () => {
  assert.equal(parsePercentToUnits("0"), 0);
  assert.equal(parsePercentToUnits("0.000"), 0);
  const summary = summarizeProbabilities(["100", "0"]);
  assert.equal(summary.status, "valid");
  assert.equal(summary.totalUnits, 100_000);
  assert.equal(summarizeProbabilities(["99.7", "0", "0.3", "0.000"]).status, "valid");
});

test("todos en 0% no completan el 100%", () => {
  const summary = summarizeProbabilities(["0", "0"]);
  assert.equal(summary.status, "missing");
  assert.equal(summary.message, "Probabilidad total: 0%. Falta asignar 100%.");
});

test("un valor vacío o no numérico sigue invalidando la configuración", () => {
  for (const value of ["", " ", "abc", "-1", "100.5", "0.0001"]) {
    const summary = summarizeProbabilities(["100", value]);
    assert.equal(summary.status, "invalid", JSON.stringify(value));
    assert.equal(
      summary.message,
      "Cada premio necesita una probabilidad entre 0 % y 100 %, con máximo 3 decimales.",
    );
  }
});

test("limpia la entrada del usuario y acepta coma decimal", () => {
  assert.equal(sanitizePercentInput("0,3"), "0.3");
  assert.equal(sanitizePercentInput("1.23456"), "1.234");
  assert.equal(sanitizePercentInput("-5%"), "5");
  assert.equal(sanitizePercentInput("12.3.4"), "12.34");
});

test("convierte entre el número del API y el texto del input", () => {
  assert.equal(percentNumberToInput(0.3), "0.3");
  assert.equal(percentNumberToInput(33.333), "33.333");
  assert.equal(percentNumberToInput(100), "100");
  assert.equal(percentNumberToInput(undefined), "");
  assert.equal(percentInputToNumber("0.3"), 0.3);
  assert.equal(percentInputToNumber("0.05"), 0.05);
  assert.equal(formatUnits(1), "0.001");
});
