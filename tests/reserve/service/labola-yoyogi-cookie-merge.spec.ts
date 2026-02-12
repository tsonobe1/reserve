import { describe, expect, it } from 'vitest'
import { mergeLabolaYoyogiCookieHeader } from '../../../src/reserve/service/labola-yoyogi'

describe('mergeLabolaYoyogiCookieHeader', () => {
  it('既存Cookieと予約URL GET の set-cookie を合成する', () => {
    const merged = mergeLabolaYoyogiCookieHeader(
      'csrftoken=login-csrf; sessionid=login-session',
      'csrftoken=booking-csrf; Path=/, sessionid=booking-session; Path=/'
    )

    expect(merged).toBe('csrftoken=booking-csrf; sessionid=booking-session')
  })
})
