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

## Deploy

```txt
pnpm run deploy             # production env, remote D1
```

## Type generation

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
pnpm run cf-typegen
```
