import '../worker-configuration.d.ts'

declare module 'cloudflare:test' {
  // ProvidedEnv controls the type of `import("cloudflare:test").env`
  type ProvidedEnv = Cloudflare.Env
}
