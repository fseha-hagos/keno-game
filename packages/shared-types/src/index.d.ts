export declare enum UserStatus {
    PENDING_KYC = "PENDING_KYC",
    ACTIVE = "ACTIVE",
    SUSPENDED = "SUSPENDED",
    SELF_EXCLUDED = "SELF_EXCLUDED",
    CLOSED = "CLOSED"
}
export declare enum KycStatus {
    NOT_STARTED = "NOT_STARTED",
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    ACTION_REQUIRED = "ACTION_REQUIRED"
}
export declare enum KycTier {
    TIER_1 = "TIER_1",// Basic ID check, lower limits
    TIER_2 = "TIER_2",// Enhanced verification + Proof of Address
    TIER_3 = "TIER_3"
}
export declare enum UserRole {
    PLAYER = "PLAYER",
    SUPER_ADMIN = "SUPER_ADMIN",
    GAME_OPERATOR = "GAME_OPERATOR",
    FINANCE = "FINANCE",
    KYC_OPERATOR = "KYC_OPERATOR",
    RISK_OPERATOR = "RISK_OPERATOR",
    SUPPORT = "SUPPORT",
    AUDITOR = "AUDITOR"
}
export declare enum TransactionType {
    DEPOSIT = "DEPOSIT",
    BET = "BET",
    WIN = "WIN",
    REFUND = "REFUND",
    WITHDRAWAL = "WITHDRAWAL",
    BONUS = "BONUS",
    ADJUSTMENT = "ADJUSTMENT",
    CHARGEBACK = "CHARGEBACK"
}
export declare enum LedgerReferenceType {
    BET = "BET",
    DEPOSIT = "DEPOSIT",
    WITHDRAWAL = "WITHDRAWAL",
    MANUAL_ADJUSTMENT = "MANUAL_ADJUSTMENT"
}
export declare enum RoundStatus {
    SCHEDULED = "SCHEDULED",
    OPEN = "OPEN",
    CLOSED = "CLOSED",
    DRAWN = "DRAWN",
    SETTLED = "SETTLED",
    CANCELLED = "CANCELLED"
}
export declare enum BetStatus {
    PENDING = "PENDING",
    SETTLED = "SETTLED",
    CANCELLED = "CANCELLED",
    REFUNDED = "REFUNDED"
}
export declare enum LimitType {
    DEPOSIT = "DEPOSIT",
    WAGER = "WAGER",
    LOSS = "LOSS",
    SESSION_TIME = "SESSION_TIME"
}
export declare enum LimitDuration {
    DAILY = "DAILY",
    WEEKLY = "WEEKLY",
    MONTHLY = "MONTHLY"
}
export declare enum PaymentProviderStatus {
    PENDING = "PENDING",
    PROCESSING = "PROCESSING",
    SUCCEEDED = "SUCCEEDED",
    FAILED = "FAILED",
    CANCELLED = "CANCELLED"
}
export declare enum WebSocketEvents {
    ROUND_SCHEDULED = "keno.round.scheduled",
    ROUND_OPENED = "keno.round.opened",
    ROUND_CLOSED = "keno.round.closed",
    DRAW_STARTED = "keno.draw.started",
    NUMBER_DRAWN = "keno.number.drawn",
    ROUND_COMPLETED = "keno.round.completed",
    BET_SETTLED = "keno.bet.settled",
    WALLET_BALANCE_UPDATED = "wallet.balance.updated"
}
export interface UserDto {
    id: string;
    email: string;
    username: string;
    phone?: string;
    status: UserStatus;
    kycStatus: KycStatus;
    kycTier: KycTier;
    roles: UserRole[];
    createdAt: string;
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: 'Bearer';
}
export interface WalletAccountDto {
    id: string;
    userId: string;
    currency: string;
    balanceMinor: string;
    lockedMinor: string;
    status: string;
    createdAt: string;
    updatedAt: string;
}
export interface LedgerTransactionDto {
    id: string;
    walletId: string;
    transactionType: TransactionType;
    amountMinor: string;
    currency: string;
    referenceType?: LedgerReferenceType;
    referenceId?: string;
    status: string;
    idempotencyKey?: string;
    balanceAfterMinor: string;
    createdAt: string;
}
export interface PaytableEntry {
    spots: number;
    hits: number;
    multiplier: number;
}
export interface PaytableVersionDto {
    id: string;
    gameId: string;
    version: number;
    name: string;
    theoreticalRtp: number;
    isDefault: boolean;
    status: 'DRAFT' | 'APPROVED' | 'ACTIVE' | 'ARCHIVED';
    entries: PaytableEntry[];
    createdAt: string;
}
export interface GameRoundDto {
    id: string;
    roundNumber: number;
    gameId: string;
    gameVersionId: string;
    status: RoundStatus;
    scheduledAt: string;
    openedAt?: string;
    closedAt?: string;
    completedAt?: string;
    drawResult?: number[];
    resultHash?: string;
    totalWageredMinor?: string;
    totalPayoutMinor?: string;
    createdAt: string;
}
export interface BetDto {
    id: string;
    userId: string;
    roundId: string;
    roundNumber: number;
    gameVersionId: string;
    paytableVersionId: string;
    stakeMinor: string;
    currency: string;
    selectedNumbers: number[];
    spots: number;
    hits?: number;
    hitNumbers?: number[];
    multiplier?: number;
    payoutMinor?: string;
    status: BetStatus;
    idempotencyKey: string;
    createdAt: string;
    settledAt?: string;
}
export interface PlaceBetRequestDto {
    roundId: string;
    stakeMinor: string;
    currency: string;
    selectedNumbers: number[];
    idempotencyKey: string;
}
export interface ResponsibleGamblingLimitDto {
    id: string;
    userId: string;
    limitType: LimitType;
    duration: LimitDuration;
    amountMinor?: string;
    durationMinutes?: number;
    activeFrom: string;
    pendingChangeAt?: string;
    pendingAmountMinor?: string;
}
export interface RtpReportDto {
    gameVersionId: string;
    paytableVersionId: string;
    theoreticalRtp: number;
    observedRtp: number;
    totalWagersMinor: string;
    totalPayoutsMinor: string;
    totalRounds: number;
    totalBets: number;
    houseProfitMinor: string;
    hitCountBySpot: Record<number, Record<number, number>>;
}
export interface AuditLogDto {
    id: string;
    actorId: string;
    actorRole: string;
    action: string;
    entity: string;
    entityId: string;
    requestId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
    timestamp: string;
}
//# sourceMappingURL=index.d.ts.map