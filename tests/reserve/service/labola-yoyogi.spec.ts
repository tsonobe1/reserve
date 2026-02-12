import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildLabolaYoyogiLoginForm,
  postLabolaYoyogiLogin,
  prepareLabolaYoyogiLogin,
} from '../../../src/reserve/service/labola-yoyogi'

describe('prepareLabolaYoyogiLogin', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('認証情報が不足している場合は例外を投げる', async () => {
    await expect(
      prepareLabolaYoyogiLogin({ LABOLA_YOYOGI_USERNAME: 'user' }, 'reserve-id-1')
    ).rejects.toThrow('LABOLA_YOYOGI_USERNAME / LABOLA_YOYOGI_PASSWORD が未設定です')
  })

  it('ログインページ取得が成功したら username/password を返す', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 200 })) as unknown as typeof fetch
    )

    await expect(
      prepareLabolaYoyogiLogin(
        { LABOLA_YOYOGI_USERNAME: 'user', LABOLA_YOYOGI_PASSWORD: 'pass' },
        'reserve-id-1'
      )
    ).resolves.toStrictEqual({ username: 'user', password: 'pass' })
  })

  it('通信エラー時は日本語メッセージで例外を投げる', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down')
      }) as unknown as typeof fetch
    )

    await expect(
      prepareLabolaYoyogiLogin(
        { LABOLA_YOYOGI_USERNAME: 'user', LABOLA_YOYOGI_PASSWORD: 'pass' },
        'reserve-id-1'
      )
    ).rejects.toThrow('ログインページ取得中に通信エラーが発生しました')
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
    const fetchMock = vi.fn(async () => new Response('', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const form = buildLabolaYoyogiLoginForm({ username: 'user', password: 'pass' })
    await postLabolaYoyogiLogin('reserve-id-1', form)

    // ログインPOSTが1回だけ送信されることを確認する。
    expect(fetchMock).toHaveBeenCalledTimes(1)
    // URLと必須パラメータ(method/body)のみを検証する。
    // objectContaining を使うことで、将来ヘッダ等が増えてもこの意図は維持できる。
    expect(fetchMock).toHaveBeenCalledWith(
      'https://labola.jp/r/shop/3094/member/login/',
      expect.objectContaining({
        method: 'POST',
        body: form.toString(),
      })
    )
  })

  it('通信エラー時は日本語メッセージで例外を投げる', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down')
      }) as unknown as typeof fetch
    )

    const form = buildLabolaYoyogiLoginForm({ username: 'user', password: 'pass' })
    await expect(postLabolaYoyogiLogin('reserve-id-1', form)).rejects.toThrow(
      'ログインPOST中に通信エラーが発生しました'
    )
  })
})
