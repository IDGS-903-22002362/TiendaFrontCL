/**
 * Pruebas E2E de concurrencia de inventario - Club Leon Ecommerce
 *
 * PRERREQUISITOS PARA EJECUTAR:
 * 1. npm install -D @playwright/test
 * 2. Firebase Emulator Suite corriendo:
 *    cd BackendCL && firebase emulators:start --only firestore,functions
 * 3. Backend local corriendo:
 *    cd BackendCL/functions && npm run dev
 *    (usa FIRESTORE_EMULATOR_HOST=localhost:8080)
 * 4. Frontend local corriendo:
 *    npm run dev
 * 5. Stripe Test Mode configurado con webhook forwarding:
 *    stripe listen --forward-to localhost:3000/api/webhooks/stripe
 *
 * CONFIGURAR VARIABLES:
 *   BACKEND_URL=http://localhost:3000
 *   TEST_AUTH_TOKEN_A=<token Firebase test usuario A>
 *   TEST_AUTH_TOKEN_B=<token Firebase test usuario B>
 *
 * EJECUTAR:
 *   npx playwright test e2e/inventory-concurrency.spec.ts
 *
 * ESCENARIOS CUBIERTOS: 1, 2, 5, 10, 12, 20
 */

import { test, expect } from "@playwright/test";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:3000";
const TOKEN_A = process.env.TEST_AUTH_TOKEN_A ?? "";
const TOKEN_B = process.env.TEST_AUTH_TOKEN_B ?? "";
const TEST_PRODUCTO_ID = "test_prod_concurrencia";

async function authHeaders(token: string) {
  return { Authorization: "Bearer " + token, "Content-Type": "application/json" };
}

async function crearOrden(
  request: import("@playwright/test").APIRequestContext,
  token: string,
  payload: object,
): Promise<{ ordenId: string }> {
  const res = await request.post(BACKEND + "/api/ordenes", {
    headers: await authHeaders(token),
    data: payload,
  });
  expect(res.ok(), "crear orden fallo: " + (await res.text())).toBeTruthy();
  return res.json();
}

async function iniciarPago(
  request: import("@playwright/test").APIRequestContext,
  token: string,
  ordenId: string,
): Promise<{ error?: string; status?: number }> {
  const res = await request.post(BACKEND + "/api/payments/v2/create-checkout", {
    headers: await authHeaders(token),
    data: { ordenId },
  });
  if (!res.ok()) return { error: await res.text(), status: res.status() };
  return res.json();
}

async function consultarInventario(
  request: import("@playwright/test").APIRequestContext,
  productoId: string,
): Promise<{ inventarioGlobal?: { fisica: number; reservada: number; disponible: number } }> {
  const res = await request.get(BACKEND + "/api/inventario/diagnostico/" + productoId);
  if (!res.ok()) return {};
  const body = await res.json();
  return body?.proyeccion ?? body;
}

async function consultarReservas(
  request: import("@playwright/test").APIRequestContext,
  ordenId: string,
): Promise<{ count: number; estados: string[] }> {
  const res = await request.get(BACKEND + "/api/inventario/reservas?ordenId=" + ordenId);
  if (!res.ok()) return { count: 0, estados: [] };
  const body = await res.json();
  const reservas: Array<{ estado: string }> = body?.reservas ?? [];
  return { count: reservas.length, estados: reservas.map((r) => r.estado) };
}

async function resetProductoStock(
  request: import("@playwright/test").APIRequestContext,
  adminToken: string,
  productoId: string,
  fisica: number,
) {
  await request.post(BACKEND + "/api/inventario/ajustes", {
    headers: await authHeaders(adminToken),
    data: {
      productoId,
      cantidadFisica: fisica,
      motivo: "Reset para prueba E2E",
      idempotencyKey: "e2e-reset-" + productoId + "-" + Date.now(),
    },
  });
}

