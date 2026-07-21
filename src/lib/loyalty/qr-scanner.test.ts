import assert from "node:assert/strict";
import test from "node:test";
import { extractMemberIdFromQr, KeyboardWedgeBuffer } from "./qr-scanner";

test("extracts a client id from supported QR payloads", () => {
  assert.equal(extractMemberIdFromQr("client_123"), "client_123");
  assert.equal(extractMemberIdFromQr('{"uid":"client_456"}'), "client_456");
  assert.equal(extractMemberIdFromQr("https://club.test/card?memberId=client_789"), "client_789");
  assert.equal(extractMemberIdFromQr("bad id"), null);
});

test("keyboard wedge emits only a fast sequence terminated by Enter", () => {
  const scanner = new KeyboardWedgeBuffer();
  let at = 100;
  for (const key of "client_123") {
    assert.equal(scanner.push(key, at), null);
    at += 12;
  }
  assert.equal(scanner.push("Enter", at), "client_123");

  for (const key of "client_999") {
    scanner.push(key, at);
    at += 100;
  }
  assert.equal(scanner.push("Enter", at), null);
});
