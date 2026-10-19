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

    it('should parse real production Telebirr SMS with masked phone and DJ reference', () => {
      const sms = `Dear Hagos 
You have received ETB 200.00 from Samrawit Hagos(2519****5316)  on 19/10/2026 19:09:17. Your transaction number is DJJ52J9YGF. Your current E-Money Account balance is ETB 206.82.
Thank you for using telebirr
Ethio telecom`;

      const res = telebirrParser.parse(sms, 'telebirr');

      expect(res).not.toBeNull();
      expect(res?.provider).toBe(PaymentProviderName.TELEBIRR);
      expect(res?.amountMinor).toBe('20000');
      expect(res?.amountDisplay).toBe(200.0);
      expect(res?.transactionReference).toBe('DJJ52J9YGF');
      expect(res?.senderName).toBe('Samrawit Hagos');
      expect(res?.senderPhone).toBe('2519****5316');
      expect(res?.receiverName).toBe('Hagos');
      expect(res?.balanceDisplay).toBe(206.82);
      expect(res?.transactionTime).toBeDefined();
      expect(res?.transactionTime?.getDate()).toBe(19);
      expect(res?.transactionTime?.getMonth()).toBe(9); // October
      expect(res?.transactionTime?.getFullYear()).toBe(2026);
      expect(res?.confidence).toBe(100);
    });

    it('should parse real production Telebirr SMS with second transaction format', () => {
      const sms = `Dear Fseha 
You have received ETB 375.00 from Hagos Gerekidan(2519****1265)  on 19/10/2026 14:27:45. Your transaction number is DJJ424C9T8. Your current E-Money Account balance is ETB 646.81.
Thank you for using telebirr
Ethio telecom`;

      const res = telebirrParser.parse(sms, '127');

      expect(res).not.toBeNull();
      expect(res?.provider).toBe(PaymentProviderName.TELEBIRR);
      expect(res?.amountMinor).toBe('37500');
      expect(res?.amountDisplay).toBe(375.0);
      expect(res?.transactionReference).toBe('DJJ424C9T8');
      expect(res?.senderName).toBe('Hagos Gerekidan');
      expect(res?.senderPhone).toBe('2519****1265');
      expect(res?.receiverName).toBe('Fseha');
      expect(res?.balanceDisplay).toBe(646.81);
      expect(res?.transactionTime).toBeDefined();
      expect(res?.confidence).toBe(100);
    });

    it('should parse real production Telebirr transfer confirmation SMS pasted by user', () => {
      const sms = `Dear Fseha 
You have transferred ETB 1.00 to Hagos Gerekidan (2519****1265) on 19/10/2026 22:26:26. Your transaction number is DJJ82SWP4M. The service fee is  ETB 0.87 and  15% VAT on the service fee is ETB 0.13. Your current E-Money Account  balance is ETB 317.81. To download your payment information please click this link: https://transactioninfo.ethiotelecom.et/receipt/DJJ82SWP4M.

Thank you for using telebirr
Ethio telecom.`;

      const res = telebirrParser.parse(sms, 'telebirr');

      expect(res).not.toBeNull();
      expect(res?.provider).toBe(PaymentProviderName.TELEBIRR);
      expect(res?.amountMinor).toBe('100'); // 1.00 ETB = 100 minor units
      expect(res?.amountDisplay).toBe(1.0);
      expect(res?.transactionReference).toBe('DJJ82SWP4M');
      expect(res?.senderName).toBe('Fseha');
      expect(res?.senderPhone).toBe('2519****1265');
      expect(res?.confidence).toBeGreaterThanOrEqual(80);
    });

    it('should parse multiple concatenated Telebirr SMS notifications', () => {
      const combined = `Dear Hagos 
You have received ETB 200.00 from Samrawit Hagos(2519****5316)  on 19/10/2026 19:09:17. Your transaction number is DJJ52J9YGF. Your current E-Money Account balance is ETB 206.82.
Thank you for using telebirr
Ethio telecom, Dear Hagos 
You have received ETB 200.00 from Samrawit Hagos(2519****5316)  on 19/10/2026 19:09:17. Your transaction number is DJJ52J9YGF. Your current E-Money Account balance is ETB 206.82.
Thank you for using telebirr
Ethio telecom, Dear Fseha 
You have received ETB 375.00 from Hagos Gerekidan(2519****1265)  on 19/10/2026 14:27:45. Your transaction number is DJJ424C9T8. Your current E-Money Account balance is ETB 646.81.
Thank you for using telebirr
Ethio telecom`;

      const list = telebirrParser.parseMultiple(combined, 'telebirr');

      expect(list.length).toBe(3);
      expect(list[0]?.transactionReference).toBe('DJJ52J9YGF');
      expect(list[0]?.amountMinor).toBe('20000');
      expect(list[0]?.senderName).toBe('Samrawit Hagos');

      expect(list[1]?.transactionReference).toBe('DJJ52J9YGF');
      expect(list[1]?.amountMinor).toBe('20000');

      expect(list[2]?.transactionReference).toBe('DJJ424C9T8');
      expect(list[2]?.amountMinor).toBe('37500');
      expect(list[2]?.senderName).toBe('Hagos Gerekidan');
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
