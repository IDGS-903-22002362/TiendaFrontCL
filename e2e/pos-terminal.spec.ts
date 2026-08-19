import { expect, test } from "@playwright/test";

const context = {
  actor: {
    uid: "cashier-1",
    name: "Cajera prueba",
    email: "cashier@example.com",
    baseRole: "EMPLEADO",
    posRole: "CASHIER",
    capabilities: [
      "pos.access",
      "pos.sale.create",
      "pos.sale.suspend",
      "pos.sale.resume",
      "pos.ticket.read",
      "register.read_own",
      "shift.read_own",
      "cash_movement.create",
      "cut.create_own",
      "cut.read_own",
    ],
  },
  operationalDate: "2026-07-27",
  appCheckVerified: true,
  activeShift: {
    id: "shift-1",
    sessionId: "session-1",
    registerId: "register-1",
    registerCode: "CAJA-01",
    operationalDate: "2026-07-27",
    cashierUid: "cashier-1",
    cashierName: "Cajera prueba",
    status: "ACTIVE",
    receivedFloatMinor: 100000,
    totals: {
      salesCount: 1,
      netSalesMinor: 189950,
      cashSalesMinor: 189950,
      cardSalesMinor: 0,
    },
    startedAt: "2026-07-27T15:00:00.000Z",
  },
  register: {
    register: {
      id: "register-1",
      code: "CAJA-01",
      name: "Caja principal",
      status: "OPEN",
      config: {
        terminalId: "terminal-1",
        allowCash: true,
        allowCardExternal: true,
      },
      activeSessionId: "session-1",
      currentShiftId: "shift-1",
      currentCashierUid: "cashier-1",
    },
    session: { id: "session-1", status: "OPEN", openingFloatMinor: 100000 },
    shift: null,
    expectedCashMinor: null,
  },
  settings: {
    storeId: "MAIN_STORE",
    storeName: "Tienda La Guarida",
    timezone: "America/Mexico_City",
    currency: "MXN",
    denominationsMinor: [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000],
    maxLinesPerSale: 120,
    maxQuantityPerLine: 99,
    maxNoteLength: 500,
    maxSaleTotalMinor: 100000000,
    cashMovementMaxMinor: 1000000,
    openingFloatMaxMinor: 1000000,
    suspendedSaleTtlMinutes: 1440,
    manualDiscountMaxPercent: 20,
    ticketFooterLegend: "Gracias por tu compra",
  },
};

const preview = {
  cut: null,
  shiftId: "shift-1",
  registerId: "register-1",
  registerCode: "CAJA-01",
  sessionId: "session-1",
  cashierUid: "cashier-1",
  operationalDate: "2026-07-27",
  shiftStatus: "ACTIVE",
  startedAt: "2026-07-27T15:00:00.000Z",
  receivedFloatMinor: 100000,
  blocking: {
    pendingSales: 0,
    unresolvedMovements: 0,
    canStartOrContinue: true,
    messages: [],
  },
  totals: {
    openingFloatMinor: 100000,
    salesCount: 1,
    grossSalesMinor: 189950,
    discountMinor: 0,
    netSalesMinor: 189950,
    cancelledCount: 0,
    voidedMinor: 0,
    returnsCount: 0,
    refundsMinor: 0,
    cashRefundsMinor: 0,
    cardRefundsMinor: 0,
    cashInMinor: 0,
    cashOutMinor: 0,
    securityDropsMinor: 0,
    transfersInMinor: 0,
    transfersOutMinor: 0,
    adjustmentsMinor: 0,
    paymentBreakdown: [
      {
        method: "CASH",
        count: 1,
        amountMinor: 189950,
        refundedMinor: 0,
        netMinor: 189950,
      },
    ],
    expectedCashMinor: 289950,
    countedCashMinor: 0,
    differenceMinor: 0,
  },
};

async function seedAuth(page: import("@playwright/test").Page, browserContext: import("@playwright/test").BrowserContext) {
  await browserContext.addCookies([
    {
      name: "tiendafront_api_token",
      value: "session-token",
      domain: "localhost",
      path: "/",
    },
    {
      name: "tiendafront_user_role",
      value: "EMPLEADO",
      domain: "localhost",
      path: "/",
    },
    {
      name: "tiendafront_user_data",
      value: encodeURIComponent(
        JSON.stringify({ perfilCompleto: true, roles: ["EMPLEADO"] }),
      ),
      domain: "localhost",
      path: "/",
    },
  ]);

  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/auth/session")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: {
                isAuthenticated: true,
                token: "session-token",
                role: "EMPLEADO",
                user: {
                  id: "cashier-1",
                  uid: "cashier-1",
                  nombre: "Cajera prueba",
                  perfilCompleto: true,
                  rol: "EMPLEADO",
                  roles: ["EMPLEADO"],
                },
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return originalFetch(input, init);
    };
  });
}

