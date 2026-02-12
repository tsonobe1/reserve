export type LabolaYoyogiEnv = {
  LABOLA_YOYOGI_USERNAME?: string
  LABOLA_YOYOGI_PASSWORD?: string
}

export const buildLabolaYoyogiLoginForm = (credentials: {
  username: string
  password: string
}): URLSearchParams => {
  return new URLSearchParams({
    username: credentials.username,
    password: credentials.password,
  })
}

export const postLabolaYoyogiLogin = async (
  reserveId: string,
  form: URLSearchParams
): Promise<Response> => {
  const loginUrl = 'https://labola.jp/r/shop/3094/member/login/'
  try {
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    })
    if (!response.ok) {
      throw new Error(`ログインPOSTに失敗しました: ${response.status}`)
    }
    const responseBody = await response.clone().text()
    if (responseBody.includes('会員IDまたはパスワードが正しくありません')) {
      throw new Error('ログインに失敗しました: IDまたはパスワードを確認してください')
    }
    return response
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.startsWith('ログインPOSTに失敗しました:') ||
        error.message === 'ログインに失敗しました: IDまたはパスワードを確認してください')
    ) {
      throw error
    }
    console.error('LabolaログインPOST中に通信エラーが発生しました', {
      id: reserveId,
      error,
    })
    throw new Error('ログインPOST中に通信エラーが発生しました')
  }
}

export const prepareLabolaYoyogiLogin = async (
  env: LabolaYoyogiEnv,
  reserveId: string
): Promise<{ username: string; password: string }> => {
  const username = env.LABOLA_YOYOGI_USERNAME
  const password = env.LABOLA_YOYOGI_PASSWORD
  if (!username || !password) {
    throw new Error('LABOLA_YOYOGI_USERNAME / LABOLA_YOYOGI_PASSWORD が未設定です')
  }

  console.log('Labola認証情報を読み込みました', {
    id: reserveId,
    usernamePreview: username.slice(0, 3),
    hasPassword: Boolean(password),
  })

  const loginUrl = 'https://labola.jp/r/shop/3094/member/login/'
  let loginPageResponse: Response
  try {
    loginPageResponse = await fetch(loginUrl, { method: 'GET' })
  } catch (error) {
    console.error('Labolaログインページ取得中に通信エラーが発生しました', {
      id: reserveId,
      error,
    })
    throw new Error('ログインページ取得中に通信エラーが発生しました')
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
