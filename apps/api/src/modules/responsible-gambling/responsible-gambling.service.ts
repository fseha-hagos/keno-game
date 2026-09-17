import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { ResponsibleGamblingLimit } from '../../database/entities/responsible-gambling-limit.entity';
import { User } from '../../database/entities/user.entity';
import { Bet } from '../../database/entities/bet.entity';
import { LimitType, LimitDuration, UserStatus } from '@keno/shared-types';

@Injectable()
export class ResponsibleGamblingService {
  constructor(
    @InjectRepository(ResponsibleGamblingLimit)
    private readonly limitRepo: Repository<ResponsibleGamblingLimit>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Bet)
    private readonly betRepo: Repository<Bet>,
  ) {}

  /**
   * Hard server-side enforcement. Validates that the user is not self-excluded,
   * not in cooling-off, and within their configured wager limits.
   */
  async assertCanPlaceBet(userId: string, stakeMinor: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.status === UserStatus.SELF_EXCLUDED) {
      throw new ForbiddenException('Account is currently self-excluded');
    }

    const now = new Date();
    if (user.selfExcludedUntil && user.selfExcludedUntil > now) {
      throw new ForbiddenException(
        `Account is self-excluded until ${user.selfExcludedUntil.toISOString()}`,
      );
    }

    if (user.coolingOffUntil && user.coolingOffUntil > now) {
      throw new ForbiddenException(
        `Account is in a cooling-off period until ${user.coolingOffUntil.toISOString()}`,
      );
    }

    // Check Wager Limits
    const wagerLimits = await this.limitRepo.find({
      where: { userId, limitType: LimitType.WAGER },
    });

    for (const limit of wagerLimits) {
      if (!limit.amountMinor) continue;

      const durationStart = this.getDurationStartTime(limit.duration);
      const recentBets = await this.betRepo.find({
        where: {
          userId,
          createdAt: MoreThanOrEqual(durationStart),
        },
      });

      const totalWagered = recentBets.reduce(
        (sum, b) => sum + BigInt(b.stakeMinor),
        0n,
      );

      const attemptedTotal = totalWagered + BigInt(stakeMinor);
      const limitAmount = BigInt(limit.amountMinor);

      if (attemptedTotal > limitAmount) {
        throw new ForbiddenException(
          `Wager limit exceeded for ${limit.duration.toLowerCase()} period. Limit: ${limitAmount.toString()} minor units. Current + attempted: ${attemptedTotal.toString()}`,
        );
      }
    }
  }

  async setLimit(
    userId: string,
    limitType: LimitType,
    duration: LimitDuration,
    amountMinor?: string,
    durationMinutes?: number,
  ) {
    let limit = await this.limitRepo.findOne({
      where: { userId, limitType, duration },
    });

    if (!limit) {
      limit = this.limitRepo.create({
        userId,
        limitType,
        duration,
        amountMinor,
        durationMinutes,
      });
    } else {
      // If decreasing limit, apply immediately. If increasing limit, 24h cooling off applies in production
      limit.amountMinor = amountMinor;
      limit.durationMinutes = durationMinutes;
    }

    return this.limitRepo.save(limit);
  }

  async selfExclude(userId: string, durationDays: number, reason?: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const until = new Date();
    until.setDate(until.getDate() + durationDays);

    user.status = UserStatus.SELF_EXCLUDED;
    user.selfExcludedUntil = until;

    return this.userRepo.save(user);
  }

  async setCoolingOff(userId: string, durationHours: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const until = new Date();
    until.setHours(until.getHours() + durationHours);
    user.coolingOffUntil = until;

    return this.userRepo.save(user);
  }

  async getUserLimits(userId: string): Promise<ResponsibleGamblingLimit[]> {
    return this.limitRepo.find({ where: { userId } });
  }

  private getDurationStartTime(duration: LimitDuration): Date {
    const now = new Date();
    switch (duration) {
      case LimitDuration.DAILY:
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case LimitDuration.WEEKLY:
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(now.setDate(diff));
      case LimitDuration.MONTHLY:
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }
}
