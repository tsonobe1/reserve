import { afterEach, describe, expect, it, vi } from 'vitest'
import { prepareLabolaYoyogiLogin } from '../../../src/reserve/service/labola-yoyogi'

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