test("POS loads the operator context and focuses search with F2", async ({
  context: browserContext,
  page,
}) => {
  await seedAuth(page, browserContext);
  await page.route("**/api/pos/v1/context", (route) =>
    route.fulfill({ json: context }),
  );
  await page.route("**/api/pos/v1/registers**", (route) =>
    route.fulfill({
      json: { items: [context.register.register], pagination: { hasMore: false } },
    }),
  );
  await page.route("**/api/pos/v1/sales**", (route) =>
    route.fulfill({
      json: { items: [], pagination: { hasMore: false, nextCursor: null } },
    }),
  );
  await page.route("**/api/pos/v1/cash-movements**", (route) =>
    route.fulfill({
      json: { items: [], pagination: { hasMore: false, nextCursor: null } },
    }),
  );
  await page.route("**/api/productos**", (route) =>
    route.fulfill({ json: { data: [] } }),
  );
  await page.route("**/api/tallas**", (route) =>
    route.fulfill({ json: { data: [] } }),
  );

  await page.goto("/admin/pos");
  await expect(page.getByRole("heading", { name: "Punto de venta" })).toBeVisible();
  const search = page.getByRole("textbox", {
    name: "Buscar o escanear productos por nombre o SKU",
  });
  await page.keyboard.press("F2");
  await expect(search).toBeFocused();
  await expect(page.getByText("La venta está lista para comenzar")).toBeVisible();
  await expect(page.getByRole("link", { name: /Cerrar caja/i })).toBeVisible();
});

test("scanning an exact SKU with Enter adds the product to the sale", async ({
  context: browserContext,
  page,
}) => {
  await seedAuth(page, browserContext);
  await page.route("**/api/pos/v1/context", (route) =>
    route.fulfill({ json: context }),
  );
  await page.route("**/api/pos/v1/registers**", (route) =>
    route.fulfill({
      json: { items: [context.register.register], pagination: { hasMore: false } },
    }),
  );
  await page.route("**/api/pos/v1/sales**", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        json: {
          sale: {
            id: "sale-1",
            folio: "V-1",
            registerId: "register-1",
            registerCode: "CAJA-01",
            sessionId: "session-1",
            shiftId: "shift-1",
            operationalDate: "2026-07-27",
            status: "DRAFT",
            items: [],
            totals: {
              subtotalOriginalMinor: 0,
              offerDiscountMinor: 0,
              codeDiscountMinor: 0,
              manualDiscountMinor: 0,
              discountMinor: 0,
              subtotalMinor: 0,
              taxMinor: 0,
              totalMinor: 0,
            },
            appliedCode: null,
            payment: {
              paidMinor: 0,
              pendingMinor: 0,
              cashMinor: 0,
              cardMinor: 0,
              changeMinor: 0,
            },
            createdAt: "2026-07-27T15:00:00.000Z",
            updatedAt: "2026-07-27T15:00:00.000Z",
          },
        },
      });
      return;
    }
    await route.fulfill({
      json: { items: [], pagination: { hasMore: false, nextCursor: null } },
    });
  });
  await page.route("**/api/pos/v1/sales/sale-1/items**", (route) =>
    route.fulfill({
      json: {
        sale: {
          id: "sale-1",
          folio: "V-1",
          registerId: "register-1",
          registerCode: "CAJA-01",
          sessionId: "session-1",
          shiftId: "shift-1",
          operationalDate: "2026-07-27",
          status: "DRAFT",
          items: [
            {
              itemId: "item-1",
              productoId: "prod-1",
              clave: "CHA-428",
              descripcion: "Jersey visita",
              tallaId: null,
              quantity: 1,
              unitPriceOriginalMinor: 189950,
              unitPriceMinor: 189950,
              offerDiscountMinor: 0,
              codeDiscountMinor: 0,
              manualDiscountMinor: 0,
              lineTotalMinor: 189950,
              returnedQuantity: 0,
            },
          ],
          totals: {
            subtotalOriginalMinor: 189950,
            offerDiscountMinor: 0,
            codeDiscountMinor: 0,
            manualDiscountMinor: 0,
            discountMinor: 0,
            subtotalMinor: 189950,
            taxMinor: 0,
            totalMinor: 189950,
          },
          appliedCode: null,
          payment: {
            paidMinor: 0,
            pendingMinor: 189950,
            cashMinor: 0,
            cardMinor: 0,
            changeMinor: 0,
          },
          createdAt: "2026-07-27T15:00:00.000Z",
          updatedAt: "2026-07-27T15:01:00.000Z",
        },
      },
    }),
  );
  await page.route("**/api/pos/v1/cash-movements**", (route) =>
    route.fulfill({
      json: { items: [], pagination: { hasMore: false, nextCursor: null } },
    }),
  );
  await page.route("**/api/productos/buscar/**", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: "prod-1",
            clave: "CHA-428",
            descripcion: "Jersey visita",
            precioPublico: 1899.5,
            activo: true,
            existencias: 10,
            imagenes: [],
          },
        ],
      },
    }),
  );
  await page.route("**/api/productos**", (route) =>
    route.fulfill({ json: { data: [] } }),
  );
  await page.route("**/api/tallas**", (route) =>
    route.fulfill({ json: { data: [] } }),
  );

  await page.goto("/admin/pos");
  const search = page.getByRole("textbox", {
    name: "Buscar o escanear productos por nombre o SKU",
  });
  await search.fill("CHA-428");
  await search.press("Enter");
  await expect(page.getByText("Producto agregado")).toBeVisible();
  await expect(page.getByText("Jersey visita")).toBeVisible();
});

