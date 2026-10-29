import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../database/entities/user.entity';
import { PaymentRequest, PaymentRequestStatus, PaymentRequestType } from '../../database/entities/payment-request.entity';
import { LedgerTransaction } from '../../database/entities/ledger-transaction.entity';
import { WalletAccount } from '../../database/entities/wallet-account.entity';
import { GameRound } from '../../database/entities/game-round.entity';
import { Bet } from '../../database/entities/bet.entity';
import { Paytable } from '../../database/entities/paytable.entity';
import { AuditService } from '../audit/audit.service';
import { UserRole, UserStatus, TransactionType, BetStatus } from '@keno/shared-types';
import { DEFAULT_96_PAYTABLE_ENTRIES, calculateOverallRtp } from '@keno/game-math';
import { GAME_CONFIG } from '@keno/config';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  // Global platform state
  private systemActive = true;
  private maintenanceNotice = 'Platform is currently undergoing scheduled maintenance. New wagers are paused.';
  private lastToggledBy: string | null = 'Initial System Setup';
  private lastToggledAt: Date = new Date();

  // Configured target RTP percentage (default 96.0%)
  private configuredRtp = 96.0;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(PaymentRequest)
    private readonly paymentRepo: Repository<PaymentRequest>,
    @InjectRepository(LedgerTransaction)
    private readonly ledgerRepo: Repository<LedgerTransaction>,
    @InjectRepository(WalletAccount)
    private readonly walletRepo: Repository<WalletAccount>,
    @InjectRepository(GameRound)
    private readonly roundRepo: Repository<GameRound>,
    @InjectRepository(Bet)
    private readonly betRepo: Repository<Bet>,
    @InjectRepository(Paytable)
    private readonly paytableRepo: Repository<Paytable>,
    private readonly auditService: AuditService,
  ) {}

  /* ────────────────── 1. SYSTEM ACTIVATION CONTROL (CREATOR ONLY) ────────────────── */

  isSystemActive(): boolean {
    return this.systemActive;
  }

  getSystemStatus() {
    return {
      isSystemActive: this.systemActive,
      maintenanceMessage: this.maintenanceNotice,
      lastToggledBy: this.lastToggledBy,
      lastToggledAt: this.lastToggledAt,
    };
  }

  async toggleSystemStatus(actor: User, active: boolean, message?: string) {
    this.assertIsCreator(actor, 'toggle system maintenance mode');

    this.systemActive = active;
    if (message) {
      this.maintenanceNotice = message;
    }
    this.lastToggledBy = `${actor.username} (${actor.roles.join(', ')})`;
    this.lastToggledAt = new Date();

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actor.roles[0] || 'CREATOR',
      action: active ? 'SYSTEM_ACTIVATED' : 'SYSTEM_DEACTIVATED',
      entity: 'SYSTEM',
      entityId: 'GLOBAL',
      metadata: { active, message: this.maintenanceNotice },
    });

    this.logger.warn(`Whole-system status toggled to ${active ? 'ACTIVE' : 'DEACTIVATED'} by ${actor.username}`);
    return this.getSystemStatus();
  }

  /* ────────────────── 2. RTP CONFIGURATION (CREATOR ONLY) ────────────────── */

  async getRtpConfig() {
    const mathAnalysis = calculateOverallRtp(DEFAULT_96_PAYTABLE_ENTRIES, 1, 10);
    const dbEntries = await this.paytableRepo.find({ where: { status: 'ACTIVE' } });
    return {
      targetRtp: this.configuredRtp,
      theoreticalRtp: mathAnalysis.averageRtp,
      presets: [92.0, 94.0, 96.0, 98.0],
      spotAnalyses: mathAnalysis.spotAnalyses,
      activeEntriesCount: dbEntries.length,
    };
  }

  async setRtpConfig(actor: User, targetRtp: number) {
    this.assertIsCreator(actor, 'configure platform RTP');

    if (targetRtp < 80 || targetRtp > 99) {
      throw new BadRequestException('Target RTP must be between 80.0% and 99.0%');
    }

    this.configuredRtp = targetRtp;

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actor.roles[0] || 'CREATOR',
      action: 'RTP_CONFIGURATION_UPDATED',
      entity: 'PAYTABLE',
      entityId: 'GLOBAL',
      metadata: { targetRtp },
    });

    return this.getRtpConfig();
  }

  /* ────────────────── 3. STAFF MANAGEMENT (CREATOR & OWNER) ────────────────── */

  async listStaff(actor: User) {
    this.assertIsStaff(actor);

    const isCreator = this.hasRole(actor, [UserRole.CREATOR, UserRole.SUPER_ADMIN]);
    const isOwner = this.hasRole(actor, [UserRole.BUSINESS_OWNER]);

    if (!isCreator && !isOwner) {
      throw new ForbiddenException('Operators are not authorized to view staff list');
    }

    const allUsers = await this.userRepo.find({
      order: { createdAt: 'DESC' },
    });

    // Filter staff accounts (users that have any staff role)
    const staffRoles = [
      UserRole.CREATOR,
      UserRole.BUSINESS_OWNER,
      UserRole.OPERATOR,
      UserRole.SUPER_ADMIN,
      UserRole.GAME_OPERATOR,
      UserRole.FINANCE,
    ];

    const staffUsers = allUsers.filter((u) => u.roles?.some((r) => staffRoles.includes(r)));

    // Business Owner sees OPERATOR and GAME_OPERATOR accounts only
    if (isOwner && !isCreator) {
      return staffUsers.filter(
        (u) =>
          u.roles?.some((r) => [UserRole.OPERATOR, UserRole.GAME_OPERATOR].includes(r)) &&
          !u.roles?.some((r) => [UserRole.CREATOR, UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER].includes(r)),
      );
    }

    // Creator sees all staff
    return staffUsers;
  }

  async createStaff(
    actor: User,
    input: { phone: string; username: string; password: string; role: UserRole; email?: string },
  ) {
    this.assertIsStaff(actor);
    const isCreator = this.hasRole(actor, [UserRole.CREATOR, UserRole.SUPER_ADMIN]);
    const isOwner = this.hasRole(actor, [UserRole.BUSINESS_OWNER]);

    if (!isCreator && !isOwner) {
      throw new ForbiddenException('Operators cannot create staff accounts');
    }

    // Role permission boundary:
    // Creator can create CREATOR, BUSINESS_OWNER, OPERATOR
    // Business Owner can ONLY create OPERATOR
    if (isOwner && !isCreator) {
      if (input.role !== UserRole.OPERATOR && input.role !== UserRole.GAME_OPERATOR) {
        throw new ForbiddenException('Business Owners can only create Operator accounts.');
      }
    }

    const cleanPhone = input.phone.trim();
    const cleanUsername = input.username.trim();

    const existingPhone = await this.userRepo.findOne({ where: { phone: cleanPhone } });
    if (existingPhone) {
      throw new BadRequestException('Phone number is already registered.');
    }

    const existingUser = await this.userRepo.findOne({ where: { username: cleanUsername } });
    if (existingUser) {
      throw new BadRequestException('Username is already in use.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    const roles = [input.role];
    if (input.role === UserRole.OPERATOR && !roles.includes(UserRole.GAME_OPERATOR)) {
      roles.push(UserRole.GAME_OPERATOR);
    }

    const newStaff = this.userRepo.create({
      phone: cleanPhone,
      username: cleanUsername,
      passwordHash,
      email: input.email ? input.email.trim() : undefined,
      status: UserStatus.ACTIVE,
      roles,
    });

    const saved = await this.userRepo.save(newStaff);

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actor.roles[0] || 'STAFF',
      action: 'STAFF_MEMBER_CREATED',
      entity: 'USER',
      entityId: saved.id,
      metadata: { createdRole: input.role, username: saved.username, createdBy: actor.username },
    });

    return {
      id: saved.id,
      phone: saved.phone,
      username: saved.username,
      roles: saved.roles,
      status: saved.status,
      createdAt: saved.createdAt,
    };
  }

  async updateStaff(
    actor: User,
    staffId: string,
    input: { phone?: string; username?: string; password?: string; status?: UserStatus; role?: UserRole },
  ) {
    this.assertIsStaff(actor);
    const isCreator = this.hasRole(actor, [UserRole.CREATOR, UserRole.SUPER_ADMIN]);
    const isOwner = this.hasRole(actor, [UserRole.BUSINESS_OWNER]);

    if (!isCreator && !isOwner) {
      throw new ForbiddenException('Operators cannot edit staff accounts');
    }

    const target = await this.userRepo.findOne({ where: { id: staffId } });
    if (!target) {
      throw new NotFoundException('Staff account not found');
    }

    // Role permission boundary:
    // If actor is Business Owner, they CANNOT edit Creator or another Business Owner
    if (isOwner && !isCreator) {
      const targetIsCreatorOrOwner = target.roles?.some((r) =>
        [UserRole.CREATOR, UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER].includes(r),
      );
      if (targetIsCreatorOrOwner) {
        throw new ForbiddenException('Business Owners can only edit Operator accounts.');
      }
      if (input.role && input.role !== UserRole.OPERATOR && input.role !== UserRole.GAME_OPERATOR) {
        throw new ForbiddenException('Business Owners cannot assign Creator or Owner roles.');
      }
    }

    if (input.phone) target.phone = input.phone.trim();
    if (input.username) target.username = input.username.trim();
    if (input.status) target.status = input.status;
    if (input.role) {
      target.roles = [input.role];
      if (input.role === UserRole.OPERATOR) target.roles.push(UserRole.GAME_OPERATOR);
    }
    if (input.password && input.password.trim().length >= 6) {
      const salt = await bcrypt.genSalt(10);
      target.passwordHash = await bcrypt.hash(input.password.trim(), salt);
    }

    const updated = await this.userRepo.save(target);

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actor.roles[0] || 'STAFF',
      action: 'STAFF_MEMBER_UPDATED',
      entity: 'USER',
      entityId: updated.id,
      metadata: { updatedBy: actor.username, targetUsername: updated.username },
    });

    return {
      id: updated.id,
      phone: updated.phone,
      username: updated.username,
      roles: updated.roles,
      status: updated.status,
      updatedAt: updated.updatedAt,
    };
  }

  async deleteStaff(actor: User, staffId: string) {
    this.assertIsStaff(actor);
    const isCreator = this.hasRole(actor, [UserRole.CREATOR, UserRole.SUPER_ADMIN]);
    const isOwner = this.hasRole(actor, [UserRole.BUSINESS_OWNER]);

    if (!isCreator && !isOwner) {
      throw new ForbiddenException('Operators cannot delete staff accounts');
    }

    if (actor.id === staffId) {
      throw new BadRequestException('You cannot delete your own account.');
    }

    const target = await this.userRepo.findOne({ where: { id: staffId } });
    if (!target) {
      throw new NotFoundException('Staff account not found');
    }

    if (isOwner && !isCreator) {
      const targetIsCreatorOrOwner = target.roles?.some((r) =>
        [UserRole.CREATOR, UserRole.SUPER_ADMIN, UserRole.BUSINESS_OWNER].includes(r),
      );
      if (targetIsCreatorOrOwner) {
        throw new ForbiddenException('Business Owners can only delete Operator accounts.');
      }
    }

    await this.userRepo.remove(target);

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actor.roles[0] || 'STAFF',
      action: 'STAFF_MEMBER_DELETED',
      entity: 'USER',
      entityId: staffId,
      metadata: { deletedBy: actor.username, deletedUsername: target.username },
    });

    return { success: true, message: `Staff account "${target.username}" successfully deleted.` };
  }

  /* ────────────────── 4. USER MANAGEMENT (ACTIVATE / FREEZE) ────────────────── */

  async listPlayers(search?: string, status?: string) {
    const qb = this.userRepo.createQueryBuilder('user').orderBy('user.createdAt', 'DESC');

    if (search && search.trim()) {
      qb.andWhere('(user.phone LIKE :s OR user.username LIKE :s)', { s: `%${search.trim()}%` });
    }

    if (status && status !== 'ALL') {
      qb.andWhere('user.status = :status', { status });
    }

    const players = await qb.take(100).getMany();

    // Attach wallet balances
    const userIds = players.map((p) => p.id);
    let wallets: WalletAccount[] = [];
    if (userIds.length > 0) {
      wallets = await this.walletRepo.find({
        where: userIds.map((id) => ({ userId: id })),
      });
    }

    const walletMap = new Map<string, WalletAccount>();
    wallets.forEach((w) => walletMap.set(w.userId, w));

    return players.map((p) => ({
      id: p.id,
      phone: p.phone,
      username: p.username,
      status: p.status,
      roles: p.roles,
      kycStatus: p.kycStatus,
      selfExcludedUntil: p.selfExcludedUntil,
      createdAt: p.createdAt,
      balanceMinor: walletMap.get(p.id)?.balanceMinor || '0',
      lockedMinor: walletMap.get(p.id)?.lockedMinor || '0',
    }));
  }

  async setUserStatus(actor: User, userId: string, status: UserStatus, reason?: string) {
    this.assertIsStaff(actor);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Player account not found');
    }

    const prevStatus = user.status;
    user.status = status;
    if (status === UserStatus.ACTIVE) {
      user.selfExcludedUntil = null as any;
      user.coolingOffUntil = null as any;
    }
    await this.userRepo.save(user);

    await this.auditService.log({
      actorId: actor.id,
      actorRole: actor.roles[0] || 'STAFF',
      action: status === UserStatus.FROZEN ? 'USER_FROZEN' : 'USER_STATUS_UPDATED',
      entity: 'USER',
      entityId: user.id,
      metadata: {
        prevStatus,
        newStatus: status,
        reason: reason || 'Action taken by operator',
        actedBy: actor.username,
      },
    });

    return {
      success: true,
      userId: user.id,
      username: user.username,
      status: user.status,
      message: `User status changed to ${status}`,
    };
  }

  
  async togglePlayerExclusion(actor: User, userId: string, action: 'STOP' | 'EXCLUDE', durationDays = 7, reason?: string) {
    this.assertIsStaff(actor);
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Player account not found');
    }

    if (action === 'STOP') {
      user.status = UserStatus.ACTIVE;
      user.selfExcludedUntil = null as any;
      user.coolingOffUntil = null as any;
      await this.userRepo.save(user);

      await this.auditService.log({
        actorId: actor.id,
        actorRole: actor.roles[0] || 'STAFF',
        action: 'SELF_EXCLUSION_STOPPED_BY_ADMIN',
        entity: 'USER',
        entityId: user.id,
        metadata: { reason: reason || 'Stopped by admin request', actedBy: actor.username },
      });

      return {
        success: true,
        message: 'Self-exclusion has been stopped. Player account is now ACTIVE.',
        status: user.status,
        selfExcludedUntil: null,
      };
    } else {
      const until = new Date();
      until.setDate(until.getDate() + durationDays);
      user.status = UserStatus.SELF_EXCLUDED;
      user.selfExcludedUntil = until;
      await this.userRepo.save(user);

      await this.auditService.log({
        actorId: actor.id,
        actorRole: actor.roles[0] || 'STAFF',
        action: 'SELF_EXCLUSION_APPLIED_BY_ADMIN',
        entity: 'USER',
        entityId: user.id,
        metadata: { durationDays, until, reason: reason || 'Applied by admin', actedBy: actor.username },
      });

      return {
        success: true,
        message: `Self-exclusion applied for ${durationDays} days.`,
        status: user.status,
        selfExcludedUntil: user.selfExcludedUntil,
      };
    }
  }

  /* ────────────────── 5. FULL USER TRANSACTION HISTORY (WITHDRAWAL REVIEW) ────────────────── */

  async getUserFinancialHistory(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const wallet = await this.walletRepo.findOne({ where: { userId } });
    const walletId = wallet ? wallet.id : null;

    // 1. All ledger transactions for this user
    let ledgerTransactions: LedgerTransaction[] = [];
    if (walletId) {
      ledgerTransactions = await this.ledgerRepo.find({
        where: { walletId },
        order: { createdAt: 'DESC' },
        take: 200,
      });
    }

    // 2. All payment requests (deposits and withdrawals)
    const paymentRequests = await this.paymentRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    // 3. Recent bets
    const recentBets = await this.betRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    // 4. Lifetime totals calculation
    let totalDepositsMinor = 0n;
    let totalWithdrawalsMinor = 0n;
    let totalBetsMinor = 0n;
    let totalWinsMinor = 0n;

    for (const p of paymentRequests) {
      if (p.status === PaymentRequestStatus.APPROVED) {
        if (p.requestType === PaymentRequestType.DEPOSIT) {
          totalDepositsMinor += BigInt(p.amountMinor);
        } else if (p.requestType === PaymentRequestType.WITHDRAWAL) {
          totalWithdrawalsMinor += BigInt(p.amountMinor);
        }
      }
    }

    for (const b of recentBets) {
      totalBetsMinor += BigInt(b.stakeMinor);
      if (b.payoutMinor) {
        totalWinsMinor += BigInt(b.payoutMinor);
      }
    }

    const netGamingProfitMinor = totalWinsMinor - totalBetsMinor;

    return {
      user: {
        id: user.id,
        phone: user.phone,
        username: user.username,
        status: user.status,
        kycStatus: user.kycStatus,
        createdAt: user.createdAt,
      },
      wallet: {
        balanceMinor: wallet ? wallet.balanceMinor : '0',
        lockedMinor: wallet ? wallet.lockedMinor : '0',
        currency: wallet ? wallet.currency : 'ETB',
        status: wallet ? wallet.status : 'ACTIVE',
      },
      summary: {
        totalDepositsMinor: totalDepositsMinor.toString(),
        totalWithdrawalsMinor: totalWithdrawalsMinor.toString(),
        totalBetsMinor: totalBetsMinor.toString(),
        totalWinsMinor: totalWinsMinor.toString(),
        netGamingProfitMinor: netGamingProfitMinor.toString(),
        depositCount: paymentRequests.filter((p) => p.requestType === PaymentRequestType.DEPOSIT).length,
        withdrawalCount: paymentRequests.filter((p) => p.requestType === PaymentRequestType.WITHDRAWAL).length,
        betCount: recentBets.length,
      },
      ledgerTransactions,
      paymentRequests,
      recentBets,
    };
  }

  /* ────────────────── 6. PROFIT AUDITS (DAILY, WEEKLY, MONTHLY) ────────────────── */

  async getProfitAudit(actor: User, period: 'daily' | 'weekly' | 'monthly') {
    this.assertIsStaff(actor);

    const isCreator = this.hasRole(actor, [UserRole.CREATOR, UserRole.SUPER_ADMIN]);
    const isOwner = this.hasRole(actor, [UserRole.BUSINESS_OWNER]);

    // Operators are strictly limited to daily audit only
    if (!isCreator && !isOwner) {
      if (period !== 'daily') {
        throw new ForbiddenException(
          'Operators are only authorized to view Daily Audits. Weekly and Monthly audits are restricted to Business Owners and Creators.',
        );
      }
    }

    const now = new Date();
    let startDate = new Date();

    if (period === 'daily') {
      startDate.setHours(0, 0, 0, 0); // Beginning of today
    } else if (period === 'weekly') {
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'monthly') {
      startDate.setDate(now.getDate() - 30);
    }

    // Settled bets within period
    const bets = await this.betRepo.find({
      where: {
        status: BetStatus.SETTLED,
        createdAt: MoreThanOrEqual(startDate),
      },
    });

    let totalWagersMinor = 0n;
    let totalPayoutsMinor = 0n;
    const activeUserSet = new Set<string>();

    for (const b of bets) {
      totalWagersMinor += BigInt(b.stakeMinor);
      if (b.payoutMinor) {
        totalPayoutsMinor += BigInt(b.payoutMinor);
      }
      activeUserSet.add(b.userId);
    }

    const grossGamingRevenueMinor = totalWagersMinor - totalPayoutsMinor;
    const observedRtp = totalWagersMinor > 0n ? Number(totalPayoutsMinor) / Number(totalWagersMinor) : 0;
    const houseEdge = 1 - observedRtp;

    // Approved deposits & withdrawals in period
    const approvedPayments = await this.paymentRepo.find({
      where: {
        status: PaymentRequestStatus.APPROVED,
        approvedAt: MoreThanOrEqual(startDate),
      },
    });

    let totalDepositsMinor = 0n;
    let totalWithdrawalsMinor = 0n;

    for (const p of approvedPayments) {
      if (p.requestType === PaymentRequestType.DEPOSIT) {
        totalDepositsMinor += BigInt(p.amountMinor);
      } else if (p.requestType === PaymentRequestType.WITHDRAWAL) {
        totalWithdrawalsMinor += BigInt(p.amountMinor);
      }
    }

    const netCashflowMinor = totalDepositsMinor - totalWithdrawalsMinor;

    // Day-by-day timeline breakdown
    const dayMap = new Map<
      string,
      { date: string; wagers: bigint; payouts: bigint; deposits: bigint; withdrawals: bigint; betsCount: number }
    >();

    // Seed timeline buckets
    const daysCount = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;
    for (let i = 0; i < daysCount; i++) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const key = d.toISOString().split('T')[0]!;
      dayMap.set(key, { date: key, wagers: 0n, payouts: 0n, deposits: 0n, withdrawals: 0n, betsCount: 0 });
    }

    for (const b of bets) {
      const key = new Date(b.createdAt).toISOString().split('T')[0]!;
      const bucket = dayMap.get(key);
      if (bucket) {
        bucket.wagers += BigInt(b.stakeMinor);
        if (b.payoutMinor) bucket.payouts += BigInt(b.payoutMinor);
        bucket.betsCount += 1;
      }
    }

    for (const p of approvedPayments) {
      const key = new Date(p.approvedAt || p.createdAt).toISOString().split('T')[0]!;
      const bucket = dayMap.get(key);
      if (bucket) {
        if (p.requestType === PaymentRequestType.DEPOSIT) bucket.deposits += BigInt(p.amountMinor);
        else bucket.withdrawals += BigInt(p.amountMinor);
      }
    }

    const timeline = Array.from(dayMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((item) => ({
        date: item.date,
        wagersMinor: item.wagers.toString(),
        payoutsMinor: item.payouts.toString(),
        grossProfitMinor: (item.wagers - item.payouts).toString(),
        depositsMinor: item.deposits.toString(),
        withdrawalsMinor: item.withdrawals.toString(),
        netCashflowMinor: (item.deposits - item.withdrawals).toString(),
        betsCount: item.betsCount,
      }));

    return {
      period,
      startDate,
      endDate: now,
      summary: {
        totalWagersMinor: totalWagersMinor.toString(),
        totalPayoutsMinor: totalPayoutsMinor.toString(),
        grossGamingRevenueMinor: grossGamingRevenueMinor.toString(),
        observedRtp: (observedRtp * 100).toFixed(2) + '%',
        houseEdge: (houseEdge * 100).toFixed(2) + '%',
        totalDepositsMinor: totalDepositsMinor.toString(),
        totalWithdrawalsMinor: totalWithdrawalsMinor.toString(),
        netCashflowMinor: netCashflowMinor.toString(),
        totalBets: bets.length,
        uniquePlayers: activeUserSet.size,
      },
      timeline,
    };
  }

  /* ────────────────── HELPER PERMISSION CHECKS ────────────────── */

  private hasRole(user: User, roles: UserRole[]): boolean {
    return user.roles?.some((r) => roles.includes(r as UserRole));
  }

  private assertIsStaff(user: User) {
    const isStaff = user.roles?.some((r) =>
      [
        UserRole.CREATOR,
        UserRole.BUSINESS_OWNER,
        UserRole.OPERATOR,
        UserRole.SUPER_ADMIN,
        UserRole.GAME_OPERATOR,
        UserRole.FINANCE,
      ].includes(r as UserRole),
    );
    if (!isStaff) {
      throw new ForbiddenException('Staff authorization required');
    }
  }

  private assertIsCreator(user: User, actionName: string) {
    const isCreator = this.hasRole(user, [UserRole.CREATOR, UserRole.SUPER_ADMIN]);
    if (!isCreator) {
      throw new ForbiddenException(`Only the Creator (Super Admin) is authorized to ${actionName}.`);
    }
  }
}
