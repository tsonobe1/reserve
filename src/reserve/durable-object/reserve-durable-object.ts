import { DurableObject } from 'cloudflare:workers'

// Storage キー:
// - params: POST ペイロードの params
// Alarm:
// - alarmAt: Durable Object のアラームスケジューラで管理される時刻 (setAlarm/getAlarm)

export class ReserveDurableObject extends DurableObject {
  async schedule(params: unknown, executeAt: string): Promise<void> {
    const scheduledAt = Date.parse(executeAt)
    if (Number.isNaN(scheduledAt)) {
      throw new Error('executeAt must be a valid datetime string')
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
    console.log('Reserve DO alarm fired', { id: this.ctx.id.toString(), params })
  }
}
