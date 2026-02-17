export type LabolaYoyogiClientEnv = {
  LABOLA_YOYOGI_USERNAME?: string
  LABOLA_YOYOGI_PASSWORD?: string
  LABOLA_YOYOGI_LOGIN_ONLY?: string
  LABOLA_YOYOGI_LOGIN_DIAGNOSTIC?: string
  LABOLA_YOYOGI_DIAGNOSTIC_LEVEL?: string
}

const LABOLA_YOYOGI_BASE_ORIGIN = 'https://yoyaku.labola.jp'
const LABOLA_YOYOGI_LOGIN_URL = `${LABOLA_YOYOGI_BASE_ORIGIN}/r/shop/3094/member/login/`
const LABOLA_YOYOGI_CUSTOMER_INFO_URL = `${LABOLA_YOYOGI_BASE_ORIGIN}/r/booking/rental/shop/3094/customer-info/`
const LABOLA_YOYOGI_CUSTOMER_CONFIRM_URL = `${LABOLA_YOYOGI_BASE_ORIGIN}/r/booking/rental/shop/3094/customer-confirm/`
const LABOLA_YOYOGI_INVALID_CREDENTIALS_TEXT = '会員IDまたはパスワードが正しくありません'
const LABOLA_YOYOGI_INVALID_CREDENTIALS_ALT_TEXT = '会員番号またはパスワードが違います。'
const LABOLA_YOYOGI_LOGIN_PAGE_TITLE_TEXT = 'メンバーログイン - LaBOLA総合予約'
const LABOLA_YOYOGI_CALENDAR_PAGE_TITLE_TEXT = '空き情報・予約 - LaBOLA総合予約'
const LABOLA_YOYOGI_ALREADY_RESERVED_TEXT = 'すでに予約済みです'
const LABOLA_YOYOGI_ALREADY_RESERVED_UNICODE_TEXT =
  '\\u3059\\u3067\\u306b\\u4e88\\u7d04\\u6e08\\u307f\\u3067\\u3059'

const ERROR_MISSING_CREDENTIALS = 'LABOLA_YOYOGI_USERNAME / LABOLA_YOYOGI_PASSWORD が未設定です'
const ERROR_LOGIN_POST_NETWORK = 'ログインPOST中に通信エラーが発生しました'
const ERROR_LOGIN_PAGE_NETWORK = 'ログインページ取得中に通信エラーが発生しました'
const ERROR_LOGIN_INVALID_CREDENTIALS =
  'ログインに失敗しました: IDまたはパスワードを確認してください'
const ERROR_LOGIN_POST_UPSTREAM = '相手側サーバ障害のためログインできませんでした'
const ERROR_CUSTOMER_CONFIRM_UNCERTAIN = 'customer-confirm 応答から予約完了を確認できませんでした'
const LABOLA_HTTP_BODY_PREVIEW_LIMIT = 300
const LABOLA_CONFIRM_DIAGNOSTIC_MAX_TEXTS = 5
const LABOLA_YOYOGI_ORIGIN = new URL(LABOLA_YOYOGI_LOGIN_URL).origin
const LABOLA_LOGIN_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
const LABOLA_LOGIN_ACCEPT =
  'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
const LABOLA_LOGIN_ACCEPT_LANGUAGE = 'ja,en;q=0.9'
const LABOLA_LOGIN_DIAGNOSTIC_BODY_SIGNAL_PATTERNS: Array<{
  key: string
  pattern: RegExp
}> = [
  { key: 'turnstile', pattern: /turnstile|cf-turnstile|challenges\.cloudflare\.com\/turnstile/i },
  { key: 'cf-chl', pattern: /cf-chl|cdn-cgi\/challenge-platform|cf_chl/i },
  { key: 'captcha', pattern: /captcha|hcaptcha|recaptcha|g-recaptcha/i },
  { key: 'bot-check', pattern: /verify you are human|checking your browser|attention required/i },
]
const LABOLA_YOYOGI_CONFIRM_SUCCESS_HINTS = [
  '予約が完了しました',
  '予約完了',
  '申込完了',
  'お申し込みありがとうございました',
  'ご予約ありがとうございます',
  '予約番号',
  '受付番号',
]
const LABOLA_YOYOGI_CONFIRM_FAILURE_HINTS = [
  'エラー',
  '入力内容',
  'このメンバータイプではこの日時で予約することは出来ません',
  'ログインして予約',
  'すでに予約済み',
  '予約受付前',
]

const isCalendarUrl = (url: string): boolean => {
  try {
    return new URL(url).pathname.startsWith('/r/shop/3094/calendar/')
  } catch {
    return false
  }
}

