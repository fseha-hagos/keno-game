import { Injectable } from '@nestjs/common';
import { PaymentProviderName } from '../../../database/entities/payment-evidence.entity';
import { PaymentParser, ParsedPaymentData } from './payment-parser.interface';

@Injectable()
export class MpesaParser implements PaymentParser {
  readonly provider = PaymentProviderName.MPESA;

  canParse(senderHeader: string, text: string): boolean {
    const s = (senderHeader || '').toLowerCase();
    const t = (text || '').toLowerCase();
    if (s.includes('mpesa') || s.includes('m-pesa') || s.includes('safaricom')) return true;
    if (t.includes('m-pesa') || t.includes('mpesa') || t.includes('confirmed. you have received etb')) return true;
    return false;
  }

  parse(text: string, senderHeader = ''): ParsedPaymentData | null {
    if (!text) return null;
    const cleanText = text.replace(/[\r\n]+/g, ' ').trim();

    // 1. Extract Transaction Reference (M-Pesa reference starts at the beginning or before Confirmed)
    // E.g. "NL47JK890 Confirmed." or "Transaction ID NL47JK890"
    let transactionReference: string | undefined;
    const refMatch =
      cleanText.match(/^([A-Z0-9]{8,12})\s+Confirmed/i) ||
      cleanText.match(/\b([A-Z0-9]{8,12})\s+Confirmed/i) ||
      cleanText.match(/(?:txn|ref|code)[:\s]*([A-Z0-9]{8,12})/i);

    if (refMatch && refMatch[1]) {
      transactionReference = refMatch[1].toUpperCase().trim();
    }

    // 2. Extract Amount
    let amountMinor: string | undefined;
    let amountDisplay: number | undefined;
    const amountMatch =
      cleanText.match(/received\s*(?:ETB|Birr)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i) ||
      cleanText.match(/(?:ETB|Birr)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);

    if (amountMatch && amountMatch[1]) {
      const numStr = amountMatch[1].replace(/,/g, '');
      const parsedNum = parseFloat(numStr);
      if (!isNaN(parsedNum) && parsedNum > 0) {
        amountDisplay = parsedNum;
        amountMinor = Math.round(parsedNum * 100).toString();
      }
    }

    // 3. Extract Sender Phone & Name
    // Pattern: "from 251712345678 - HAILU TESFAYE on" or "from 0712345678 - HAILU TESFAYE"
    let senderPhone: string | undefined;
    let senderName: string | undefined;

    const fromMatch = cleanText.match(/from\s*([0-9\+]{9,15})\s*[-–]\s*([A-Za-z\s]+?)(?:\s+on|\s+at|\.|$)/i);
    if (fromMatch && fromMatch[1] && fromMatch[2]) {
      senderPhone = fromMatch[1].trim();
      senderName = fromMatch[2].trim();
    } else {
      const phoneOnly = cleanText.match(/\b(07\d{8}|09\d{8}|2517\d{8}|2519\d{8})\b/);
      if (phoneOnly && phoneOnly[1]) senderPhone = phoneOnly[1].trim();
    }

    // 4. Extract Timestamp
    let transactionTime: Date | undefined;
    const dateMatch = cleanText.match(/on\s+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})(?:\s+at\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?))?/i);
    if (dateMatch && dateMatch[1]) {
      const dateStr = dateMatch[2] ? `${dateMatch[1]} ${dateMatch[2]}` : dateMatch[1];
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) transactionTime = parsed;
    }

    let confidence = 30;
    if (amountMinor) confidence += 35;
    if (transactionReference) confidence += 25;
    if (senderPhone) confidence += 10;

    return {
      provider: PaymentProviderName.MPESA,
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
