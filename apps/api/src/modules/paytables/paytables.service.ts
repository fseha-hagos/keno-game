import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Paytable } from '../../database/entities/paytable.entity';
import { DEFAULT_96_PAYTABLE_ENTRIES, DEFAULT_PAYTABLE_VERSION } from '@keno/game-math';
import { GAME_CONFIG } from '@keno/config';

@Injectable()
export class PaytablesService implements OnModuleInit {
  private readonly logger = new Logger(PaytablesService.name);

  constructor(
    @InjectRepository(Paytable)
    private readonly paytableRepo: Repository<Paytable>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultPaytable();
  }

  private async seedDefaultPaytable() {
    const existing = await this.paytableRepo.count({
      where: { gameId: GAME_CONFIG.DEFAULT_GAME_ID, version: 1 },
    });

    if (existing === 0) {
      this.logger.log('Seeding Certified Default Keno Paytable v1.0 (96% RTP)...');
      const rows = DEFAULT_96_PAYTABLE_ENTRIES.map((entry) =>
        this.paytableRepo.create({
          gameId: GAME_CONFIG.DEFAULT_GAME_ID,
          version: 1,
          name: DEFAULT_PAYTABLE_VERSION.name,
          spots: entry.spots,
          hits: entry.hits,
          multiplier: entry.multiplier,
          theoreticalRtp: DEFAULT_PAYTABLE_VERSION.theoreticalRtp,
          status: 'ACTIVE',
          isDefault: true,
        }),
      );
      await this.paytableRepo.save(rows);
      this.logger.log(`Successfully seeded ${rows.length} paytable entries.`);
    }
  }

  async getActivePaytable(gameId: string): Promise<Paytable[]> {
    return this.paytableRepo.find({
      where: { gameId, status: 'ACTIVE' },
    });
  }

  async getPaytableByVersion(gameId: string, version: number): Promise<Paytable[]> {
    return this.paytableRepo.find({
      where: { gameId, version },
    });
  }

  async getMultiplier(gameId: string, version: number, spots: number, hits: number): Promise<number> {
    const entry = await this.paytableRepo.findOne({
      where: { gameId, version, spots, hits, status: 'ACTIVE' },
    });
    return entry ? Number(entry.multiplier) : 0;
  }
}