const maskLabolaFieldForLog = (key: string, value: string): string => {
  const lower = key.toLowerCase()
  if (lower.includes('password')) return '***'
  if (lower.includes('csrf')) return '***'
  if (lower.includes('email')) return '***'
  if (lower.includes('phone')) return '***'
  if (lower.includes('mobile')) return '***'
  if (value.length <= 12) return value
  return `${value.slice(0, 4)}...${value.slice(-2)}`
}

const toMaskedFormLog = (form: URLSearchParams): Record<string, string> => {
  const masked: Record<string, string> = {}
  for (const [key, value] of form.entries()) {
    masked[key] = maskLabolaFieldForLog(key, value)
  }
  return masked
}

const toCookieSummary = (cookieHeader?: string): string => {
  if (!cookieHeader) return 'none'
  return cookieHeader
    .split(';')
    .map((pair) => pair.trim().split('=')[0])
    .filter(Boolean)
    .join(', ')
}

const safeResponsePreview = async (
  response: Response
): Promise<{ bodySize: number; preview: string }> => {
  try {
    const body = await response.clone().text()
    return {
      bodySize: body.length,
      preview: body.slice(0, LABOLA_HTTP_BODY_PREVIEW_LIMIT),
    }
  } catch {
    return { bodySize: 0, preview: '' }
  }
}

const readHtmlAttr = (tag: string, attr: string): string | undefined => {
  const matched = tag.match(new RegExp(`\\b${attr}=(?:\"([^\"]*)\"|'([^']*)')`, 'i'))
  return matched?.[1] ?? matched?.[2]
}

const normalizeHtmlText = (raw: string): string => {
  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

const extractTitleText = (html: string): string | undefined => {
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)
  if (!titleMatch) return undefined
  const text = normalizeHtmlText(titleMatch[1])
  return text || undefined
}

const extractTagTexts = (html: string, tagName: 'h1' | 'h2' | 'h3'): string[] => {
  const texts: string[] = []
  const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi')
  for (const matched of html.matchAll(pattern)) {
    const text = normalizeHtmlText(matched[1])
    if (!text) continue
    texts.push(text)
    if (texts.length >= LABOLA_CONFIRM_DIAGNOSTIC_MAX_TEXTS) {
      break
    }
  }
  return texts
}

const extractFlashMessages = (html: string): string[] => {
  const texts: string[] = []
  const pattern =
    /<li\b[^>]*class=(?:\"|')[^"']*\b(?:info|error|success|warning)\b[^"']*(?:\"|')[^>]*>([\s\S]*?)<\/li>/gi
  for (const matched of html.matchAll(pattern)) {
    const text = normalizeHtmlText(matched[1])
    if (!text) continue
    texts.push(text)
    if (texts.length >= LABOLA_CONFIRM_DIAGNOSTIC_MAX_TEXTS) {
      break
    }
  }
  return texts
}

const extractFormDiagnostics = (
  html: string
): Array<{ action?: string; method: string; submitNames: string[] }> => {
  const forms: Array<{ action?: string; method: string; submitNames: string[] }> = []
  for (const matched of html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/gi)) {
    const block = matched[0]
    const openTag = block.match(/<form\b[^>]*>/i)?.[0] ?? ''
    const action = readHtmlAttr(openTag, 'action')
    const method = (readHtmlAttr(openTag, 'method') ?? 'GET').toUpperCase()
    const submitNames: string[] = []
    for (const inputMatched of block.matchAll(/<input\b[^>]*>/gi)) {
      const inputTag = inputMatched[0]
      const type = (readHtmlAttr(inputTag, 'type') ?? 'text').toLowerCase()
      if (type !== 'submit') continue
      const name = readHtmlAttr(inputTag, 'name')
      if (!name) continue
      submitNames.push(name)
      if (submitNames.length >= LABOLA_CONFIRM_DIAGNOSTIC_MAX_TEXTS) {
        break
      }
    }
    forms.push({ action, method, submitNames })
    if (forms.length >= LABOLA_CONFIRM_DIAGNOSTIC_MAX_TEXTS) {
      break
    }
  }
  return forms
}

const collectHintMatches = (html: string, hints: string[]): string[] => {
  return hints.filter((hint) => html.includes(hint))
}

