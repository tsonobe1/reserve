export type LabolaYoyogiEnv = {
  LABOLA_YOYOGI_USERNAME?: string
  LABOLA_YOYOGI_PASSWORD?: string
}

const LABOLA_YOYOGI_LOGIN_URL = 'https://labola.jp/r/shop/3094/member/login/'
const LABOLA_YOYOGI_CUSTOMER_INFO_URL =
  'https://labola.jp/r/booking/rental/shop/3094/customer-info/'
const LABOLA_YOYOGI_CUSTOMER_CONFIRM_URL =
  'https://labola.jp/r/booking/rental/shop/3094/customer-confirm/'
const LABOLA_YOYOGI_INVALID_CREDENTIALS_TEXT = '会員IDまたはパスワードが正しくありません'

const ERROR_MISSING_CREDENTIALS = 'LABOLA_YOYOGI_USERNAME / LABOLA_YOYOGI_PASSWORD が未設定です'
const ERROR_LOGIN_POST_NETWORK = 'ログインPOST中に通信エラーが発生しました'
const ERROR_LOGIN_PAGE_NETWORK = 'ログインページ取得中に通信エラーが発生しました'
const ERROR_LOGIN_INVALID_CREDENTIALS =
  'ログインに失敗しました: IDまたはパスワードを確認してください'
const ERROR_LOGIN_POST_UPSTREAM = '相手側サーバ障害のためログインできませんでした'
const LABOLA_HTTP_BODY_PREVIEW_LIMIT = 300

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

