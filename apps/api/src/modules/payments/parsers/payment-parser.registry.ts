import { Injectable, Logger } from '@nestjs/common';
import { PaymentProviderName } from '../../../database/entities/payment-evidence.entity';
import { PaymentParser, ParsedPaymentData } from './payment-parser.interface';
import { TelebirrParser } from './telebirr.parser';
import { MpesaParser } from './mpesa.parser';
import { CbeBirrParser } from './cbe-birr.parser';
import { CbeBankParser } from './cbe-bank.parser';
import { GenericBankParser } from './generic-bank.parser';

@Injectable()
export class PaymentParserRegistry {
  private readonly logger = new Logger(PaymentParserRegistry.name);
  private readonly parsers: PaymentParser[];

  constructor(
    private readonly telebirrParser: TelebirrParser,
    private readonly mpesaParser: MpesaParser,
    private readonly cbeBirrParser: CbeBirrParser,
    private readonly cbeBankParser: CbeBankParser,
    private readonly genericBankParser: GenericBankParser,
  ) {
    this.parsers = [
      this.telebirrParser,
      this.mpesaParser,
      this.cbeBirrParser,
      this.cbeBankParser,
      this.genericBankParser,
    ];
  }

  /**
   * Identifies the appropriate parser and extracts payment attributes.
   * If a specific parser canParse returns true, we use it.
   * If not, we try all parsers and select the one with the highest confidence.
   */
  parseNotification(senderHeader: string, text: string): ParsedPaymentData {
    if (!text) {
      return {
        provider: PaymentProviderName.UNKNOWN,
        currency: 'ETB',
        confidence: 0,
      };
    }

    // 1. Try matching by sender header / specific pattern
    for (const parser of this.parsers) {
      if (parser.canParse(senderHeader, text)) {
        const parsed = parser.parse(text, senderHeader);
        if (parsed && (parsed.amountMinor || parsed.transactionReference)) {
          this.logger.log(
            `Parsed ${parsed.provider} notification: Ref=${parsed.transactionReference}, Amount=${parsed.amountMinor} minor units, Conf=${parsed.confidence}%`,
          );
          return parsed;
        }
      }
    }

    // 2. Fallback: try all parsers and pick highest confidence
    let bestResult: ParsedPaymentData = {
      provider: PaymentProviderName.UNKNOWN,
      currency: 'ETB',
      confidence: 0,
      rawSnippet: text.substring(0, 200),
    };

    for (const parser of this.parsers) {
      const parsed = parser.parse(text, senderHeader);
      if (parsed && parsed.confidence > bestResult.confidence) {
        bestResult = parsed;
      }
    }

    this.logger.log(
      `Fallback parsed notification as ${bestResult.provider}: Ref=${bestResult.transactionReference}, Amount=${bestResult.amountMinor}, Conf=${bestResult.confidence}%`,
    );

    return bestResult;
  }
}
