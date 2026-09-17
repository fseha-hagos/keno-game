# Keno Real-Money Platform — Security & Cryptographic Model

## 1. Zero-Trust Client Architecture

The platform operates on a strict zero-trust model regarding mobile and web clients:
- **No Client Calculations:** Stake validation, hits evaluation, payout amounts, and balances are computed exclusively by the NestJS backend.
- **Payload Validation:** All endpoints enforce schema whitelisting via Zod and class-validator.
- **Idempotency Enforcement:** All state-modifying requests require a unique idempotency key checked within database transactions before any funds are debited.

---

## 2. CSPRNG Random Draw Implementation

- The random number generator utilizes Node's cryptographically secure pseudo-random number generator (`crypto.randomInt` / `crypto.randomBytes`).
- Uniform sampling without replacement is implemented via an unbiased Fisher-Yates shuffle.
- **Cryptographic Audit Hash:** Each round calculates a SHA-256 HMAC of the 20-number draw and a 256-bit server seed (`SHA-256(seed + ":" + drawResult)`). The result is stored immutably for post-game provable fairness verification.
- **Zero Profit-Adaptive Logic:** Outcomes are statistically independent of player balance, RTP targets, house profit, or betting history.

---

## 3. Financial Ledger Integrity

- Double-entry immutable accounting table (`ledger_transactions`).
- Integer minor units (`NUMERIC(20,0)`) prevent IEEE-754 floating point rounding vulnerabilities.
- Pessimistic write locks (`SELECT ... FOR UPDATE`) prevent race conditions during concurrent bet placement and withdrawals.
- Append-only architecture: historical ledger rows are never updated or deleted. Corrections are made via explicit `ADJUSTMENT` or `REFUND` transactions.

---

## 4. Threat Mitigations

| Threat | Mitigation Mechanism |
|---|---|
| **Replay Attacks** | Unique idempotency keys with database unique constraints |
| **Tampered Balances** | Balance is cached and re-computed from immutable ledger |
| **Race Conditions** | Row-level pessimistic locking on wallet accounts |
| **Injection Attacks** | Parameterized TypeORM queries and strict schema validation |
| **Session Hijacking** | Short-lived JWT access tokens (15m) + refresh token rotation |
| **Denial of Service** | AWS WAF rate limiting + Helmet security headers |
