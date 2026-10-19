import { Injectable } from '@nestjs/common';
import { PaymentProviderName } from '../../../database/entities/payment-evidence.entity';
import { PaymentParser, ParsedPaymentData } from './payment-parser.interface';

@Injectable()
export class TelebirrParser implements PaymentParser {
  readonly provider = PaymentProviderName.TELEBIRR;

  canParse(senderHeader: string, text: string): boolean {
    const s = (senderHeader || '').toLowerCase();
    const t = (text || '').toLowerCase();
    if (s.includes('telebirr') || s.includes('127') || s.includes('ethio telecom')) return true;
    if (
      t.includes('telebirr') ||
      t.includes('ethio telecom') ||
      t.includes('e-money') ||
      t.includes('transaction number is') ||
      t.includes('your transaction number') ||
      t.includes('transaction number: ci') ||
      t.includes('txn: ci') ||
      t.includes('የግብይት ቁጥር')
    ) {
      return true;
    }
    return false;
  }

  /**
   * Parses a single Telebirr SMS notification text.
   */
  parse(text: string, senderHeader = ''): ParsedPaymentData | null {
    if (!text) return null;
    const cleanText = text.replace(/[\r\n]+/g, ' ').trim();

    // 1. Extract Amount
    // Matches English: "received ETB 200.00", "ETB 200.00", "200.00 Birr"
    // Matches Amharic: "100.00 ብር", "ብር 100.00", "100 ብር ገቢ ሆኗል", "ከ ... 100.00 ብር"
    let amountMinor: string | undefined;
    let amountDisplay: number | undefined;

    const amountRegexes = [
      /(?:received|credited with|transferred|amount of|deposit of|ገቢ ሆኗል|ደርሶዎታል)\s*(?:ETB|Birr|ብር)?\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:ETB|Birr|ብር)?/i,
      /(?:ETB|Birr|ብር)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:from|has been received|received|ገቢ ሆኗል)?/i,
      /([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:ETB|Birr|ብር)\s+(?:from|ከ)/i,
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
    // Telebirr references:
    // - "Your transaction number is DJJ52J9YGF."
    // - "Transaction number: CI94719082."
    // - "Transaction CI12345678:"
    // - "የግብይት ቁጥር DJJ52J9YGF"
    // - Prefixes: DJ..., CI..., DA..., TB..., CW..., NW...
    let transactionReference: string | undefined;
    const refRegexes = [
      /(?:Your\s+)?(?:transaction\s*(?:number|no|id|code)|txn\s*(?:id|no|code|number)?|trans\s*id|reference|ref|የግብይት\s*ቁጥር|የግብይት\s*መለያ|መለያ\s*ቁጥር|ግብይት\s*ቁጥር)(?:\s+is|\s*[:=-]|\s+)\s*([A-Z0-9]{6,20})/i,
      /\b(DJ[0-9A-Z]{6,16})\b/i,
      /\b(CI[0-9A-Z]{6,16})\b/i,
      /\b(DA[0-9A-Z]{6,16})\b/i,
      /\b(TB[0-9A-Z]{6,16})\b/i,
      /\b(CW[0-9A-Z]{6,16})\b/i,
      /\b(NW[0-9A-Z]{6,16})\b/i,
    ];

    for (const reg of refRegexes) {
      const match = cleanText.match(reg);
      if (match && match[1]) {
        transactionReference = match[1].toUpperCase().trim();
        break;
      }
    }

    // 3. Extract Sender Phone & Name
    // Pattern: "from Samrawit Hagos(2519****5316)" or "from ABEBE KEBEDE (0912345678)"
    // Phone numbers can be masked (e.g. 2519****5316, 09****5316) or unmasked
    let senderPhone: string | undefined;
    let senderName: string | undefined;

    const phonePattern = `(?:\\+?251[0-9*xX]{9}|0[79][0-9*xX]{8}|2519[0-9*xX]{8})`;

    const fromNameAndPhone = cleanText.match(
      new RegExp(`(?:from|ከ)\\s+([A-Za-z\\u1200-\\u137F\\s'.-]+?)\\s*\\(\\s*(${phonePattern})\\s*\\)`, 'i'),
    );
    const fromPhoneAndName = cleanText.match(
      new RegExp(`(?:from|ከ)\\s*(${phonePattern})\\s*(?:[\\/\\(])\\s*([A-Za-z\\u1200-\\u137F\\s'.-]+?)\\)?`, 'i'),
    );
    const fromNameDashPhone = cleanText.match(
      new RegExp(`(?:from|ከ)\\s+([A-Za-z\\u1200-\\u137F\\s'.-]+?)\\s*[-–]\\s*(${phonePattern})`, 'i'),
    );
    const fromPhoneOnly = cleanText.match(
      new RegExp(`(?:from|ከ)\\s*(${phonePattern})`, 'i'),
    );
    const genericPhone = cleanText.match(
      new RegExp(`\\b(${phonePattern})\\b`, 'i'),
    );

    if (fromNameAndPhone && fromNameAndPhone[1] && fromNameAndPhone[2]) {
      senderName = fromNameAndPhone[1].trim();
      senderPhone = fromNameAndPhone[2].trim();
    } else if (fromPhoneAndName && fromPhoneAndName[1] && fromPhoneAndName[2]) {
      senderPhone = fromPhoneAndName[1].trim();
      senderName = fromPhoneAndName[2].trim();
    } else if (fromNameDashPhone && fromNameDashPhone[1] && fromNameDashPhone[2]) {
      senderName = fromNameDashPhone[1].trim();
      senderPhone = fromNameDashPhone[2].trim();
    } else if (fromPhoneOnly && fromPhoneOnly[1]) {
      senderPhone = fromPhoneOnly[1].trim();
    } else if (genericPhone && genericPhone[1]) {
      senderPhone = genericPhone[1].trim();
    }

    // 4. Extract Receiver Name ("Dear Hagos", "Dear Fseha")
    let receiverName: string | undefined;
    const receiverMatch = cleanText.match(/(?:Dear|ክቡር|ክቡርት)\s+([A-Za-z\u1200-\u137F]+)/i);
    if (receiverMatch && receiverMatch[1]) {
      receiverName = receiverMatch[1].trim();
    }

    // 5. Extract Balance
    // "Your current E-Money Account balance is ETB 206.82.", "Your new balance is ETB 1,250.00."
    let balanceDisplay: number | undefined;
    const balanceMatch = cleanText.match(
      /(?:(?:account\s+)?balance|e-money\s+account\s+balance|ቀሪ\s*ሂሳብ(?:ዎ)?)\s*(?:is|:)?\s*(?:ETB|Birr|ብር)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    );
    if (balanceMatch && balanceMatch[1]) {
      const balNum = parseFloat(balanceMatch[1].replace(/,/g, ''));
      if (!isNaN(balNum)) {
        balanceDisplay = balNum;
      }
    }

    // 6. Extract Date / Time
    // Format: "on 19/10/2026 19:09:17", "19/10/2026 14:30:15", "2026-10-19 16:12:00"
    let transactionTime: Date | undefined;
    const dmyMatch = cleanText.match(
      /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})(?:\s+(?:at\s+)?(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([AaPp][Mm]))?)?/,
    );
    if (dmyMatch && dmyMatch[1] && dmyMatch[2] && dmyMatch[3]) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1; // 0-indexed month
      const year = parseInt(dmyMatch[3], 10);
      let hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
      const min = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
      const sec = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
      const ampm = dmyMatch[7]?.toUpperCase();
      if (ampm === 'PM' && hour < 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;

      const parsed = new Date(year, month, day, hour, min, sec);
      if (!isNaN(parsed.getTime())) {
        transactionTime = parsed;
      }
    } else {
      const genericDate = cleanText.match(/(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)/);
      if (genericDate && genericDate[1]) {
        const parsed = new Date(genericDate[1]);
        if (!isNaN(parsed.getTime())) {
          transactionTime = parsed;
        }
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
      receiverName,
      balanceDisplay,
      transactionTime,
      confidence: Math.min(confidence, 100),
      rawSnippet: cleanText.substring(0, 200),
    };
  }

  /**
   * Parses multiple concatenated or batched Telebirr notifications.
   */
  parseMultiple(text: string, senderHeader = ''): ParsedPaymentData[] {
    if (!text) return [];

    // Split concatenated messages (e.g. joined with ", Dear", "Ethio telecom, Dear", etc.)
    const chunks = text
      .split(/(?:Ethio telecom[,\s]+(?=Dear|You have received)|,(?=\s*Dear\s+[A-Za-z\u1200-\u137F]+)|(?=(?:Dear|ክቡር|ክቡርት)\s+[A-Za-z\u1200-\u137F]+\s+(?:You have received|ETB|ገቢ)))/i)
      .map((c) => c.trim())
      .filter((c) => c.length > 20);

    if (chunks.length <= 1) {
      const single = this.parse(text, senderHeader);
      return single ? [single] : [];
    }

    const results: ParsedPaymentData[] = [];
    for (const chunk of chunks) {
      const parsed = this.parse(chunk, senderHeader);
      if (parsed && (parsed.transactionReference || parsed.amountMinor)) {
        results.push(parsed);
      }
    }

    return results;
  }
}