const extractLoginErrorText = (html: string): string | undefined => {
  const matched = html.match(/<ul\b[^>]*class=(?:\"|')[^"']*\berrorlist\b[^"']*(?:\"|')[^>]*>[\s\S]*?<li>([\s\S]*?)<\/li>/i)
  if (!matched) return undefined
  return normalizeHtmlText(matched[1]) || undefined
}

const parseBoolLike = (value: string | undefined): boolean => {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

export const isLabolaLoginDiagnosticsEnabled = (env: LabolaYoyogiClientEnv): boolean => {
  if (parseBoolLike(env.LABOLA_YOYOGI_LOGIN_DIAGNOSTIC)) {
    return true
  }
  const level = env.LABOLA_YOYOGI_DIAGNOSTIC_LEVEL?.trim().toLowerCase()
  return level === 'full' || level === 'debug' || level === 'trace'
}

const toMaskedRequestHeaders = (headers: Record<string, string>): Record<string, string> => {
  const masked: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase()
    if (lower === 'cookie') {
      masked[key] = `keys:${toCookieSummary(value)}`
      continue
    }
    if (lower.includes('csrf') || lower.includes('authorization')) {
      masked[key] = '***'
      continue
    }
    masked[key] = value
  }
  return masked
}

type SetCookieDiagnostics = {
  name: string
  valueLength: number
  secure: boolean
  httpOnly: boolean
  sameSite?: string
  domain?: string
  path?: string
  maxAge?: string
  hasExpires: boolean
}

const parseSetCookieDiagnostics = (cookie: string): SetCookieDiagnostics | undefined => {
  const parts = cookie
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length === 0) return undefined
  const first = parts[0]
  const firstSeparator = first.indexOf('=')
  if (firstSeparator <= 0) return undefined
  const name = first.slice(0, firstSeparator).trim()
  const value = first.slice(firstSeparator + 1).trim()
  if (!name) return undefined

  const diagnostics: SetCookieDiagnostics = {
    name,
    valueLength: value.length,
    secure: false,
    httpOnly: false,
    hasExpires: false,
  }

  for (const attr of parts.slice(1)) {
    const separator = attr.indexOf('=')
    const attrKey = (separator >= 0 ? attr.slice(0, separator) : attr).trim().toLowerCase()
    const attrValue = (separator >= 0 ? attr.slice(separator + 1) : '').trim()

    if (attrKey === 'secure') diagnostics.secure = true
    if (attrKey === 'httponly') diagnostics.httpOnly = true
    if (attrKey === 'samesite') diagnostics.sameSite = attrValue
    if (attrKey === 'domain') diagnostics.domain = attrValue
    if (attrKey === 'path') diagnostics.path = attrValue
    if (attrKey === 'max-age') diagnostics.maxAge = attrValue
    if (attrKey === 'expires') diagnostics.hasExpires = true
  }

  return diagnostics
}

const collectHeaderValues = (headers: Headers): Record<string, string[]> => {
  const collected: Record<string, string[]> = {}
  for (const [key, value] of headers.entries()) {
    if (key.toLowerCase() === 'set-cookie') continue
    if (!collected[key]) {
      collected[key] = []
    }
    collected[key].push(value)
  }
  return collected
}

const collectBodySignals = (body: string): string[] => {
  return LABOLA_LOGIN_DIAGNOSTIC_BODY_SIGNAL_PATTERNS.filter(({ pattern }) => pattern.test(body)).map(
    ({ key }) => key
  )
}

const buildLikelyRejectionReasons = (args: {
  response: Response
  body: string
  bodySignals: string[]
  loginErrorText?: string
}): string[] => {
  const reasons = new Set<string>()
  const cfMitigated = args.response.headers.get('cf-mitigated')
  if (cfMitigated) reasons.add(`cf-mitigated:${cfMitigated}`)
  if (args.bodySignals.length > 0) reasons.add('challenge-signal-detected')
  if (args.loginErrorText?.includes('ログイン出来ません。')) reasons.add('generic-login-rejected')
  if (args.body.includes(LABOLA_YOYOGI_INVALID_CREDENTIALS_TEXT)) reasons.add('credential-message-detected')
  if (args.body.includes(LABOLA_YOYOGI_INVALID_CREDENTIALS_ALT_TEXT))
    reasons.add('credential-message-alt-detected')
  if (args.body.includes(LABOLA_YOYOGI_LOGIN_PAGE_TITLE_TEXT)) reasons.add('returned-to-login-page')
  if (reasons.size === 0) reasons.add('unknown')
  return Array.from(reasons)
}

export const emitLabolaLoginDiagnostics = (args: {
  reserveId: string
  step: 'login-page-get' | 'login-post' | 'login-post-redirect-get'
  response: Response
  body: string
  requestHeaders?: Record<string, string>
  requestCookieHeader?: string
  loginErrorText?: string
}): void => {
  const setCookieHeaders = getResponseSetCookieHeaders(args.response)
  const setCookieDiagnostics = setCookieHeaders
    .map(parseSetCookieDiagnostics)
    .filter((cookie): cookie is SetCookieDiagnostics => Boolean(cookie))
  const bodySignals = collectBodySignals(args.body)
  const likelyRejectionReasons = buildLikelyRejectionReasons({
    response: args.response,
    body: args.body,
    bodySignals,
    loginErrorText: args.loginErrorText,
  })
  console.warn('Labolaログイン診断', {
    id: args.reserveId,
    step: args.step,
    status: args.response.status,
    location: args.response.headers.get('location') ?? undefined,
    redirected: args.response.redirected,
    finalUrl: args.response.url,
    responseHeaders: collectHeaderValues(args.response.headers),
    setCookieCount: setCookieHeaders.length,
    setCookieNames: setCookieDiagnostics.map((cookie) => cookie.name),
    setCookieDiagnostics,
    requestHeaderKeys: args.requestHeaders ? Object.keys(args.requestHeaders) : [],
    requestHeaders: args.requestHeaders ? toMaskedRequestHeaders(args.requestHeaders) : undefined,
    requestCookieKeys: toCookieSummary(args.requestCookieHeader),
    bodySignals,
    likelyRejectionReasons,
    bodySize: args.body.length,
    bodyPreview: args.body.slice(0, LABOLA_HTTP_BODY_PREVIEW_LIMIT),
    title: extractTitleText(args.body),
    loginErrorText: args.loginErrorText,
  })
}

const buildCustomerConfirmResponseDiagnostics = (
  response: Response,
  html: string
): {
  finalUrl: string
  redirected: boolean
  title?: string
  headings: string[]
  flashMessages: string[]
  formCount: number
  forms: Array<{ action?: string; method: string; submitNames: string[] }>
  successHints: string[]
  failureHints: string[]
  likelyResult: 'success_candidate' | 'failure_candidate' | 'mixed_signals' | 'unknown'
} => {
  const successHints = collectHintMatches(html, LABOLA_YOYOGI_CONFIRM_SUCCESS_HINTS)
  const failureHints = collectHintMatches(html, LABOLA_YOYOGI_CONFIRM_FAILURE_HINTS)
  let likelyResult: 'success_candidate' | 'failure_candidate' | 'mixed_signals' | 'unknown' =
    'unknown'
  if (successHints.length > 0 && failureHints.length === 0) {
    likelyResult = 'success_candidate'
  } else if (failureHints.length > 0 && successHints.length === 0) {
    likelyResult = 'failure_candidate'
  } else if (successHints.length > 0 && failureHints.length > 0) {
    likelyResult = 'mixed_signals'
  }

  const forms = extractFormDiagnostics(html)
  return {
    finalUrl: response.url,
    redirected: response.redirected,
    title: extractTitleText(html),
    headings: [
      ...extractTagTexts(html, 'h1'),
      ...extractTagTexts(html, 'h2'),
      ...extractTagTexts(html, 'h3'),
    ].slice(0, LABOLA_CONFIRM_DIAGNOSTIC_MAX_TEXTS),
    flashMessages: extractFlashMessages(html),
    formCount: forms.length,
    forms,
    successHints,
    failureHints,
    likelyResult,
  }
}

type CustomerConfirmResponseDiagnostics = ReturnType<typeof buildCustomerConfirmResponseDiagnostics>

const isCustomerConfirmFinishUrl = (url: string): boolean => {
  try {
    return new URL(url).pathname.startsWith('/r/booking/rental/finish/')
  } catch {
    return false
  }
}

const ensureCustomerConfirmSucceeded = (diagnostics: CustomerConfirmResponseDiagnostics): void => {
  const confirmedByFinishUrl =
    isCustomerConfirmFinishUrl(diagnostics.finalUrl) && diagnostics.failureHints.length === 0
  const confirmedByHints =
    diagnostics.likelyResult === 'success_candidate' && diagnostics.formCount === 0

  if (!confirmedByFinishUrl && !confirmedByHints) {
    throw new Error(ERROR_CUSTOMER_CONFIRM_UNCERTAIN)
  }
}

export const buildLoginForm = (credentials: {
  username: string
  password: string
  csrfMiddlewareToken?: string
}): URLSearchParams => {
  const form = new URLSearchParams({
    membership_code: credentials.username,
    password: credentials.password,
    member_type_id: '397',
  })
  if (credentials.csrfMiddlewareToken) {
    form.set('csrfmiddlewaretoken', credentials.csrfMiddlewareToken)
  }
  return form
}

export const extractCookieHeader = (setCookieHeader: string): string | undefined => {
  const setCookies = setCookieHeader.split(/,(?=\s*[A-Za-z0-9!#$%&'*+.^_`|~-]+=)/)
  const cookiePairs = setCookies
    .map((cookie) => cookie.trim().split(';')[0]?.trim())
    .filter((cookie): cookie is string => Boolean(cookie && cookie.includes('=')))

  if (cookiePairs.length === 0) {
    return undefined
  }
  return cookiePairs.join('; ')
}

export const getResponseSetCookieHeaders = (response: Response): string[] => {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[]
    getAll?: (name: string) => string[]
  }

  if (typeof headers.getSetCookie === 'function') {
    const values = headers.getSetCookie().map((value) => value.trim()).filter(Boolean)
    if (values.length > 0) {
      return values
    }
  }

  if (typeof headers.getAll === 'function') {
    const values = headers
      .getAll('Set-Cookie')
      .map((value) => value.trim())
      .filter(Boolean)
    if (values.length > 0) {
      return values
    }
  }

  const fallback = response.headers.get('set-cookie')
  if (!fallback) {
    return []
  }
  return [fallback]
}

export const getResponseSetCookieHeader = (response: Response): string | undefined => {
  const setCookies = getResponseSetCookieHeaders(response)
  if (setCookies.length === 0) {
    return undefined
  }
  return setCookies.join(', ')
}

export const mergeCookieHeader = (
  currentCookieHeader: string | undefined,
  setCookieHeader: string | undefined
): string | undefined => {
  const extracted = setCookieHeader ? extractCookieHeader(setCookieHeader) : undefined
  if (!currentCookieHeader) {
    return extracted
  }
  if (!extracted) {
    return currentCookieHeader
  }

  const parseCookiePair = (cookie: string): { key: string; value: string } | undefined => {
    const trimmed = cookie.trim()
    if (!trimmed) return undefined
    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex <= 0) return undefined
    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim()
    if (!key || !value) return undefined
    return { key, value }
  }

  const merged = new Map<string, string>()
  for (const cookie of currentCookieHeader.split(';').map((part) => part.trim())) {
    const parsed = parseCookiePair(cookie)
    if (!parsed) continue
    merged.set(parsed.key, parsed.value)
  }
  for (const cookie of extracted.split(';').map((part) => part.trim())) {
    const parsed = parseCookiePair(cookie)
    if (!parsed) continue
    merged.set(parsed.key, parsed.value)
  }

  return Array.from(merged.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join('; ')
}

export const postLogin = async (
  reserveId: string,
  form: URLSearchParams,
  cookieHeader?: string,
  options?: {
    loginDiagnosticsEnabled?: boolean
  }
): Promise<Response> => {
  try {
    // NOTE:
    // Upstream login can reject with a generic credential error depending on
    // request header fingerprint. Keep the same header order as the known-good
    // manual request profile.
    const headers: Record<string, string> = {
      'User-Agent': LABOLA_LOGIN_USER_AGENT,
      Accept: LABOLA_LOGIN_ACCEPT,
      'Accept-Language': LABOLA_LOGIN_ACCEPT_LANGUAGE,
      'Content-Type': 'application/x-www-form-urlencoded',
      Origin: LABOLA_YOYOGI_ORIGIN,
      Referer: LABOLA_YOYOGI_LOGIN_URL,
    }
    if (cookieHeader) {
      headers.Cookie = cookieHeader
    }
    const csrfToken = form.get('csrfmiddlewaretoken')
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken
    }
    console.log('Labola HTTP Request', {
      id: reserveId,
      step: 'login-post',
      method: 'POST',
      url: LABOLA_YOYOGI_LOGIN_URL,
      cookieKeys: toCookieSummary(cookieHeader),
      payload: toMaskedFormLog(form),
    })

    const response = await fetch(LABOLA_YOYOGI_LOGIN_URL, {
      method: 'POST',
      headers,
      body: form.toString(),
      redirect: 'manual',
    })
    const responseBody = await response.clone().text()
    const locationHeader = response.headers.get('location') ?? undefined
    console.log('Labola HTTP Response', {
      id: reserveId,
      step: 'login-post',
      status: response.status,
      location: locationHeader,
      bodySize: responseBody.length,
      bodyPreview: responseBody.slice(0, LABOLA_HTTP_BODY_PREVIEW_LIMIT),
    })
    const loginErrorText = extractLoginErrorText(responseBody)
    if (options?.loginDiagnosticsEnabled) {
      emitLabolaLoginDiagnostics({
        reserveId,
        step: 'login-post',
        response,
        body: responseBody,
        requestHeaders: headers,
        requestCookieHeader: cookieHeader,
        loginErrorText,
      })
    }
    if (response.status >= 300 && response.status < 400) {
      return response
    }
    if (!response.ok) {
      if (response.status >= 500) {
        throw new Error(ERROR_LOGIN_POST_UPSTREAM)
      }
      const bodyPreview = responseBody.slice(0, 200)
      console.error('LabolaログインPOSTが4xxで失敗しました', {
        id: reserveId,
        status: response.status,
        bodyPreview,
      })
      throw new Error(`ログインPOSTに失敗しました: ${response.status}`)
    }
    if (
      responseBody.includes(LABOLA_YOYOGI_INVALID_CREDENTIALS_TEXT) ||
      responseBody.includes(LABOLA_YOYOGI_INVALID_CREDENTIALS_ALT_TEXT) ||
      responseBody.includes(LABOLA_YOYOGI_LOGIN_PAGE_TITLE_TEXT)
    ) {
      console.warn('Labolaログイン失敗詳細', {
        id: reserveId,
        step: 'login-post',
        loginErrorText,
      })
      throw new Error(ERROR_LOGIN_INVALID_CREDENTIALS)
    }
    return response
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.startsWith('ログインPOSTに失敗しました:') ||
        error.message === ERROR_LOGIN_INVALID_CREDENTIALS ||
        error.message === ERROR_LOGIN_POST_UPSTREAM)
    ) {
      throw error
    }
    console.error('LabolaログインPOST中に通信エラーが発生しました', {
      id: reserveId,
      error,
    })
    throw new Error(ERROR_LOGIN_POST_NETWORK)
  }
}

