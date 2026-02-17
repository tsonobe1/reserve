# Setup

```txt
pnpm install
```

## Initialize D1 schema

```txt
# 開発用 DB (default env)
npx wrangler d1 execute reserve --local --file=./schema.sql

# テスト用 DB
npx wrangler d1 execute reserve --local --env test --file=./schema.sql

# 本番 DB
npx wrangler d1 execute reserve --remote --env production --file=./schema.sql
```

## Run locally

```txt
# 開発用 D1 (reserve-dev)
pnpm dev -- --local

# テスト用 D1 (reserve-test)
pnpm dev -- --env test --local
```

## Authentication

すべての API は `Authorization: Bearer <token>` が必要です。
`AUTH_TOKEN` は `wrangler.toml` に直書きせず、Secret として管理します。

```txt
# local/dev (wrangler dev)
cp .dev.vars.example .dev.vars
# 例: AUTH_TOKEN=your-local-token

# local/test env (wrangler dev --env test) を使う場合
cp .dev.vars.test.example .dev.vars.test

# production env
wrangler secret put AUTH_TOKEN --env production
```

### Local usage

```txt
cp .dev.vars.example .dev.vars
# .dev.vars を編集して AUTH_TOKEN を設定
```

`wrangler dev` を再起動後、`Authorization: Bearer <AUTH_TOKEN>` を付与して呼び出します。

```txt
curl -i http://localhost:8787/reserves \
  -H "Authorization: Bearer <AUTH_TOKEN>"
```

Postman の場合は `Authorization` タブで `Bearer Token` を選び、`<AUTH_TOKEN>` を入力します。

## Deploy

```txt
pnpm run deploy:production  # production env only, remote D1
```

## Labola login diagnostics

ログイン失敗の切り分け時だけ、診断ログを有効化できます。

- `LABOLA_YOYOGI_LOGIN_DIAGNOSTIC=true`
- または `LABOLA_YOYOGI_DIAGNOSTIC_LEVEL=full`

有効時は、`login-page-get` / `login-post` / `login-post-redirect-get` で以下を出力します。

- `response headers`（`set-cookie` は値を出さずメタ情報のみ）
- `set-cookie` 件数・Cookie名・属性（`Secure` / `HttpOnly` / `SameSite` 等）
- `turnstile` / `cf-chl` / `captcha` などの本文シグナル
- 推定拒否理由（`likelyRejectionReasons`）

```txt
# production
wrangler secret put LABOLA_YOYOGI_LOGIN_DIAGNOSTIC --env production
# 入力値: true
```

調査後はログ量を減らすため、値を空文字へ更新または削除してください。

## Type generation

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
pnpm run cf-typegen
```

## UI (Hono JSX + Tailwind)

UI は Hono JSX で HTML を返し、Tailwind は CDN (`@tailwindcss/browser`) をページ内で読み込みます。

### UI development workflow

`pnpm run dev` は起動時に `build:ui` を 1 回だけ実行し、その後は `wrangler dev` を起動します。  
そのため `src/web/csr/**` の変更は自動反映されません。

UI を編集する場合は、次のどちらかで再ビルドしてください。

```txt
# 変更ごとに手動ビルド
pnpm run build:ui
```

```txt
# UI 自動再ビルド + Worker
pnpm run build:ui --watch
wrangler dev
```
