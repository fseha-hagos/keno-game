import { Injectable } from '@nestjs/common';
import { PaymentProviderName } from '../../../database/entities/payment-evidence.entity';
import { PaymentParser, ParsedPaymentData } from './payment-parser.interface';

@Injectable()
export class TelebirrParser implements PaymentParser {
  readonly provider = PaymentProviderName.TELEBIRR;

  canParse(senderHeader: string, text: string): boolean {
    const s = (senderHeader || '').toLowerCase();
    const t = (text || '').toLowerCase();
    if (s.includes('telebirr') || s.includes('127')) return true;
    if (t.includes('telebirr') || t.includes('transaction number: ci') || t.includes('txn: ci')) return true;
    return false;
  }

  parse(text: string, senderHeader = ''): ParsedPaymentData | null {
    if (!text) return null;
    const cleanText = text.replace(/[\r\n]+/g, ' ').trim();

    // 1. Extract Amount
    // Matches English: "received ETB 100.00", "ETB 100.00", "100.00 Birr"
    // Matches Amharic: "100.00 ብር", "ብር 100.00", "100 ብር ገቢ ሆኗል", "ከ ... 100.00 ብር"
    let amountMinor: string | undefined;
    let amountDisplay: number | undefined;

    const amountRegexes = [
      /(?:received|credited with|transferred|amount of|deposit of|ገቢ ሆኗል|ደርሶዎታል)\s*(?:ETB|Birr|ብር)?\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:ETB|Birr|ብር)?/i,
      /(?:ETB|Birr|ብር)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:from|has been received|received|ገቢ ሆኗል)?/i,
      /([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:ETB|Birr|ብር)/i,
      /(?:ETB|Birr|ብር)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    ];

    for (const reg of amountRegexes) {
      const match = cleanText.match(reg);
      if (match && match[1]) {
        const numStr = match[1].replace(/,/g, '');
        const parsedNum = parseFloat(numStr);
        if (!isNaN(parsedNum) && parsedNum > 0) {
          amountDisplay = parsedNum;
          amountMinor = Math.round(parsedNum * 100).toString();
          break;
        }
      }
    }

    // 2. Extract Transaction Reference
    // Telebirr references: "Transaction number: ...", "የግብይት ቁጥር: ...", "የግብይት መለያ: ...", "txn: ...", "CI...", "DA...", "TB..."
    let transactionReference: string | undefined;
    const refRegexes = [
      /(?:Transaction\s*(?:number|no|id|code)|txn\s*(?:id|no|code|number)?|trans\s*id|reference|ref|የግብይት\s*ቁጥር|የግብይት\s*መለያ|መለያ\s*ቁጥር|ግብይት\s*ቁጥር)[:\s]*([A-Z0-9]{6,18})/i,
      /\b(CI[0-9A-Z]{6,14})\b/i,
      /\b(DA[0-9A-Z]{6,14})\b/i,
      /\b(TB[0-9A-Z]{6,14})\b/i,
      /\b(CW[0-9A-Z]{6,14})\b/i,
      /\b(NW[0-9A-Z]{6,14})\b/i,
    ];

    for (const reg of refRegexes) {
      const match = cleanText.match(reg);
      if (match && match[1]) {
        transactionReference = match[1].toUpperCase().trim();
        break;
      }
    }

    // 3. Extract Sender Phone & Name
    // Pattern: "from ABEBE KEBEDE (0912345678)" or "from 0912345678 (ABEBE KEBEDE)" or "from 0912345678" or "from 251912345678"
    let senderPhone: string | undefined;
    let senderName: string | undefined;

    const fromNameAndPhone = cleanText.match(/(?:from|ከ)\s+([A-Za-z\u1200-\u137F\s]+)\s*\((09\d{8}|07\d{8}|251\d{9}|\+251\d{9})\)/i);
    const fromPhoneAndName = cleanText.match(/(?:from|ከ)\s*(09\d{8}|07\d{8}|251\d{9}|\+251\d{9})\s*(?:[\/\(])\s*([A-Za-z\u1200-\u137F\s]+)\)?/i);
    const fromPhoneOnly = cleanText.match(/(?:from|ከ)\s*(09\d{8}|07\d{8}|251\d{9}|\+251\d{9})/i);
    const genericPhone = cleanText.match(/\b(09\d{8}|07\d{8}|2519\d{8}|\+2519\d{8})\b/);

    if (fromNameAndPhone && fromNameAndPhone[1] && fromNameAndPhone[2]) {
      senderName = fromNameAndPhone[1].trim();
      senderPhone = fromNameAndPhone[2].trim();
    } else if (fromPhoneAndName && fromPhoneAndName[1] && fromPhoneAndName[2]) {
      senderPhone = fromPhoneAndName[1].trim();
      senderName = fromPhoneAndName[2].trim();
    } else if (fromPhoneOnly && fromPhoneOnly[1]) {
      senderPhone = fromPhoneOnly[1].trim();
    } else if (genericPhone && genericPhone[1]) {
      senderPhone = genericPhone[1].trim();
    }

    // 4. Extract Date / Time if available
    let transactionTime: Date | undefined;
    const dateMatch = cleanText.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)?)/);
    if (dateMatch && dateMatch[1]) {
      const parsedDate = new Date(dateMatch[1]);
      if (!isNaN(parsedDate.getTime())) {
        transactionTime = parsedDate;
      }
    }

    // Calculate parsing confidence score
    let confidence = 30;
    if (amountMinor) confidence += 35;
    if (transactionReference) confidence += 25;
    if (senderPhone) confidence += 10;

    return {
      provider: PaymentProviderName.TELEBIRR,
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
