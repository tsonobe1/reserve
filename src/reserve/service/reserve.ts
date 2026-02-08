import type { ReserveRecord } from '../domain/reserve'
import { ReserveRepository } from '../repository/reserve'

export class ReserveService {
  constructor(private readonly repository = new ReserveRepository()) {}

  async getReserves(db: D1Database): Promise<ReserveRecord[]> {
    const records = await this.repository.getReserves(db)

    return records.map((record) => {
      try {
        return { ...record, params: JSON.parse(record.params) }
      } catch {
        return record
      }
    })
  }
}
