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

  it('csrftoken/sessionid 以外のCookieも保持しつつ更新する', () => {
    const merged = mergeLabolaYoyogiCookieHeader(
      'csrftoken=old-csrf; booking-prod=old-booking',
      'booking-prod=new-booking; Path=/; HttpOnly, sessionid=new-session; Path=/'
    )

    expect(merged).toBe('csrftoken=old-csrf; booking-prod=new-booking; sessionid=new-session')
  })
})
