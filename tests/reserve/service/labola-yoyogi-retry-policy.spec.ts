import { describe, expect, it } from 'vitest'
import * as labolaYoyogi from '../../../src/reserve/service/labola-yoyogi'

describe('shouldRetryLabolaYoyogiError', () => {
  it('5xxと通信エラーは再試行対象にする', () => {
    const shouldRetry = (labolaYoyogi as Record<string, unknown>)
      .shouldRetryLabolaYoyogiError as ((error: Error) => boolean) | undefined

    expect(shouldRetry).toBeTypeOf('function')
    expect(shouldRetry?.(new Error('相手側サーバ障害のためログインできませんでした'))).toBe(true)
    expect(shouldRetry?.(new Error('ログインPOST中に通信エラーが発生しました'))).toBe(true)
    expect(shouldRetry?.(new Error('customer-info 送信に失敗しました: 500'))).toBe(true)
    expect(shouldRetry?.(new Error('customer-confirm 送信に失敗しました: 503'))).toBe(true)
  })

  it('認証失敗と4xxは再試行対象にしない', () => {
    const shouldRetry = (labolaYoyogi as Record<string, unknown>)
      .shouldRetryLabolaYoyogiError as ((error: Error) => boolean) | undefined

    expect(shouldRetry).toBeTypeOf('function')
    expect(shouldRetry?.(new Error('ログインに失敗しました: IDまたはパスワードを確認してください'))).toBe(
      false
    )
    expect(shouldRetry?.(new Error('ログインPOSTに失敗しました: 400'))).toBe(false)
  })
})
