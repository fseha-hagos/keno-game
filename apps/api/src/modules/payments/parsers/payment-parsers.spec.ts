import { TelebirrParser } from './telebirr.parser';
import { MpesaParser } from './mpesa.parser';
import { CbeBirrParser } from './cbe-birr.parser';
import { CbeBankParser } from './cbe-bank.parser';
import { GenericBankParser } from './generic-bank.parser';
import { PaymentParserRegistry } from './payment-parser.registry';
import { PaymentProviderName } from '../../../database/entities/payment-evidence.entity';

describe('Payment Parsers Suite', () => {
  let telebirrParser: TelebirrParser;
  let mpesaParser: MpesaParser;
  let cbeBirrParser: CbeBirrParser;
  let cbeBankParser: CbeBankParser;
  let genericBankParser: GenericBankParser;
  let registry: PaymentParserRegistry;

  beforeEach(() => {
    telebirrParser = new TelebirrParser();
    mpesaParser = new MpesaParser();
    cbeBirrParser = new CbeBirrParser();
    cbeBankParser = new CbeBankParser();
    genericBankParser = new GenericBankParser();
    registry = new PaymentParserRegistry(
      telebirrParser,
      mpesaParser,
      cbeBirrParser,
      cbeBankParser,
      genericBankParser,
    );
  });

  describe('TelebirrParser', () => {
    it('should parse standard Telebirr receive SMS', () => {
      const sms =
        'You have received ETB 100.00 from ABEBE KEBEDE (0912345678) on 19/10/2026 14:30:15. Transaction number: CI94719082. Your new balance is ETB 1,250.00.';
      const res = telebirrParser.parse(sms, 'telebirr');

      expect(res).not.toBeNull();
      expect(res?.provider).toBe(PaymentProviderName.TELEBIRR);
      expect(res?.amountMinor).toBe('10000'); // 100.00 * 100
      expect(res?.transactionReference).toBe('CI94719082');
      expect(res?.senderPhone).toBe('0912345678');
      expect(res?.senderName).toBe('ABEBE KEBEDE');
      expect(res?.confidence).toBeGreaterThanOrEqual(80);
    });

    it('should parse compact Telebirr notification', () => {
      const text = 'Transaction CI12345678: You received 500 ETB from 0911223344 (Tadesse Alemu). Balance: ETB 2000.00.';
      const res = telebirrParser.parse(text, '127');

      expect(res?.amountMinor).toBe('50000');
      expect(res?.transactionReference).toBe('CI12345678');
      expect(res?.senderPhone).toBe('0911223344');
    });
  });

  describe('MpesaParser', () => {
    it('should parse standard M-Pesa Safaricom SMS', () => {
      const sms =
        'NL47JK890 Confirmed. You have received ETB 250.00 from 251712345678 - HAILU TESFAYE on 19/10/2026 at 3:45 PM. New M-PESA balance is ETB 3,500.00.';
      const res = mpesaParser.parse(sms, 'M-PESA');

      expect(res?.provider).toBe(PaymentProviderName.MPESA);
      expect(res?.transactionReference).toBe('NL47JK890');
      expect(res?.amountMinor).toBe('25000');
      expect(res?.senderPhone).toBe('251712345678');
      expect(res?.senderName).toBe('HAILU TESFAYE');
      expect(res?.confidence).toBeGreaterThanOrEqual(80);
    });
  });

  describe('CbeBirrParser', () => {
    it('should parse standard CBE Birr SMS', () => {
      const sms =
        'Dear Customer, ETB 150.00 has been transferred to your CBE Birr account 0978614151 from 0922334455 KEBEDE SISAY. Txn ID: CB987654321 on 2026-10-19 16:12:00. Balance is ETB 800.00.';
      const res = cbeBirrParser.parse(sms, 'CBEBirr');

      expect(res?.provider).toBe(PaymentProviderName.CBE_BIRR);
      expect(res?.amountMinor).toBe('15000');
      expect(res?.transactionReference).toBe('CB987654321');
      expect(res?.senderPhone).toBe('0922334455');
      expect(res?.senderName).toBe('KEBEDE SISAY');
      expect(res?.confidence).toBeGreaterThanOrEqual(80);
    });
  });

  describe('CbeBankParser', () => {
    it('should parse Commercial Bank of Ethiopia bank transfer notification', () => {
      const sms =
        'Dear Customer, your account 1000*****6789 has been credited with ETB 1,000.00 on 19-OCT-2026 14:10 by mobile transfer from 1000*****1234 / SISAY BEKELE. Txn Ref: FT262920XXXX. Your current balance is ETB 5,400.00.';
      const res = cbeBankParser.parse(sms, 'CBE');

      expect(res?.provider).toBe(PaymentProviderName.CBE_BANK);
      expect(res?.amountMinor).toBe('100000'); // 1,000.00 * 100
      expect(res?.transactionReference).toBe('FT262920XXXX');
      expect(res?.senderName).toBe('SISAY BEKELE');
      expect(res?.confidence).toBeGreaterThanOrEqual(80);
    });
  });

  describe('PaymentParserRegistry', () => {
    it('should route to the correct parser based on senderHeader', () => {
      const parsed = registry.parseNotification(
        'telebirr',
        'You have received ETB 75.00 from 0911000000. Transaction number: CI88990011.',
      );
      expect(parsed.provider).toBe(PaymentProviderName.TELEBIRR);
      expect(parsed.amountMinor).toBe('7500');
      expect(parsed.transactionReference).toBe('CI88990011');
    });

    it('should fallback and parse correctly even with unknown senderHeader', () => {
      const parsed = registry.parseNotification(
        'unknown',
        'NL47JK890 Confirmed. You have received ETB 300.00 from 0712345678 - TESFAYE.',
      );
      expect(parsed.provider).toBe(PaymentProviderName.MPESA);
      expect(parsed.amountMinor).toBe('30000');
      expect(parsed.transactionReference).toBe('NL47JK890');
    });
  });
});