test.describe("E2E Concurrencia inventario", () => {
  test.skip(
    !TOKEN_A || !TOKEN_B,
    "Requiere TEST_AUTH_TOKEN_A y TEST_AUTH_TOKEN_B. Ver instrucciones arriba.",
  );

  test("E2E-1: Producto 1 unidad, 2 usuarios concurrentes: 1 acepta, 1 rechaza", async ({ request }) => {
    await resetProductoStock(request, TOKEN_A, TEST_PRODUCTO_ID, 1);

    const [ordenA, ordenB] = await Promise.all([
      crearOrden(request, TOKEN_A, { items: [{ productoId: TEST_PRODUCTO_ID, cantidad: 1 }], fulfillmentMethod: "pickup" }),
      crearOrden(request, TOKEN_B, { items: [{ productoId: TEST_PRODUCTO_ID, cantidad: 1 }], fulfillmentMethod: "pickup" }),
    ]);

    const [pagoA, pagoB] = await Promise.allSettled([
      iniciarPago(request, TOKEN_A, ordenA.ordenId),
      iniciarPago(request, TOKEN_B, ordenB.ordenId),
    ]);

    const exitosos = [pagoA, pagoB].filter(
      (r) => r.status === "fulfilled" && !(r.value as { error?: string }).error,
    );
    expect(exitosos).toHaveLength(1);

    const inv = await consultarInventario(request, TEST_PRODUCTO_ID);
    expect(inv.inventarioGlobal?.disponible).toBe(0);
    expect(inv.inventarioGlobal?.reservada).toBe(1);
  });

  test("E2E-2: Producto 5 unidades, 20 solicitudes: exactamente 5 aceptadas", async ({ request }) => {
    const UNITS = 5;
    const REQUESTS = 20;
    await resetProductoStock(request, TOKEN_A, TEST_PRODUCTO_ID, UNITS);

    const ordenes = await Promise.all(
      Array.from({ length: REQUESTS }, () =>
        crearOrden(request, TOKEN_A, { items: [{ productoId: TEST_PRODUCTO_ID, cantidad: 1 }], fulfillmentMethod: "pickup" }),
      ),
    );

    const resultados = await Promise.allSettled(
      ordenes.map((o) => iniciarPago(request, TOKEN_A, o.ordenId)),
    );

    const exitosos = resultados.filter(
      (r) => r.status === "fulfilled" && !(r.value as { error?: string }).error,
    );
    expect(exitosos).toHaveLength(UNITS);

    const inv = await consultarInventario(request, TEST_PRODUCTO_ID);
    expect(inv.inventarioGlobal?.disponible ?? -1).toBeGreaterThanOrEqual(0);
    expect(inv.inventarioGlobal?.reservada).toBe(UNITS);
  });

  test("E2E-5: Doble clic pago (misma orden): idempotente, stock decrementado 1 vez", async ({ request }) => {
    await resetProductoStock(request, TOKEN_A, TEST_PRODUCTO_ID, 3);
    const { ordenId } = await crearOrden(request, TOKEN_A, { items: [{ productoId: TEST_PRODUCTO_ID, cantidad: 1 }], fulfillmentMethod: "pickup" });

    const [res1, res2] = await Promise.all([
      iniciarPago(request, TOKEN_A, ordenId),
      iniciarPago(request, TOKEN_A, ordenId),
    ]);

    expect((res1 as { error?: string }).error).toBeFalsy();
    expect((res2 as { error?: string }).error).toBeFalsy();

    const reservas = await consultarReservas(request, ordenId);
    const activas = reservas.estados.filter((e) => e === "activa");
    expect(activas).toHaveLength(1);

    const inv = await consultarInventario(request, TEST_PRODUCTO_ID);
    expect(inv.inventarioGlobal?.reservada).toBe(1);
    expect(inv.inventarioGlobal?.disponible).toBe(2);
  });

  test.skip("E2E-10: Webhook Stripe duplicado: solo 1 movimiento de venta", async () => {
    /**
     * INSTRUCCION MANUAL:
     * 1. Completar un pago de prueba con tarjeta 4242 4242 4242 4242
     * 2. stripe listen --forward-to localhost:3000/api/webhooks/stripe
     * 3. Duplicar el evento payment_intent.succeeded
     * 4. Verificar en Firestore que solo hay 1 movimiento tipo "venta"
     */
    expect(true).toBe(true);
  });

  test("E2E-12: Pago fallido: reserva liberada, stock restaurado", async ({ request }) => {
    await resetProductoStock(request, TOKEN_A, TEST_PRODUCTO_ID, 1);
    const { ordenId } = await crearOrden(request, TOKEN_A, { items: [{ productoId: TEST_PRODUCTO_ID, cantidad: 1 }], fulfillmentMethod: "pickup" });

    await iniciarPago(request, TOKEN_A, ordenId);

    const inv_before = await consultarInventario(request, TEST_PRODUCTO_ID);
    expect(inv_before.inventarioGlobal?.disponible).toBe(0);

    await request.post(BACKEND + "/api/payments/v2/cancel/" + ordenId, {
      headers: await authHeaders(TOKEN_A),
      data: { motivo: "Prueba E2E pago fallido" },
    });

    const inv_after = await consultarInventario(request, TEST_PRODUCTO_ID);
    expect(inv_after.inventarioGlobal?.disponible).toBe(1);
    expect(inv_after.inventarioGlobal?.reservada).toBe(0);

    const reservas = await consultarReservas(request, ordenId);
    expect(reservas.estados.filter((e) => e === "activa")).toHaveLength(0);
  });

  test("E2E-20: Ultima unidad, 5 rondas: exactamente 1 ganador por ronda", async ({ request }) => {
    const ROUNDS = 5;

    for (let round = 0; round < ROUNDS; round++) {
      await resetProductoStock(request, TOKEN_A, TEST_PRODUCTO_ID, 1);

      const [ordenA, ordenB] = await Promise.all([
        crearOrden(request, TOKEN_A, { items: [{ productoId: TEST_PRODUCTO_ID, cantidad: 1 }], fulfillmentMethod: "pickup" }),
        crearOrden(request, TOKEN_B, { items: [{ productoId: TEST_PRODUCTO_ID, cantidad: 1 }], fulfillmentMethod: "pickup" }),
      ]);

      const [pagoA, pagoB] = await Promise.allSettled([
        iniciarPago(request, TOKEN_A, ordenA.ordenId),
        iniciarPago(request, TOKEN_B, ordenB.ordenId),
      ]);

      const exitosos = [pagoA, pagoB].filter(
        (r) => r.status === "fulfilled" && !(r.value as { error?: string }).error,
      );
      expect(exitosos).toHaveLength(1);

      const inv = await consultarInventario(request, TEST_PRODUCTO_ID);
      expect(inv.inventarioGlobal?.disponible ?? -1).toBeGreaterThanOrEqual(0);
    }
  });
});
