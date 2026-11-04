import { PaymentProviderName } from '../../../database/entities/payment-evidence.entity';

export interface ParsedPaymentData {
  provider: PaymentProviderName;
  transactionReference?: string;
  amountMinor?: string; // integer minor units as string (e.g. "10000" for 100.00 ETB)
  amountDisplay?: number;
  currency: string;
  senderPhone?: string;
  senderName?: string;
  senderAccount?: string;
  receiverName?: string;
  balanceDisplay?: number;
  transactionTime?: Date;
  confidence: number; // 0 to 100 based on extraction completeness
  rawSnippet?: string;
}

export interface PaymentParser {
  readonly provider: PaymentProviderName;
  canParse(senderHeader: string, text: string): boolean;
  parse(text: string, senderHeader?: string): ParsedPaymentData | null;
  parseMultiple?(text: string, senderHeader?: string): ParsedPaymentData[];
}