test("cashier cut page shows preview and starts counting flow", async ({
  context: browserContext,
  page,
}) => {
  await seedAuth(page, browserContext);
  await page.route("**/api/pos/v1/context", (route) =>
    route.fulfill({ json: context }),
  );
  await page.route("**/api/pos/v1/shifts/shift-1/cut-preview", (route) =>
    route.fulfill({ json: { preview } }),
  );
  await page.route("**/api/pos/v1/shifts/shift-1/start-count", (route) =>
    route.fulfill({
      status: 201,
      json: {
        cut: {
          id: "cut-1",
          folio: "CUT-1",
          status: "COUNTING",
          registerCode: "CAJA-01",
          cashierUid: "cashier-1",
          totals: preview.totals,
          blindForActor: false,
        },
      },
    }),
  );

  await page.goto("/admin/pos/corte");
  await expect(page.getByRole("heading", { name: "Corte de caja" })).toBeVisible();
  await expect(page.getByText("Efectivo esperado")).toBeVisible();
  await page.getByRole("button", { name: "Iniciar conteo" }).click();
  await expect(page.getByLabel("Efectivo contado (MXN)")).toBeVisible();
});

test("admin cuts history renders table filters from URL", async ({
  context: browserContext,
  page,
}) => {
  await browserContext.addCookies([
    {
      name: "tiendafront_api_token",
      value: "session-token",
      domain: "localhost",
      path: "/",
    },
    {
      name: "tiendafront_user_role",
      value: "ADMIN",
      domain: "localhost",
      path: "/",
    },
    {
      name: "tiendafront_user_data",
      value: encodeURIComponent(
        JSON.stringify({ perfilCompleto: true, roles: ["ADMIN"] }),
      ),
      domain: "localhost",
      path: "/",
    },
  ]);
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/auth/session")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: {
                isAuthenticated: true,
                token: "session-token",
                role: "ADMIN",
                user: {
                  id: "admin-1",
                  uid: "admin-1",
                  nombre: "Admin",
                  perfilCompleto: true,
                  rol: "ADMIN",
                  roles: ["ADMIN"],
                },
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return originalFetch(input, init);
    };
  });

  const adminContext = {
    ...context,
    actor: {
      ...context.actor,
      uid: "admin-1",
      posRole: "ADMIN",
      capabilities: [
        ...context.actor.capabilities,
        "cut.read_all",
        "report.read_all",
        "audit.read",
      ],
    },
    activeShift: null,
  };

  await page.route("**/api/pos/v1/context", (route) =>
    route.fulfill({ json: adminContext }),
  );
  await page.route("**/api/pos/v1/registers**", (route) =>
    route.fulfill({
      json: {
        items: [context.register.register],
        pagination: { hasMore: false, nextCursor: null },
      },
    }),
  );
  await page.route("**/api/pos/v1/cuts**", (route) =>
    route.fulfill({
      json: {
        items: [
          {
            id: "cut-1",
            folio: "CUT-001",
            operationalDate: "2026-07-27",
            registerId: "register-1",
            registerCode: "CAJA-01",
            shiftId: "shift-1",
            cashierUid: "cashier-1",
            status: "APPROVED",
            classification: "BALANCED",
            scope: "SHIFT",
            totals: {
              expectedCashMinor: 289950,
              countedCashMinor: 289950,
              differenceMinor: 0,
              netSalesMinor: 189950,
              salesCount: 1,
            },
            createdAt: "2026-07-27T18:00:00.000Z",
          },
        ],
        pagination: { hasMore: false, nextCursor: null },
      },
    }),
  );

  await page.goto("/admin/cortes?operationalDate=2026-07-27");
  await expect(page.getByRole("heading", { name: "Cortes de caja" })).toBeVisible();
  await expect(page.getByText("CUT-001")).toBeVisible();
  await expect(page.getByText("Fecha 2026-07-27")).toBeVisible();
});
