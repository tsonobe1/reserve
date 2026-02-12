import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildLabolaYoyogiLoginForm,
  extractLabolaYoyogiCookieHeader,
  postLabolaYoyogiLogin,
  prepareLabolaYoyogiLogin,
} from '../../../src/reserve/service/labola-yoyogi'

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
  buildLabolaYoyogiLoginForm({ username: VALID_ENV.LABOLA_YOYOGI_USERNAME, password })

describe('prepareLabolaYoyogiLogin', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('認証情報が不足している場合は例外を投げる', async () => {
    await expect(
      prepareLabolaYoyogiLogin({ LABOLA_YOYOGI_USERNAME: 'user' }, RESERVE_ID)
    ).rejects.toThrow('LABOLA_YOYOGI_USERNAME / LABOLA_YOYOGI_PASSWORD が未設定です')
  })

  it('ログインページ取得が成功したら username/password を返す', async () => {
    mockFetch(async () => new Response('', { status: 200 }))
    await expect(prepareLabolaYoyogiLogin(VALID_ENV, RESERVE_ID)).resolves.toStrictEqual({
      username: 'user',
      password: 'pass',
    })
  })

  it('通信エラー時は日本語メッセージで例外を投げる', async () => {
    mockFetch(async () => {
      throw new Error('network down')
    })
    await expect(prepareLabolaYoyogiLogin(VALID_ENV, RESERVE_ID)).rejects.toThrow(
      'ログインページ取得中に通信エラーが発生しました'
    )
  })
})

describe('buildLabolaYoyogiLoginForm', () => {
  it('username/password を Django ログイン向けフォームへ変換する', () => {
    const form = buildLabolaYoyogiLoginForm({ username: 'user', password: 'pass' })

    expect(form.get('username')).toBe('user')
    expect(form.get('password')).toBe('pass')
  })
})

describe('postLabolaYoyogiLogin', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('ログインPOSTを送信する', async () => {
    const fetchMock = mockFetch(async () => new Response('', { status: 200 }))

    const form = createLoginForm()
    await postLabolaYoyogiLogin(RESERVE_ID, form, 'csrftoken=csrf-value; sessionid=session-value')

    // ログインPOSTが1回だけ送信されることを確認する。
    expect(fetchMock).toHaveBeenCalledTimes(1)
    // URLと必須パラメータ(method/body)のみを検証する。
    // objectContaining を使うことで、将来ヘッダ等が増えてもこの意図は維持できる。
    expect(fetchMock).toHaveBeenCalledWith(
      LOGIN_URL,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Cookie: 'csrftoken=csrf-value; sessionid=session-value',
        }),
        body: form.toString(),
      })
    )
  })

  it('通信エラー時は日本語メッセージで例外を投げる', async () => {
    mockFetch(async () => {
      throw new Error('network down')
    })

    const form = createLoginForm()
    await expect(postLabolaYoyogiLogin(RESERVE_ID, form)).rejects.toThrow(
      'ログインPOST中に通信エラーが発生しました'
    )
  })

  it('HTTPエラー時はステータス付きで例外を投げる', async () => {
    mockFetch(async () => new Response('', { status: 503 }))

    const form = createLoginForm()
    await expect(postLabolaYoyogiLogin(RESERVE_ID, form)).rejects.toThrow(
      'ログインPOSTに失敗しました: 503'
    )
  })

  it('200でも認証失敗文言が含まれる場合は例外を投げる', async () => {
    mockFetch(async () => new Response('会員IDまたはパスワードが正しくありません', { status: 200 }))

    const form = createLoginForm('wrong-pass')
    await expect(postLabolaYoyogiLogin(RESERVE_ID, form)).rejects.toThrow(
      'ログインに失敗しました: IDまたはパスワードを確認してください'
    )
  })
})

describe('extractLabolaYoyogiCookieHeader', () => {
  it('set-cookie から csrftoken と sessionid を抽出して Cookie ヘッダへ変換する', () => {
    const header =
      'csrftoken=csrf-value; Path=/, sessionid=session-value; HttpOnly; Path=/; SameSite=Lax'

    expect(extractLabolaYoyogiCookieHeader(header)).toBe(
      'csrftoken=csrf-value; sessionid=session-value'
    )
  })

  it('対象cookieが無い場合は undefined を返す', () => {
    expect(extractLabolaYoyogiCookieHeader('foo=bar; Path=/')).toBeUndefined()
  })
})
