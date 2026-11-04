import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Paytable } from '../../database/entities/paytable.entity';

@Injectable()
export class PaytablesService {
  constructor(
    @InjectRepository(Paytable)
    private readonly paytableRepo: Repository<Paytable>,
  ) {}

  async getActivePaytable(gameId: string): Promise<Paytable[]> {
    return this.paytableRepo.find({
      where: [{ gameId, status: 'ACTIVE' }, { status: 'ACTIVE' }],
      order: { spots: 'ASC', hits: 'ASC' },
    });
  }

  async getPaytableByVersion(gameId: string, version: number): Promise<Paytable[]> {
    return this.paytableRepo.find({
      where: { gameId, version },
      order: { spots: 'ASC', hits: 'ASC' },
    });
  }

  async getMultiplier(gameId: string, version: number, spots: number, hits: number): Promise<number> {
    const entry = await this.paytableRepo.findOne({
      where: [
        { gameId, version, spots, hits, status: 'ACTIVE' },
        { spots, hits, status: 'ACTIVE' },
      ],
      order: { createdAt: 'DESC' },
    });
    return entry ? Number(entry.multiplier) : 0;
  }
}