export const prepareLogin = async (
  env: LabolaYoyogiClientEnv,
  reserveId: string
): Promise<{
  username: string
  password: string
  csrfMiddlewareToken?: string
  loginSetCookieHeader?: string
}> => {
  const username = env.LABOLA_YOYOGI_USERNAME
  const password = env.LABOLA_YOYOGI_PASSWORD
  if (!username || !password) {
    throw new Error(ERROR_MISSING_CREDENTIALS)
  }

  console.log('Labola認証情報を読み込みました', {
    id: reserveId,
    usernamePreview: username.slice(0, 3),
    hasPassword: Boolean(password),
  })

  let loginPageResponse: Response
  try {
    console.log('Labola HTTP Request', {
      id: reserveId,
      step: 'login-page-get',
      method: 'GET',
      url: LABOLA_YOYOGI_LOGIN_URL,
      payload: null,
    })
    loginPageResponse = await fetch(LABOLA_YOYOGI_LOGIN_URL, { method: 'GET' })
  } catch (error) {
    console.error('Labolaログインページ取得中に通信エラーが発生しました', {
      id: reserveId,
      error,
    })
    throw new Error(ERROR_LOGIN_PAGE_NETWORK)
  }
  if (!loginPageResponse.ok) {
    throw new Error(`ログインページ取得に失敗しました: ${loginPageResponse.status}`)
  }
  const loginPagePreview = await safeResponsePreview(loginPageResponse)
  console.log('Labola HTTP Response', {
    id: reserveId,
    step: 'login-page-get',
    status: loginPageResponse.status,
    bodySize: loginPagePreview.bodySize,
    bodyPreview: loginPagePreview.preview,
  })
  console.log('Labolaログインページの取得に成功しました', {
    id: reserveId,
    status: loginPageResponse.status,
  })
  const loginPageHtml = await loginPageResponse.text()
  const csrfMiddlewareToken = extractFormValues(loginPageHtml).csrfmiddlewaretoken
  const loginSetCookieHeader = getResponseSetCookieHeader(loginPageResponse)
  const loginCookies = loginSetCookieHeader ? extractCookieHeader(loginSetCookieHeader) : undefined
  const loginDiagnosticsEnabled = isLabolaLoginDiagnosticsEnabled(env)
  console.log('LabolaログインページのCSRFトークン抽出結果', {
    id: reserveId,
    hasCsrfMiddlewareToken: Boolean(csrfMiddlewareToken),
    loginPageCookieKeys: toCookieSummary(loginCookies),
  })
  if (loginDiagnosticsEnabled) {
    emitLabolaLoginDiagnostics({
      reserveId,
      step: 'login-page-get',
      response: loginPageResponse,
      body: loginPageHtml,
    })
  }

  return {
    username,
    password,
    csrfMiddlewareToken,
    loginSetCookieHeader,
  }
}

