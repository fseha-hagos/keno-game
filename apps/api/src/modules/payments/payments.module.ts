import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentEvidence } from '../../database/entities/payment-evidence.entity';
import { PaymentRequest } from '../../database/entities/payment-request.entity';
import { User } from '../../database/entities/user.entity';
import { TelebirrParser } from './parsers/telebirr.parser';
import { MpesaParser } from './parsers/mpesa.parser';
import { CbeBirrParser } from './parsers/cbe-birr.parser';
import { CbeBankParser } from './parsers/cbe-bank.parser';
import { GenericBankParser } from './parsers/generic-bank.parser';
import { PaymentParserRegistry } from './parsers/payment-parser.registry';
import { DepositMatchingService } from './deposit-matching.service';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentEvidence, PaymentRequest, User])],
  controllers: [PaymentsController],
  providers: [
    TelebirrParser,
    MpesaParser,
    CbeBirrParser,
    CbeBankParser,
    GenericBankParser,
    PaymentParserRegistry,
    DepositMatchingService,
  ],
  exports: [DepositMatchingService, PaymentParserRegistry],
})
export class PaymentsModule {}
