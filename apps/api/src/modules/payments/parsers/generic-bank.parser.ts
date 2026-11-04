import { Injectable } from '@nestjs/common';
import { PaymentProviderName } from '../../../database/entities/payment-evidence.entity';
import { PaymentParser, ParsedPaymentData } from './payment-parser.interface';

@Injectable()
export class GenericBankParser implements PaymentParser {
  readonly provider = PaymentProviderName.OTHER_BANK;

  canParse(senderHeader: string, text: string): boolean {
    // Acts as extensible catch-all parser when other parsers do not match
    const s = (senderHeader || '').toLowerCase();
    const t = (text || '').toLowerCase();
    return (
      s.includes('bank') ||
      s.includes('awash') ||
      s.includes('dashen') ||
      s.includes('abyssinia') ||
      s.includes('hibret') ||
      s.includes('zemen') ||
      s.includes('nib') ||
      s.includes('coop') ||
      t.includes('credited') ||
      t.includes('received') ||
      t.includes('transfer')
    );
  }

  parse(text: string, senderHeader = ''): ParsedPaymentData | null {
    if (!text) return null;
    const cleanText = text.replace(/[\r\n]+/g, ' ').trim();

    // 1. Amount Extraction
    let amountMinor: string | undefined;
    let amountDisplay: number | undefined;
    const amountMatch =
      cleanText.match(/(?:ETB|Birr)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i) ||
      cleanText.match(/([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:ETB|Birr)/i) ||
      cleanText.match(/(?:credited|received|deposit|transfer)\s*(?:amount of|of)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);

    if (amountMatch && amountMatch[1]) {
      const numStr = amountMatch[1].replace(/,/g, '');
      const parsedNum = parseFloat(numStr);
      if (!isNaN(parsedNum) && parsedNum > 0) {
        amountDisplay = parsedNum;
        amountMinor = Math.round(parsedNum * 100).toString();
      }
    }

    // 2. Reference Extraction
    let transactionReference: string | undefined;
    const refMatch =
      cleanText.match(/(?:Txn|Ref|Reference|ID|Code|Trace)[:\s]*([A-Z0-9_-]{6,25})/i) ||
      cleanText.match(/\b([A-Z]{2,4}[0-9]{6,16})\b/);

    if (refMatch && refMatch[1]) {
      transactionReference = refMatch[1].toUpperCase().trim();
    }

    // 3. Sender Extraction
    let senderName: string | undefined;
    let senderPhone: string | undefined;
    let senderAccount: string | undefined;

    const fromMatch = cleanText.match(/from\s+([A-Za-z0-9\s\*\-\/]+?)(?:\.|\s+Txn|\s+Ref|\s+on|$)/i);
    if (fromMatch && fromMatch[1]) {
      const raw = fromMatch[1].trim();
      if (/^\d+$/.test(raw)) {
        senderPhone = raw;
      } else if (raw.includes('*') || /^\d{10,}$/.test(raw)) {
        senderAccount = raw;
      } else {
        senderName = raw;
      }
    }

    // 4. Timestamp
    let transactionTime: Date | undefined;
    const dateMatch = cleanText.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}(?:\s+\d{1,2}:\d{2})?)/);
    if (dateMatch && dateMatch[1]) {
      const parsed = new Date(dateMatch[1]);
      if (!isNaN(parsed.getTime())) transactionTime = parsed;
    }

    let confidence = 20;
    if (amountMinor) confidence += 35;
    if (transactionReference) confidence += 25;
    if (senderPhone || senderName || senderAccount) confidence += 10;

    return {
      provider: PaymentProviderName.OTHER_BANK,
      transactionReference,
      amountMinor,
      amountDisplay,
      currency: 'ETB',
      senderPhone,
      senderName,
      senderAccount,
      transactionTime,
      confidence: Math.min(confidence, 100),
      rawSnippet: cleanText.substring(0, 200),
    };
  }
}
