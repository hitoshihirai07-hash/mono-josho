/**
 * Cloudflare Pages Functions: /admin/* を HTTP Basic 認証で保護する。
 * パスワードは Cloudflare の Secrets にだけ設定し、リポジトリには保存しない。
 */
const unauthorized = () => new Response("認証が必要です。", {
  status: 401,
  headers: {
    "WWW-Authenticate": 'Basic realm="Mono Josho Admin", charset="UTF-8"',
    "Cache-Control": "no-store"
  }
});

const unavailable = () => new Response("管理画面の認証設定が未完了です。", {
  status: 503,
  headers: {
    "Cache-Control": "no-store",
    "Content-Type": "text/plain; charset=UTF-8"
  }
});

const toBasicToken = (value) => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const secureEqual = (left = "", right = "") => {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
};

export async function onRequest(context) {
  const username = String(context.env.ADMIN_USERNAME || "admin");
  const password = String(context.env.ADMIN_PASSWORD || "");

  // シークレット未設定のまま公開されることを防ぐため、保護を解除せず停止する。
  if (!password) return unavailable();

  const expected = `Basic ${toBasicToken(`${username}:${password}`)}`;
  const actual = context.request.headers.get("Authorization") || "";
  if (!secureEqual(actual, expected)) return unauthorized();

  const response = await context.env.ASSETS.fetch(context.request);
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
