type LabolaYoyogiEnv = {
  LABOLA_YOYOGI_USERNAME?: string
  LABOLA_YOYOGI_PASSWORD?: string
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
  const loginPageResponse = await fetch(loginUrl, { method: 'GET' })
  if (!loginPageResponse.ok) {
    throw new Error(`ログインページ取得に失敗しました: ${loginPageResponse.status}`)
  }
  console.log('Labolaログインページの取得に成功しました', {
    id: reserveId,
    status: loginPageResponse.status,
  })

  return { username, password }
}
