"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketEvents = exports.PaymentProviderStatus = exports.LimitDuration = exports.LimitType = exports.BetStatus = exports.RoundStatus = exports.LedgerReferenceType = exports.TransactionType = exports.UserRole = exports.KycTier = exports.KycStatus = exports.UserStatus = void 0;
var UserStatus;
(function (UserStatus) {
    UserStatus["PENDING_KYC"] = "PENDING_KYC";
    UserStatus["ACTIVE"] = "ACTIVE";
    UserStatus["SUSPENDED"] = "SUSPENDED";
    UserStatus["SELF_EXCLUDED"] = "SELF_EXCLUDED";
    UserStatus["CLOSED"] = "CLOSED";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
var KycStatus;
(function (KycStatus) {
    KycStatus["NOT_STARTED"] = "NOT_STARTED";
    KycStatus["PENDING"] = "PENDING";
    KycStatus["APPROVED"] = "APPROVED";
    KycStatus["REJECTED"] = "REJECTED";
    KycStatus["ACTION_REQUIRED"] = "ACTION_REQUIRED";
})(KycStatus || (exports.KycStatus = KycStatus = {}));
var KycTier;
(function (KycTier) {
    KycTier["TIER_1"] = "TIER_1";
    KycTier["TIER_2"] = "TIER_2";
    KycTier["TIER_3"] = "TIER_3";
})(KycTier || (exports.KycTier = KycTier = {}));
var UserRole;
(function (UserRole) {
    UserRole["PLAYER"] = "PLAYER";
    UserRole["SUPER_ADMIN"] = "SUPER_ADMIN";
    UserRole["GAME_OPERATOR"] = "GAME_OPERATOR";
    UserRole["FINANCE"] = "FINANCE";
    UserRole["KYC_OPERATOR"] = "KYC_OPERATOR";
    UserRole["RISK_OPERATOR"] = "RISK_OPERATOR";
    UserRole["SUPPORT"] = "SUPPORT";
    UserRole["AUDITOR"] = "AUDITOR";
})(UserRole || (exports.UserRole = UserRole = {}));
var TransactionType;
(function (TransactionType) {
    TransactionType["DEPOSIT"] = "DEPOSIT";
    TransactionType["BET"] = "BET";
    TransactionType["WIN"] = "WIN";
    TransactionType["REFUND"] = "REFUND";
    TransactionType["WITHDRAWAL"] = "WITHDRAWAL";
    TransactionType["BONUS"] = "BONUS";
    TransactionType["ADJUSTMENT"] = "ADJUSTMENT";
    TransactionType["CHARGEBACK"] = "CHARGEBACK";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
var LedgerReferenceType;
(function (LedgerReferenceType) {
    LedgerReferenceType["BET"] = "BET";
    LedgerReferenceType["DEPOSIT"] = "DEPOSIT";
    LedgerReferenceType["WITHDRAWAL"] = "WITHDRAWAL";
    LedgerReferenceType["MANUAL_ADJUSTMENT"] = "MANUAL_ADJUSTMENT";
})(LedgerReferenceType || (exports.LedgerReferenceType = LedgerReferenceType = {}));
var RoundStatus;
(function (RoundStatus) {
    RoundStatus["SCHEDULED"] = "SCHEDULED";
    RoundStatus["OPEN"] = "OPEN";
    RoundStatus["CLOSED"] = "CLOSED";
    RoundStatus["DRAWN"] = "DRAWN";
    RoundStatus["SETTLED"] = "SETTLED";
    RoundStatus["CANCELLED"] = "CANCELLED";
})(RoundStatus || (exports.RoundStatus = RoundStatus = {}));
var BetStatus;
(function (BetStatus) {
    BetStatus["PENDING"] = "PENDING";
    BetStatus["SETTLED"] = "SETTLED";
    BetStatus["CANCELLED"] = "CANCELLED";
    BetStatus["REFUNDED"] = "REFUNDED";
})(BetStatus || (exports.BetStatus = BetStatus = {}));
var LimitType;
(function (LimitType) {
    LimitType["DEPOSIT"] = "DEPOSIT";
    LimitType["WAGER"] = "WAGER";
    LimitType["LOSS"] = "LOSS";
    LimitType["SESSION_TIME"] = "SESSION_TIME";
})(LimitType || (exports.LimitType = LimitType = {}));
var LimitDuration;
(function (LimitDuration) {
    LimitDuration["DAILY"] = "DAILY";
    LimitDuration["WEEKLY"] = "WEEKLY";
    LimitDuration["MONTHLY"] = "MONTHLY";
})(LimitDuration || (exports.LimitDuration = LimitDuration = {}));
var PaymentProviderStatus;
(function (PaymentProviderStatus) {
    PaymentProviderStatus["PENDING"] = "PENDING";
    PaymentProviderStatus["PROCESSING"] = "PROCESSING";
    PaymentProviderStatus["SUCCEEDED"] = "SUCCEEDED";
    PaymentProviderStatus["FAILED"] = "FAILED";
    PaymentProviderStatus["CANCELLED"] = "CANCELLED";
})(PaymentProviderStatus || (exports.PaymentProviderStatus = PaymentProviderStatus = {}));
var WebSocketEvents;
(function (WebSocketEvents) {
    WebSocketEvents["ROUND_SCHEDULED"] = "keno.round.scheduled";
    WebSocketEvents["ROUND_OPENED"] = "keno.round.opened";
    WebSocketEvents["ROUND_CLOSED"] = "keno.round.closed";
    WebSocketEvents["DRAW_STARTED"] = "keno.draw.started";
    WebSocketEvents["NUMBER_DRAWN"] = "keno.number.drawn";
    WebSocketEvents["ROUND_COMPLETED"] = "keno.round.completed";
    WebSocketEvents["BET_SETTLED"] = "keno.bet.settled";
    WebSocketEvents["WALLET_BALANCE_UPDATED"] = "wallet.balance.updated";
})(WebSocketEvents || (exports.WebSocketEvents = WebSocketEvents = {}));
//# sourceMappingURL=index.js.map