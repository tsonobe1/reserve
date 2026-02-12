import { describe, expect, it } from 'vitest'
import { toLabolaYoyogiCourtNo } from '../../../src/reserve/service/reserve-labola-yoyogi'

describe('toLabolaYoyogiCourtNo', () => {
  it('UIのコート番号 1-4 をサイト用の値へ変換する', () => {
    expect(toLabolaYoyogiCourtNo(1)).toBe('479')
    expect(toLabolaYoyogiCourtNo(2)).toBe('510')
    expect(toLabolaYoyogiCourtNo(3)).toBe('511')
    expect(toLabolaYoyogiCourtNo(4)).toBe('535')
  })

  it('非対応のコート番号は undefined を返す', () => {
    expect(toLabolaYoyogiCourtNo(0)).toBeUndefined()
    expect(toLabolaYoyogiCourtNo(5)).toBeUndefined()
  })
})
