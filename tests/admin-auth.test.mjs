import assert from "node:assert/strict";
import test from "node:test";
import { onRequest } from "../functions/admin/[[catchall]].js";

const basic = (value) => `Basic ${Buffer.from(value, "utf8").toString("base64")}`;

const contextFor = ({ password = "", username = "admin", authorization = null } = {}) => ({
  env: {
    ADMIN_USERNAME: username,
    ADMIN_PASSWORD: password,
    ASSETS: {
      fetch: async () => new Response("protected admin page", { status: 200 })
    }
  },
  request: new Request("https://example.pages.dev/admin/x-post/", {
    headers: authorization ? { Authorization: authorization } : {}
  })
});

test("admin function fails closed when password is not configured", async () => {
  const response = await onRequest(contextFor());
  assert.equal(response.status, 503);
  assert.match(await response.text(), /認証設定が未完了/);
});

test("admin function challenges a request without valid credentials", async () => {
  const response = await onRequest(contextFor({ password: "correct-horse-battery" }));
  assert.equal(response.status, 401);
  assert.match(response.headers.get("www-authenticate") || "", /Basic/);
});

test("admin function serves the asset after valid credentials", async () => {
  const response = await onRequest(contextFor({
    username: "admin",
    password: "correct-horse-battery",
    authorization: basic("admin:correct-horse-battery")
  }));
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "protected admin page");
  assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
});
