import { Injectable } from '@nestjs/common';
import { PaymentProviderName } from '../../../database/entities/payment-evidence.entity';
import { PaymentParser, ParsedPaymentData } from './payment-parser.interface';

@Injectable()
export class CbeBankParser implements PaymentParser {
  readonly provider = PaymentProviderName.CBE_BANK;

  canParse(senderHeader: string, text: string): boolean {
    const s = (senderHeader || '').toLowerCase();
    const t = (text || '').toLowerCase();
    if (s === 'cbe' || s.includes('commercial bank') || s.includes('cbe mobile')) return true;
    if (t.includes('commercial bank of ethiopia') || (t.includes('cbe') && t.includes('credited with')) || t.includes('txn ref: ft')) return true;
    return false;
  }

  parse(text: string, senderHeader = ''): ParsedPaymentData | null {
    if (!text) return null;
    const cleanText = text.replace(/[\r\n]+/g, ' ').trim();

    // 1. Extract Amount
    let amountMinor: string | undefined;
    let amountDisplay: number | undefined;
    const amountMatch =
      cleanText.match(/credited with\s*(?:ETB|Birr)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i) ||
      cleanText.match(/(?:ETB|Birr)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:has been credited|credited)/i) ||
      cleanText.match(/(?:ETB|Birr)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);

    if (amountMatch && amountMatch[1]) {
      const numStr = amountMatch[1].replace(/,/g, '');
      const parsedNum = parseFloat(numStr);
      if (!isNaN(parsedNum) && parsedNum > 0) {
        amountDisplay = parsedNum;
        amountMinor = Math.round(parsedNum * 100).toString();
      }
    }

    // 2. Extract Transaction Reference (often starts with FT..., e.g. FT262920XXXX or Txn Ref: ...)
    let transactionReference: string | undefined;
    const refMatch =
      cleanText.match(/(?:Txn\s*Ref|Ref|Transaction\s*Ref|Reference)[:\s]*([A-Z0-9]{6,20})/i) ||
      cleanText.match(/\b(FT[0-9A-Z]{8,16})\b/i);

    if (refMatch && refMatch[1]) {
      transactionReference = refMatch[1].toUpperCase().trim();
    }

    // 3. Extract Sender Info (account & name)
    // E.g. "from 1000*****1234 / SISAY BEKELE" or "from KEBEDE ABEBE"
    let senderAccount: string | undefined;
    let senderName: string | undefined;

    const fromAccountAndName = cleanText.match(/from\s*([0-9\*]+)\s*[\/|\-]\s*([A-Za-z\s]+?)(?:\.|\s+Txn|\s+on|$)/i);
    const fromNameOnly = cleanText.match(/from\s*([A-Za-z\s]+?)(?:\.|\s+Txn|\s+on|$)/i);

    if (fromAccountAndName && fromAccountAndName[1] && fromAccountAndName[2]) {
      senderAccount = fromAccountAndName[1].trim();
      senderName = fromAccountAndName[2].trim();
    } else if (fromNameOnly && fromNameOnly[1] && !fromNameOnly[1].toLowerCase().includes('account')) {
      senderName = fromNameOnly[1].trim();
    }

    // 4. Extract Timestamp
    let transactionTime: Date | undefined;
    const dateMatch = cleanText.match(/on\s+(\d{1,2}-[A-Za-z]{3}-\d{4}(?:\s+\d{1,2}:\d{2})?|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}(?:\s+\d{1,2}:\d{2})?)/i);
    if (dateMatch && dateMatch[1]) {
      const parsed = new Date(dateMatch[1]);
      if (!isNaN(parsed.getTime())) transactionTime = parsed;
    }

    let confidence = 30;
    if (amountMinor) confidence += 35;
    if (transactionReference) confidence += 25;
    if (senderAccount || senderName) confidence += 10;

    return {
      provider: PaymentProviderName.CBE_BANK,
      transactionReference,
      amountMinor,
      amountDisplay,
      currency: 'ETB',
      senderAccount,
      senderName,
      transactionTime,
      confidence: Math.min(confidence, 100),
      rawSnippet: cleanText.substring(0, 200),
    };
  }
}
