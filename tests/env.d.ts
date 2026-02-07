/* eslint-disable @typescript-eslint/no-empty-object-type */
// Cloudflare.Env をそのまま ProvidedEnv に伝播させたいだけなので空の interface になるが、型情報共有のために残す
import '../worker-configuration.d.ts'

declare module 'cloudflare:test' {
  // ProvidedEnv controls the type of `import("cloudflare:test").env`
  interface ProvidedEnv extends Cloudflare.Env {}
}
