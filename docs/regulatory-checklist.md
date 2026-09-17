# Real-Money Gaming Regulatory Readiness Checklist

> [!IMPORTANT]
> This checklist outlines technical preparation for certification under standard jurisdictions (e.g., UKGC, MGA, NJ DGE, Isle of Man, Curacao). Formal licensing requires submission of test reports from an Accredited Testing Facility (ATF) such as GLI, BMM Testlabs, or eCOGRA.

---

## 1. Random Number Generator (RNG) Certification (GLI-19 / Standards)

- [x] **Unbiased Sampling:** Fisher-Yates shuffle with cryptographic random entropy.
- [x] **Independence:** Zero coupling between RNG output and house revenue, player balance, or previous outcomes.
- [x] **Scaling & Mapping:** Integer selection with zero modulo bias.
- [x] **Cryptographic Audit Trail:** SHA-256 seed-hashed draw storage for post-round verification.
- [ ] **Diehard / NIST SP 800-22 Test Battery:** Pass statistical randomness tests on 10,000,000+ generated draws.

---

## 2. Game Mathematics & Return to Player (RTP)

- [x] **Theoretical Model Documentation:** Explicit hypergeometric formula document for all spot configurations ($s \in [1, 10]$).
- [x] **Paytable Immutability:** Historical paytable versions stored in immutable database tables and linked by UUID to every settled bet.
- [x] **Monte Carlo Verification:** Automated simulator verifying empirical convergence to theoretical RTP within 95% confidence intervals.
- [x] **Observed vs Theoretical Reporting:** Administrative reporting module tracking actual RTP vs certified theoretical RTP.

---

## 3. Financial & Ledger Compliance

- [x] **Double-Entry Ledger:** All wagers, wins, refunds, and adjustments recorded in append-only tables.
- [x] **Integer Minor Units:** All monetary calculations in cents/minor units to prevent precision loss.
- [x] **Idempotency Safeguards:** Strict duplicate request filtering on all wallet debit and credit endpoints.
- [x] **Segregated Balances:** Distinct tracking of cash balances vs bonus credits.

---

## 4. Responsible Gambling & Player Protection

- [x] **Mandatory Server-Side Enforcement:** Hard checks on every bet placement preventing self-excluded or limited players from betting.
- [x] **Deposit & Wager Limits:** Support for daily, weekly, and monthly monetary caps.
- [x] **Cooling-off & Self-Exclusion:** Immediate account locks for requested cooling-off periods (7 days to permanent).
- [x] **Reality Checks & Session Timers:** Periodic alerts informing players of duration and net spend.

---

## 5. Information Security & Audit Logging

- [x] **Comprehensive Audit Trail:** Immutable logging of all sensitive actions (registration, KYC status changes, bets, settlements, logins, limit modifications).
- [x] **Zero-Trust Network:** TLS 1.3 encryption in transit and AWS KMS AES-256 encryption at rest for databases and backups.
- [x] **Role-Based Access Control (RBAC):** Principle of least privilege enforced across administrative endpoints.
