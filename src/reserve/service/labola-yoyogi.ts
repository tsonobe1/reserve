export type LabolaYoyogiEnv = {
  LABOLA_YOYOGI_USERNAME?: string
  LABOLA_YOYOGI_PASSWORD?: string
}

const LABOLA_YOYOGI_LOGIN_URL = 'https://labola.jp/r/shop/3094/member/login/'
const LABOLA_YOYOGI_INVALID_CREDENTIALS_TEXT = '会員IDまたはパスワードが正しくありません'

const ERROR_MISSING_CREDENTIALS = 'LABOLA_YOYOGI_USERNAME / LABOLA_YOYOGI_PASSWORD が未設定です'
const ERROR_LOGIN_POST_NETWORK = 'ログインPOST中に通信エラーが発生しました'
const ERROR_LOGIN_PAGE_NETWORK = 'ログインページ取得中に通信エラーが発生しました'
const ERROR_LOGIN_INVALID_CREDENTIALS =
  'ログインに失敗しました: IDまたはパスワードを確認してください'

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
        error.message === ERROR_LOGIN_INVALID_CREDENTIALS)
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
): Promise<{ username: string; password: string }> => {
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

  return { username, password }
}