export const buildBookingUrl = (
  siteCourtNo: string,
  date: string,
  startTime: string,
  endTime: string
): string => {
  const compactDate = date.replaceAll('-', '')
  const compactStart = startTime.replace(':', '')
  const compactEnd = endTime.replace(':', '')
  return `${LABOLA_YOYOGI_BASE_ORIGIN}/r/booking/rental/shop/3094/facility/${siteCourtNo}/${compactDate}-${compactStart}-${compactEnd}/customer-type/`
}

export const extractFormValues = (html: string): Record<string, string> => {
  const values: Record<string, string> = {}
  const readAttr = (tag: string, attr: string): string | undefined => {
    const matched = tag.match(new RegExp(`\\b${attr}=(?:\"([^\"]*)\"|'([^']*)')`, 'i'))
    return matched?.[1] ?? matched?.[2]
  }

  for (const matched of html.matchAll(/<input\b[^>]*>/gi)) {
    const tag = matched[0]
    const name = readAttr(tag, 'name')
    if (!name) continue

    const type = readAttr(tag, 'type')?.toLowerCase() ?? 'text'
    if ((type === 'radio' || type === 'checkbox') && !/\bchecked\b/i.test(tag)) {
      continue
    }

    const value = readAttr(tag, 'value')
    if (value !== undefined) {
      values[name] = value
    } else if (type === 'checkbox') {
      values[name] = 'on'
    }
  }

  for (const matched of html.matchAll(/<select\b[^>]*>[\s\S]*?<\/select>/gi)) {
    const block = matched[0]
    const selectOpenTag = block.match(/<select\b[^>]*>/i)?.[0] ?? ''
    const name = readAttr(selectOpenTag, 'name')
    if (!name) continue

    let selected: string | undefined
    let first: string | undefined
    for (const option of block.matchAll(/<option\b[^>]*>/gi)) {
      const optionTag = option[0]
      const optionValue = readAttr(optionTag, 'value')
      if (!optionValue) continue
      if (!first) {
        first = optionValue
      }
      if (/\bselected\b/i.test(optionTag)) {
        selected = optionValue
        break
      }
    }

    if (selected) {
      values[name] = selected
    } else if (first) {
      values[name] = first
    }
  }

  return values
}

