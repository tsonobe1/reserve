import { DurableObject } from 'cloudflare:workers'
import { ReserveParamsSchema } from '../domain/reserve-request-schema'

// Storage キー:
// - params: POST ペイロードの params
// Alarm:
// - alarmAt: Durable Object のアラームスケジューラで管理される時刻 (setAlarm/getAlarm)

export class ReserveDurableObject extends DurableObject {
  async schedule(params: unknown, executeAt: string): Promise<void> {
    const scheduledAt = Date.parse(executeAt)
    if (Number.isNaN(scheduledAt)) {
      throw new Error('executeAt は有効な日時文字列である必要があります')
    }

    await this.ctx.storage.put('params', params ?? null)
    await this.ctx.storage.setAlarm(scheduledAt)
  }

  async getState(): Promise<{ params: unknown; alarmAt: number | null }> {
    const params = await this.ctx.storage.get('params')
    const alarmAt = await this.ctx.storage.getAlarm()
    return { params: params ?? null, alarmAt }
  }

  async rollback(): Promise<void> {
    await this.ctx.storage.deleteAlarm()
    await this.ctx.storage.deleteAll()
  }

  async alarm(): Promise<void> {
    const params = await this.ctx.storage.get('params')
    const parsed = ReserveParamsSchema.safeParse(params)
    if (!parsed.success) {
      console.warn('Skip reserve: params が不正です', { id: this.ctx.id.toString(), params })
      return
    }
    const reserveParams = parsed.data

    if (reserveParams.facilityId !== 1) {
      console.info('Skip reserve: 非対応施設', {
        id: this.ctx.id.toString(),
        facilityId: reserveParams.facilityId,
      })
      return
    }

    const username = this.env.LABOLA_YOYOGI_USERNAME
    const password = this.env.LABOLA_YOYOGI_PASSWORD
    if (!username || !password) {
      throw new Error('LABOLA_YOYOGI_USERNAME / LABOLA_YOYOGI_PASSWORD が未設定です')
    }

    console.log('予約実行対象を受け付けました（Labola/代々木）', {
      id: this.ctx.id.toString(),
      params: reserveParams,
    })
    console.log('Labola認証情報を読み込みました', {
      id: this.ctx.id.toString(),
      usernamePreview: username.slice(0, 3),
      hasPassword: Boolean(password),
    })

    const loginUrl = 'https://labola.jp/r/shop/3094/member/login/'
    const loginPageResponse = await fetch(loginUrl, { method: 'GET' })
    if (!loginPageResponse.ok) {
      throw new Error(`ログインページ取得に失敗しました: ${loginPageResponse.status}`)
    }
    console.log('Labolaログインページの取得に成功しました', {
      id: this.ctx.id.toString(),
      status: loginPageResponse.status,
    })
  }
}
