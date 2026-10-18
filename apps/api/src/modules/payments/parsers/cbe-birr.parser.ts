import { Injectable } from '@nestjs/common';
import { PaymentProviderName } from '../../../database/entities/payment-evidence.entity';
import { PaymentParser, ParsedPaymentData } from './payment-parser.interface';

@Injectable()
export class CbeBirrParser implements PaymentParser {
  readonly provider = PaymentProviderName.CBE_BIRR;

  canParse(senderHeader: string, text: string): boolean {
    const s = (senderHeader || '').toLowerCase();
    const t = (text || '').toLowerCase();
    if (s.includes('cbebirr') || s.includes('cbe birr') || s.includes('847')) return true;
    if (t.includes('cbe birr') || t.includes('cbebirr') || t.includes('cbe-birr')) return true;
    return false;
  }

  parse(text: string, senderHeader = ''): ParsedPaymentData | null {
    if (!text) return null;
    const cleanText = text.replace(/[\r\n]+/g, ' ').trim();

    // 1. Extract Amount
    let amountMinor: string | undefined;
    let amountDisplay: number | undefined;
    const amountMatch =
      cleanText.match(/(?:ETB|Birr)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:has been transferred|received|deposited)/i) ||
      cleanText.match(/(?:transferred|received|deposited)\s*(?:ETB|Birr)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i) ||
      cleanText.match(/(?:ETB|Birr)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);

    if (amountMatch && amountMatch[1]) {
      const numStr = amountMatch[1].replace(/,/g, '');
      const parsedNum = parseFloat(numStr);
      if (!isNaN(parsedNum) && parsedNum > 0) {
        amountDisplay = parsedNum;
        amountMinor = Math.round(parsedNum * 100).toString();
      }
    }

    // 2. Extract Transaction Reference (often Txn ID: CB..., or Ref: ...)
    let transactionReference: string | undefined;
    const refMatch =
      cleanText.match(/(?:Txn\s*ID|Txn\s*No|Transaction\s*ID|Ref|Reference)[:\s]*([A-Z0-9]{6,16})/i) ||
      cleanText.match(/\b(CB[0-9A-Z]{6,12})\b/i);

    if (refMatch && refMatch[1]) {
      transactionReference = refMatch[1].toUpperCase().trim();
    }

    // 3. Extract Sender Info
    // E.g. "from 0922334455 KEBEDE SISAY" or "from 0922334455 (KEBEDE SISAY)"
    let senderPhone: string | undefined;
    let senderName: string | undefined;

    const fromMatch = cleanText.match(/from\s*(09\d{8}|07\d{8}|251\d{9}|\+251\d{9})\s*(?:\(([^)]+)\)|([A-Za-z\s]+?)(?=\.|\s+Txn|\s+on|$))/i);
    if (fromMatch && fromMatch[1]) {
      senderPhone = fromMatch[1].trim();
      const rawName = fromMatch[2] || fromMatch[3];
      if (rawName) senderName = rawName.trim();
    } else {
      const phoneOnly = cleanText.match(/\b(09\d{8}|07\d{8}|2519\d{8}|\+2519\d{8})\b/);
      if (phoneOnly && phoneOnly[1]) senderPhone = phoneOnly[1].trim();
    }

    // 4. Extract Timestamp
    let transactionTime: Date | undefined;
    const dateMatch = cleanText.match(/on\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)/i);
    if (dateMatch && dateMatch[1]) {
      const parsed = new Date(dateMatch[1]);
      if (!isNaN(parsed.getTime())) transactionTime = parsed;
    }

    let confidence = 30;
    if (amountMinor) confidence += 35;
    if (transactionReference) confidence += 25;
    if (senderPhone) confidence += 10;

    return {
      provider: PaymentProviderName.CBE_BIRR,
      transactionReference,
      amountMinor,
      amountDisplay,
      currency: 'ETB',
      senderPhone,
      senderName,
      transactionTime,
      confidence: Math.min(confidence, 100),
      rawSnippet: cleanText.substring(0, 200),
    };
  }
}
