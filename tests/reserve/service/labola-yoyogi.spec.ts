import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildLoginForm,
  extractCookieHeader,
  postLogin,
  prepareLogin,
} from '../../../src/reserve/service/labola-yoyogi/client'

const RESERVE_ID = 'reserve-id-1'
const LOGIN_URL = 'https://labola.jp/r/shop/3094/member/login/'
const VALID_ENV = {
  LABOLA_YOYOGI_USERNAME: 'user',
  LABOLA_YOYOGI_PASSWORD: 'pass',
}

const mockFetch = (impl: Parameters<typeof vi.fn>[0]) => {
  const fetchMock = vi.fn(impl)
  vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)
  return fetchMock
}

const createLoginForm = (password = 'pass') =>
  buildLoginForm({ username: VALID_ENV.LABOLA_YOYOGI_USERNAME, password })

describe('prepareLogin', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('認証情報が不足している場合は例外を投げる', async () => {
    await expect(prepareLogin({ LABOLA_YOYOGI_USERNAME: 'user' }, RESERVE_ID)).rejects.toThrow(
      'LABOLA_YOYOGI_USERNAME / LABOLA_YOYOGI_PASSWORD が未設定です'
    )
  })

  it('ログインページ取得が成功したら username/password を返す', async () => {
    mockFetch(async () => new Response('', { status: 200 }))
    await expect(prepareLogin(VALID_ENV, RESERVE_ID)).resolves.toStrictEqual({
      username: 'user',
      password: 'pass',
      csrfMiddlewareToken: undefined,
      loginSetCookieHeader: undefined,
    })
  })

  it('ログインページHTMLから csrfmiddlewaretoken を抽出して返す', async () => {
    mockFetch(
      async () =>
        new Response('<input type="hidden" name="csrfmiddlewaretoken" value="csrf-token-123">', {
          status: 200,
        })
    )
    await expect(prepareLogin(VALID_ENV, RESERVE_ID)).resolves.toStrictEqual({
      username: 'user',
      password: 'pass',
      csrfMiddlewareToken: 'csrf-token-123',
      loginSetCookieHeader: undefined,
    })
  })

  it('通信エラー時は日本語メッセージで例外を投げる', async () => {
    mockFetch(async () => {
      throw new Error('network down')
    })
    await expect(prepareLogin(VALID_ENV, RESERVE_ID)).rejects.toThrow(
      'ログインページ取得中に通信エラーが発生しました'
    )
  })
})

describe('buildLoginForm', () => {
  it('membership_code/password/member_type_id を Django ログイン向けフォームへ変換する', () => {
    const form = buildLoginForm({ username: 'user', password: 'pass' })

    expect(form.get('membership_code')).toBe('user')
    expect(form.get('password')).toBe('pass')
    expect(form.get('member_type_id')).toBe('397')
    expect(form.get('csrfmiddlewaretoken')).toBeNull()
  })

  it('csrfmiddlewaretoken がある場合はフォームへ含める', () => {
    const form = buildLoginForm({
      username: 'user',
      password: 'pass',
      csrfMiddlewareToken: 'csrf-token-123',
    })

    expect(form.get('csrfmiddlewaretoken')).toBe('csrf-token-123')
  })
})

describe('postLogin', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('ログインPOSTを送信する', async () => {
    const fetchMock = mockFetch(async () => new Response('', { status: 200 }))

    const form = createLoginForm()
    await postLogin(RESERVE_ID, form, 'csrftoken=csrf-value; sessionid=session-value')

    // ログインPOSTが1回だけ送信されることを確認する。
    expect(fetchMock).toHaveBeenCalledTimes(1)
    // URLと必須パラメータ(method/body)のみを検証する。
    // objectContaining を使うことで、将来ヘッダ等が増えてもこの意図は維持できる。
    expect(fetchMock).toHaveBeenCalledWith(
      LOGIN_URL,
      expect.objectContaining({
        method: 'POST',
        redirect: 'manual',
        headers: expect.objectContaining({
          Cookie: 'csrftoken=csrf-value; sessionid=session-value',
        }),
        body: form.toString(),
      })
    )
  })

  it('302リダイレクト応答はログイン成功として扱う', async () => {
    mockFetch(
      async () =>
        new Response('', {
          status: 302,
          headers: {
            location: '/r/customer/member-bookings/',
          },
        })
    )

    const form = createLoginForm()
    await expect(postLogin(RESERVE_ID, form)).resolves.toBeInstanceOf(Response)
  })

  it('通信エラー時は日本語メッセージで例外を投げる', async () => {
    mockFetch(async () => {
      throw new Error('network down')
    })

    const form = createLoginForm()
    await expect(postLogin(RESERVE_ID, form)).rejects.toThrow(
      'ログインPOST中に通信エラーが発生しました'
    )
  })

  it('4xxのHTTPエラー時はステータス付きで例外を投げる', async () => {
    mockFetch(async () => new Response('', { status: 400 }))

    const form = createLoginForm()
    await expect(postLogin(RESERVE_ID, form)).rejects.toThrow('ログインPOSTに失敗しました: 400')
  })

  it('5xxのHTTPエラー時は相手側サーバ障害として例外を投げる', async () => {
    mockFetch(async () => new Response('', { status: 503 }))

    const form = createLoginForm()
    await expect(postLogin(RESERVE_ID, form)).rejects.toThrow(
      '相手側サーバ障害のためログインできませんでした'
    )
  })

  it('200でも認証失敗文言が含まれる場合は例外を投げる', async () => {
    mockFetch(async () => new Response('会員IDまたはパスワードが正しくありません', { status: 200 }))

    const form = createLoginForm('wrong-pass')
    await expect(postLogin(RESERVE_ID, form)).rejects.toThrow(
      'ログインに失敗しました: IDまたはパスワードを確認してください'
    )
  })

  it('200でもログイン画面タイトルのままなら例外を投げる', async () => {
    mockFetch(
      async () =>
        new Response(
          '<title>国立代々木競技場フットサルコート｜メンバーログイン - LaBOLA総合予約</title>',
          {
            status: 200,
          }
        )
    )

    const form = createLoginForm()
    await expect(postLogin(RESERVE_ID, form)).rejects.toThrow(
      'ログインに失敗しました: IDまたはパスワードを確認してください'
    )
  })
})

describe('extractCookieHeader', () => {
  it('set-cookie の先頭cookieペアを抽出して Cookie ヘッダへ変換する', () => {
    const header =
      'csrftoken=csrf-value; Path=/, sessionid=session-value; HttpOnly; Path=/; SameSite=Lax'

    expect(extractCookieHeader(header)).toBe('csrftoken=csrf-value; sessionid=session-value')
  })

  it('Expires を含む set-cookie でも壊さず抽出する', () => {
    const header =
      'messages=abc; expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Path=/, csrftoken=csrf-value; Path=/'

    expect(extractCookieHeader(header)).toBe('messages=abc; csrftoken=csrf-value')
  })
})
