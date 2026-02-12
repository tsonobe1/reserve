import { describe, expect, it } from 'vitest'
import * as reserveDoModule from '../../../src/reserve/durable-object/reserve-durable-object'

describe('shouldIncrementRetryState', () => {
  it('5xxと通信エラーのみ retry_state 増分対象にする', () => {
    const shouldIncrementRetryState = (reserveDoModule as Record<string, unknown>)
      .shouldIncrementRetryState as ((error: Error) => boolean) | undefined

    expect(shouldIncrementRetryState).toBeTypeOf('function')
    expect(shouldIncrementRetryState?.(new Error('相手側サーバ障害のためログインできませんでした'))).toBe(
      true
    )
    expect(shouldIncrementRetryState?.(new Error('ログインPOST中に通信エラーが発生しました'))).toBe(
      true
    )
    expect(shouldIncrementRetryState?.(new Error('ログインに失敗しました: IDまたはパスワードを確認してください'))).toBe(false)
    expect(shouldIncrementRetryState?.(new Error('ログインPOSTに失敗しました: 400'))).toBe(false)
  })
})
