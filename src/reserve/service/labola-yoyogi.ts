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

export const buildLabolaYoyogiLoginForm = (credentials: {
  username: string
  password: string
}): URLSearchParams => {
  return new URLSearchParams({
    username: credentials.username,
    password: credentials.password,
  })
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
    }
    if (cookieHeader) {
      headers.Cookie = cookieHeader
    }

    const response = await fetch(LABOLA_YOYOGI_LOGIN_URL, {
      method: 'POST',
      headers,
      body: form.toString(),
    })
    if (!response.ok) {
      if (response.status >= 500) {
        throw new Error(ERROR_LOGIN_POST_UPSTREAM)
      }
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
): Promise<{ username: string; password: string; loginSetCookieHeader?: string }> => {
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
  console.log('Labolaログインページの取得に成功しました', {
    id: reserveId,
    status: loginPageResponse.status,
  })

  return {
    username,
    password,
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

  for (const matched of html.matchAll(/<input\b[^>]*>/gi)) {
    const tag = matched[0]
    const name = tag.match(/\bname="([^"]+)"/i)?.[1]
    if (!name) continue

    const type = tag.match(/\btype="([^"]+)"/i)?.[1]?.toLowerCase() ?? 'text'
    if ((type === 'radio' || type === 'checkbox') && !/\bchecked\b/i.test(tag)) {
      continue
    }

    const value = tag.match(/\bvalue="([^"]*)"/i)?.[1]
    if (value !== undefined) {
      values[name] = value
    } else if (type === 'checkbox') {
      values[name] = 'on'
    }
  }

  for (const matched of html.matchAll(/<select\b[^>]*>[\s\S]*?<\/select>/gi)) {
    const block = matched[0]
    const name = block.match(/<select\b[^>]*\bname="([^"]+)"/i)?.[1]
    if (!name) continue

    let selected: string | undefined
    let first: string | undefined
    for (const option of block.matchAll(/<option\b[^>]*>/gi)) {
      const optionTag = option[0]
      const optionValue = optionTag.match(/\bvalue="([^"]+)"/i)?.[1]
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
  _reserveId: string,
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

  const customerInfoResponse = await fetch(LABOLA_YOYOGI_CUSTOMER_INFO_URL, {
    method: 'POST',
    headers,
    body: customerInfoForm.toString(),
  })
  ensureLabolaYoyogiPostSuccess(customerInfoResponse, 'customer-info')
  const customerConfirmDefaults = extractLabolaYoyogiFormValues(await customerInfoResponse.text())
  const mergedCustomerConfirmForm = mergeLabolaYoyogiFormValues(
    customerConfirmDefaults,
    customerConfirmForm
  )

  const customerConfirmResponse = await fetch(LABOLA_YOYOGI_CUSTOMER_CONFIRM_URL, {
    method: 'POST',
    headers,
    body: mergedCustomerConfirmForm.toString(),
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