const safeResponsePreview = async (response: Response): Promise<{ bodySize: number; preview: string }> => {
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

export const buildLabolaYoyogiLoginForm = (credentials: {
  username: string
  password: string
  csrfMiddlewareToken?: string
}): URLSearchParams => {
  const form = new URLSearchParams({
    username: credentials.username,
    password: credentials.password,
  })
  if (credentials.csrfMiddlewareToken) {
    form.set('csrfmiddlewaretoken', credentials.csrfMiddlewareToken)
  }
  return form
}

export const extractLabolaYoyogiCookieHeader = (setCookieHeader: string): string | undefined => {
  const cookiePairs = setCookieHeader.match(/\b(?:csrftoken|sessionid)=[^;,\s]+/g)
  if (!cookiePairs || cookiePairs.length === 0) {
    return undefined
  }
  return cookiePairs.join('; ')
}

export const mergeLabolaYoyogiCookieHeader = (
  currentCookieHeader: string | undefined,
  setCookieHeader: string | undefined
): string | undefined => {
  const extracted = setCookieHeader ? extractLabolaYoyogiCookieHeader(setCookieHeader) : undefined
  if (!currentCookieHeader) {
    return extracted
  }
  if (!extracted) {
    return currentCookieHeader
  }

  const merged = new Map<string, string>()
  for (const cookie of currentCookieHeader.split(';').map((part) => part.trim())) {
    const [key, value] = cookie.split('=')
    if (!key || !value) continue
    merged.set(key, value)
  }
  for (const cookie of extracted.split(';').map((part) => part.trim())) {
    const [key, value] = cookie.split('=')
    if (!key || !value) continue
    merged.set(key, value)
  }

  return Array.from(merged.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join('; ')
}

export const postLabolaYoyogiLogin = async (
  reserveId: string,
  form: URLSearchParams,
  cookieHeader?: string
): Promise<Response> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: LABOLA_YOYOGI_LOGIN_URL,
      Origin: 'https://labola.jp',
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
    })
    const responsePreview = await safeResponsePreview(response)
    console.log('Labola HTTP Response', {
      id: reserveId,
      step: 'login-post',
      status: response.status,
      bodySize: responsePreview.bodySize,
      bodyPreview: responsePreview.preview,
    })
    if (!response.ok) {
      if (response.status >= 500) {
        throw new Error(ERROR_LOGIN_POST_UPSTREAM)
      }
      const bodyPreview = (await response.clone().text()).slice(0, 200)
      console.error('LabolaログインPOSTが4xxで失敗しました', {
        id: reserveId,
        status: response.status,
        bodyPreview,
      })
      throw new Error(`ログインPOSTに失敗しました: ${response.status}`)
    }
    const responseBody = await response.clone().text()
    if (responseBody.includes(LABOLA_YOYOGI_INVALID_CREDENTIALS_TEXT)) {
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

export const prepareLabolaYoyogiLogin = async (
  env: LabolaYoyogiEnv,
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
  const csrfMiddlewareToken = extractLabolaYoyogiFormValues(loginPageHtml).csrfmiddlewaretoken
  console.log('LabolaログインページのCSRFトークン抽出結果', {
    id: reserveId,
    hasCsrfMiddlewareToken: Boolean(csrfMiddlewareToken),
  })

  return {
    username,
    password,
    csrfMiddlewareToken,
    loginSetCookieHeader: loginPageResponse.headers.get('set-cookie') ?? undefined,
  }
}

export const buildLabolaYoyogiBookingUrl = (
  siteCourtNo: string,
  date: string,
  startTime: string,
  endTime: string
): string => {
  const compactDate = date.replaceAll('-', '')
  const compactStart = startTime.replace(':', '')
  const compactEnd = endTime.replace(':', '')
  return `https://labola.jp/r/booking/rental/shop/3094/facility/${siteCourtNo}/${compactDate}-${compactStart}-${compactEnd}/customer-type/`
}

export const extractLabolaYoyogiFormValues = (html: string): Record<string, string> => {
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

type LabolaYoyogiCustomerInfoFallbackEnv = {
  LABOLA_YOYOGI_NAME?: string
  LABOLA_YOYOGI_DISPLAY_NAME?: string
  LABOLA_YOYOGI_EMAIL?: string
  LABOLA_YOYOGI_ADDRESS?: string
  LABOLA_YOYOGI_MOBILE_NUMBER?: string
}

export const fillLabolaYoyogiCustomerInfoRequiredValues = (
  values: Record<string, string>,
  env: LabolaYoyogiCustomerInfoFallbackEnv
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

const mergeLabolaYoyogiFormValues = (
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

const ensureLabolaYoyogiPostSuccess = (
  response: Response,
  action: 'customer-info' | 'customer-confirm'
): void => {
  if (!response.ok) {
    throw new Error(`${action} 送信に失敗しました: ${response.status}`)
  }
}

export const submitLabolaYoyogiCustomerForms = async (
  reserveId: string,
  customerInfoForm: URLSearchParams,
  customerConfirmForm: URLSearchParams,
  cookieHeader?: string
): Promise<void> => {
  if (!cookieHeader) {
    throw new Error('customer-info/customer-confirm 送信に必要なCookieがありません')
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  }
  headers.Cookie = cookieHeader

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
      headers,
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
  ensureLabolaYoyogiPostSuccess(customerInfoResponse, 'customer-info')
  if (
    (customerInfoResponse.redirected &&
      customerInfoResponse.url.includes('https://labola.jp/r/shop/3094/calendar/')) ||
    customerInfoPreview.preview.includes('すでに予約済みです')
  ) {
    throw new Error('希望時間帯は予約不可（すでに予約済み）')
  }
  const customerConfirmDefaults = extractLabolaYoyogiFormValues(await customerInfoResponse.text())
  const mergedCustomerConfirmForm = mergeLabolaYoyogiFormValues(
    customerConfirmDefaults,
    customerConfirmForm
  )

  let customerConfirmResponse: Response
  try {
    console.log('Labola HTTP Request', {
      id: reserveId,
      step: 'customer-confirm-post',
      method: 'POST',
      url: LABOLA_YOYOGI_CUSTOMER_CONFIRM_URL,
      cookieKeys: toCookieSummary(cookieHeader),
      payload: toMaskedFormLog(mergedCustomerConfirmForm),
    })
    customerConfirmResponse = await fetch(LABOLA_YOYOGI_CUSTOMER_CONFIRM_URL, {
      method: 'POST',
      headers,
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
  ensureLabolaYoyogiPostSuccess(customerConfirmResponse, 'customer-confirm')
}

const isLabolaYoyogiCustomerPost5xxError = (message: string): boolean => {
  return /^customer-(?:info|confirm) 送信に失敗しました: 5\d\d$/.test(message)
}

export const shouldRetryLabolaYoyogiError = (error: Error): boolean => {
  return (
    error.message.includes('相手側サーバ障害') ||
    error.message.includes('通信エラーが発生しました') ||
    isLabolaYoyogiCustomerPost5xxError(error.message)
  )
}
