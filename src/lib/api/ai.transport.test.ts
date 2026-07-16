import assert from "node:assert/strict";
import test from "node:test";
import { sendAiMessageSse } from "./ai";
test("incomplete accepted AI streams are never resubmitted", async (t) => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    return new Response("event: status\ndata: {\"status\":\"processing\"}\n\n", {
      status: 200, headers: { "Content-Type": "text/event-stream" },
    });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  await assert.rejects(
    sendAiMessageSse({ sessionId: "session-1", message: "hola" }, {}),
    /antes de entregar una respuesta final/,
  );
  assert.equal(requestCount, 1);
});
