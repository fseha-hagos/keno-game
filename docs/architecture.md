# Keno Real-Money Platform — Architecture & System Design

## 1. System Overview

The Keno Platform is a multi-tier, server-authoritative online real-money gaming solution designed to operate with absolute mathematical integrity, rigorous financial double-entry accounting, and jurisdictional compliance.

### Core Architectural Axioms
1. **The Client is Untrusted:** The React Native mobile client and React web applications are presentation layers only. Payouts, balances, RNG draws, and settlement statuses are exclusively server-authoritative.
2. **RTP is Fixed Pure Mathematics:** Return-to-Player (RTP) is determined entirely by static paytables derived from hypergeometric probability distributions. The platform never dynamically compensates or alters odds based on player history or house profit.
3. **CSPRNG Independence:** The 20-number draw is generated uniformly without replacement from 80 balls via CSPRNG Fisher-Yates shuffle with cryptographic SHA-256 proofs.
4. **Zero Float Arithmetic:** All monetary amounts are stored and processed strictly as integer minor units (e.g. cents).
5. **Idempotent Settlement:** All financial operations and bet transactions enforce unique idempotency keys.

---

## 2. Monorepo Topology

```
keno-game/
├── apps/
│   ├── mobile/         # React Native (iOS & Android)
│   ├── api/            # NestJS Backend API (REST + WebSocket)
│   └── admin/          # React + Vite Admin & Reporting Dashboard
├── packages/
│   ├── shared-types/   # Cross-stack TypeScript interfaces, DTOs & enums
│   ├── game-math/      # Pure Keno hypergeometric probability & RTP engine
│   ├── validation/     # Shared Zod validation schemas
│   └── config/         # Global game constants & environment configuration
├── infrastructure/
│   ├── docker/         # Docker Compose & multi-stage Dockerfiles
│   └── terraform/      # AWS IaC (VPC, ECS Fargate, Multi-AZ RDS, ElastiCache, KMS)
├── docs/               # Architecture, Security, Math & Regulatory documentation
└── .github/workflows/  # CI/CD pipelines
```

---

## 3. End-to-End Bet Flow

```
+-------------+
|   Client    |
+------+------+
       |
       | POST /api/v1/keno/bets { roundId, stakeMinor, selectedNumbers, idempotencyKey }
       v
+-------------+
|  API Auth   | --> JWT Signature & Session Verification
+------+------+
       |
       v
+-------------------+
| Responsible Play  | --> Check Self-Exclusion, Cooling-off, Daily/Weekly Wager Limits
+------+------+-----+
       |
       v
+-------------------+
|  Pessimistic Lock | --> SELECT * FROM wallet_accounts WHERE id = :id FOR UPDATE
|   & Wallet Debit  | --> INSERT INTO ledger_transactions (BET, -stakeMinor)
+------+------+-----+
       |
       v
+-------------------+
| Bet Confirmation  | --> INSERT INTO bets (status: PENDING)
+------+------+-----+
       |
       v
+-------------------+
|  CSPRNG Draw &    | --> 20 balls drawn via crypto.randomInt Fisher-Yates
|  Round Settlement | --> hits = intersection(selectedNumbers, drawResult)
|                   | --> multiplier = paytable[spots][hits]
|                   | --> payoutMinor = stakeMinor * multiplier
|                   | --> If payout > 0: INSERT INTO ledger_transactions (WIN, +payoutMinor)
|                   | --> UPDATE bets SET status = SETTLED
+------+------+-----+
       |
       v
+-------------------+
| Real-time Socket  | --> Broadcast 'keno.number.drawn' & 'keno.bet.settled'
+-------------------+
```