type CustomerInfoFallbackEnv = {
  LABOLA_YOYOGI_NAME?: string
  LABOLA_YOYOGI_DISPLAY_NAME?: string
  LABOLA_YOYOGI_EMAIL?: string
  LABOLA_YOYOGI_ADDRESS?: string
  LABOLA_YOYOGI_MOBILE_NUMBER?: string
}

export const fillCustomerInfoRequiredValues = (
  values: Record<string, string>,
  env: CustomerInfoFallbackEnv
): Record<string, string> => {
  const filled = { ...values }

  if (!filled.name) {
    filled.name = env.LABOLA_YOYOGI_NAME ?? ''
  }
  if (!filled.display_name) {
    filled.display_name = env.LABOLA_YOYOGI_DISPLAY_NAME ?? ''
  }
  if (!filled.email) {
    filled.email = env.LABOLA_YOYOGI_EMAIL ?? ''
  }
  if (!filled.email_confirm) {
    filled.email_confirm = env.LABOLA_YOYOGI_EMAIL ?? filled.email ?? ''
  }
  if (!filled.address) {
    filled.address = env.LABOLA_YOYOGI_ADDRESS ?? ''
  }
  if (!filled.mobile_number) {
    filled.mobile_number = env.LABOLA_YOYOGI_MOBILE_NUMBER ?? ''
  }

  return filled
}

