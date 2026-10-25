import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { RngModule } from './modules/rng/rng.module';
import { PaytablesModule } from './modules/paytables/paytables.module';
import { GameRoundsModule } from './modules/game-rounds/game-rounds.module';
import { BetsModule } from './modules/bets/bets.module';
import { SettlementModule } from './modules/settlement/settlement.module';
import { ResponsibleGamblingModule } from './modules/responsible-gambling/responsible-gambling.module';
import { KycModule } from './modules/kyc/kyc.module';
import { AuditModule } from './modules/audit/audit.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { EventsModule } from './modules/websocket/events.module';
import { HealthModule } from './modules/health/health.module';
import { ChatModule } from './modules/chat/chat.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'apps/api/.env', '../../apps/api/.env'],
    }),
    DatabaseModule,
    AuditModule,
    EventsModule,
    ChatModule,
    PaymentsModule,
    RngModule,
    LedgerModule,
    WalletModule,
    PaytablesModule,
    SettlementModule,
    GameRoundsModule,
    ResponsibleGamblingModule,
    BetsModule,
    AuthModule,
    KycModule,
    ReportingModule,
    HealthModule,
    AdminModule,
  ],
})
export class AppModule {}