const mergeFormValues = (
  defaults: Record<string, string>,
  overrides: URLSearchParams
): URLSearchParams => {
  const merged = new URLSearchParams()
  for (const [key, value] of Object.entries(defaults)) {
    merged.set(key, value)
  }
  for (const [key, value] of overrides.entries()) {
    merged.set(key, value)
  }
  return merged
}

const ensurePostSuccess = (
  response: Response,
  action: 'customer-info' | 'customer-confirm'
): void => {
  if (!response.ok) {
    throw new Error(`${action} 送信に失敗しました: ${response.status}`)
  }
}

export const submitCustomerForms = async (
  reserveId: string,
  customerInfoForm: URLSearchParams,
  customerConfirmForm: URLSearchParams,
  cookieHeader?: string,
  options?: {
    skipFinalSubmit?: boolean
  }
): Promise<void> => {
  if (!cookieHeader) {
    throw new Error('customer-info/customer-confirm 送信に必要なCookieがありません')
  }

  const customerInfoHeaders: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Referer: LABOLA_YOYOGI_CUSTOMER_INFO_URL,
    Origin: LABOLA_YOYOGI_ORIGIN,
  }
  customerInfoHeaders.Cookie = cookieHeader
  const customerInfoCsrfToken = customerInfoForm.get('csrfmiddlewaretoken')
  if (customerInfoCsrfToken) {
    customerInfoHeaders['X-CSRFToken'] = customerInfoCsrfToken
  }

  let customerInfoResponse: Response
  try {
    console.log('Labola HTTP Request', {
      id: reserveId,
      step: 'customer-info-post',
      method: 'POST',
      url: LABOLA_YOYOGI_CUSTOMER_INFO_URL,
      cookieKeys: toCookieSummary(cookieHeader),
      payload: toMaskedFormLog(customerInfoForm),
    })
    customerInfoResponse = await fetch(LABOLA_YOYOGI_CUSTOMER_INFO_URL, {
      method: 'POST',
      headers: customerInfoHeaders,
      body: customerInfoForm.toString(),
    })
  } catch {
    throw new Error('customer-info 送信中に通信エラーが発生しました')
  }
  const customerInfoPreview = await safeResponsePreview(customerInfoResponse)
  console.log('Labola HTTP Response', {
    id: reserveId,
    step: 'customer-info-post',
    status: customerInfoResponse.status,
    bodySize: customerInfoPreview.bodySize,
    bodyPreview: customerInfoPreview.preview,
  })
  ensurePostSuccess(customerInfoResponse, 'customer-info')
  const customerInfoSetCookieHeader = getResponseSetCookieHeader(customerInfoResponse)
  if (
    (customerInfoResponse.redirected && isCalendarUrl(customerInfoResponse.url)) ||
    customerInfoPreview.preview.includes(LABOLA_YOYOGI_ALREADY_RESERVED_TEXT) ||
    customerInfoPreview.preview.includes(LABOLA_YOYOGI_CALENDAR_PAGE_TITLE_TEXT) ||
    (customerInfoSetCookieHeader ?? '').includes(LABOLA_YOYOGI_ALREADY_RESERVED_UNICODE_TEXT)
  ) {
    throw new Error('希望時間帯は予約不可（すでに予約済み）')
  }
  const customerConfirmDefaults = extractFormValues(await customerInfoResponse.text())
  const mergedCustomerConfirmForm = mergeFormValues(customerConfirmDefaults, customerConfirmForm)
  const customerConfirmCookieHeader =
    mergeCookieHeader(cookieHeader, customerInfoSetCookieHeader) ?? cookieHeader
  const customerConfirmHeaders: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Referer: LABOLA_YOYOGI_CUSTOMER_INFO_URL,
    Origin: LABOLA_YOYOGI_ORIGIN,
    Cookie: customerConfirmCookieHeader,
  }
  const customerConfirmCsrfToken = mergedCustomerConfirmForm.get('csrfmiddlewaretoken')
  if (customerConfirmCsrfToken) {
    customerConfirmHeaders['X-CSRFToken'] = customerConfirmCsrfToken
  }
  if (options?.skipFinalSubmit) {
    console.log('Dry run: customer-confirm最終送信をスキップします', {
      id: reserveId,
      step: 'customer-confirm-post',
    })
    return
  }

  let customerConfirmResponse: Response
  try {
    console.log('Labola HTTP Request', {
      id: reserveId,
      step: 'customer-confirm-post',
      method: 'POST',
      url: LABOLA_YOYOGI_CUSTOMER_CONFIRM_URL,
      cookieKeys: toCookieSummary(customerConfirmCookieHeader),
      payload: toMaskedFormLog(mergedCustomerConfirmForm),
    })
    customerConfirmResponse = await fetch(LABOLA_YOYOGI_CUSTOMER_CONFIRM_URL, {
      method: 'POST',
      headers: customerConfirmHeaders,
      body: mergedCustomerConfirmForm.toString(),
    })
  } catch {
    throw new Error('customer-confirm 送信中に通信エラーが発生しました')
  }
  const customerConfirmPreview = await safeResponsePreview(customerConfirmResponse)
  console.log('Labola HTTP Response', {
    id: reserveId,
    step: 'customer-confirm-post',
    status: customerConfirmResponse.status,
    bodySize: customerConfirmPreview.bodySize,
    bodyPreview: customerConfirmPreview.preview,
  })
  ensurePostSuccess(customerConfirmResponse, 'customer-confirm')

  try {
    const customerConfirmHtml = await customerConfirmResponse.clone().text()
    const diagnostics = buildCustomerConfirmResponseDiagnostics(
      customerConfirmResponse,
      customerConfirmHtml
    )
    console.log('Labola customer-confirm response diagnostics', {
      id: reserveId,
      step: 'customer-confirm-post',
      ...diagnostics,
    })
    ensureCustomerConfirmSucceeded(diagnostics)
  } catch (error) {
    if (error instanceof Error && error.message === ERROR_CUSTOMER_CONFIRM_UNCERTAIN) {
      throw error
    }
    console.warn('Labola customer-confirm response diagnostics 抽出に失敗しました', {
      id: reserveId,
      step: 'customer-confirm-post',
      error,
    })
    throw new Error(ERROR_CUSTOMER_CONFIRM_UNCERTAIN)
  }
}

const isCustomerPost5xxError = (message: string): boolean => {
  return /^customer-(?:info|confirm) 送信に失敗しました: 5\d\d$/.test(message)
}

export const shouldRetryError = (error: Error): boolean => {
  return (
    error.message.includes('相手側サーバ障害') ||
    error.message.includes('通信エラーが発生しました') ||
    isCustomerPost5xxError(error.message)
  )
}
