import { PaymentProviderName } from '../../../database/entities/payment-evidence.entity';

export interface ProviderPaymentInfo {
  id: string;
  name: string;
  provider: PaymentProviderName;
  icon: string;
  accountNumber: string;
  accountName: string;
  currency: string;
  instructions: string[];
  referenceFormatHint: string;
  isAutomated: boolean;
  minDepositMinor: string; // "1000" = 10 ETB
  maxDepositMinor: string; // "10000000" = 100,000 ETB
}

export const CONFIGURED_PAYMENT_PROVIDERS: ProviderPaymentInfo[] = [
  {
    id: 'telebirr',
    name: 'Telebirr',
    provider: PaymentProviderName.TELEBIRR,
    icon: '📱',
    accountNumber: '0948491265',
    accountName: 'Fseha Hagos',
    currency: 'ETB',
    instructions: [
      'Open your Telebirr App or dial *127#',
      'Select "Send Money" / "Transfer"',
      'Enter phone number: 0948491265 (Fseha Hagos)',
      'Enter the EXACT deposit amount',
      'Confirm the transaction with your Telebirr PIN',
      'Copy the Transaction Number (starts with CI...) or wait for automated SMS match',
    ],
    referenceFormatHint: 'CI94719082 or 8-12 digits',
    isAutomated: true,
    minDepositMinor: '1000',
    maxDepositMinor: '5000000',
  },
  {
    id: 'mpesa',
    name: 'M-Pesa (Safaricom)',
    provider: PaymentProviderName.MPESA,
    icon: '📲',
    accountNumber: '0700000000',
    accountName: 'Amdom desta',
    currency: 'ETB',
    instructions: [
      'Open your M-Pesa App or dial *777#',
      'Select "Send Money"',
      'Enter recipient phone: 0700000000 (Amdom desta)',
      'Enter the EXACT deposit amount and confirm with PIN',
      'You will receive an M-Pesa SMS with a Confirmation Code (e.g. NL47JK890)',
      'Enter the code or wait for automated match',
    ],
    referenceFormatHint: 'NL47JK890 (10 alphanumeric chars)',
    isAutomated: true,
    minDepositMinor: '1000',
    maxDepositMinor: '5000000',
  },
  {
    id: 'cbe_birr',
    name: 'CBE Birr',
    provider: PaymentProviderName.CBE_BIRR,
    icon: '🏦',
    accountNumber: '0978614151',
    accountName: 'Amdom desta',
    currency: 'ETB',
    instructions: [
      'Open CBE Birr app or dial *847#',
      'Choose "Transfer Money" -> "To CBE Birr"',
      'Enter phone number: 0978614151 (Amdom desta)',
      'Enter the exact deposit amount and confirm with PIN',
      'Save the Txn ID (e.g. CB987654321) from the confirmation SMS',
    ],
    referenceFormatHint: 'CB987654321',
    isAutomated: true,
    minDepositMinor: '1000',
    maxDepositMinor: '10000000',
  },
  {
    id: 'cbe_bank',
    name: 'Commercial Bank of Ethiopia (CBE)',
    provider: PaymentProviderName.CBE_BANK,
    icon: '🏛️',
    accountNumber: '1000234567891',
    accountName: 'Amdom desta',
    currency: 'ETB',
    instructions: [
      'Open CBE Mobile Banking (CBE Birr / CBE Mobile app) or visit any CBE branch',
      'Transfer funds to CBE Account: 1000234567891 (Amdom desta)',
      'Input the EXACT amount',
      'Copy the Transaction Reference number (starts with FT...)',
      'Submit the FT reference code to instantly match your deposit',
    ],
    referenceFormatHint: 'FT262920XXXX or 10-16 alphanumeric chars',
    isAutomated: true,
    minDepositMinor: '5000',
    maxDepositMinor: '10000000',
  },
  {
    id: 'other_bank',
    name: 'Other Bank Transfer',
    provider: PaymentProviderName.OTHER_BANK,
    icon: '💳',
    accountNumber: '1000234567891',
    accountName: 'Amdom desta (CBE)',
    currency: 'ETB',
    instructions: [
      'Transfer from Awash, Dashen, Bank of Abyssinia, Nib, or any Ethiopian bank',
      'Send to CBE Account: 1000234567891 (Amdom desta)',
      'Enter your transaction reference / slip number for automated verification',
    ],
    referenceFormatHint: 'Bank reference / slip number',
    isAutomated: true,
    minDepositMinor: '5000',
    maxDepositMinor: '10000000',
  },
];

export function getProviderInfo(idOrMethod: string): ProviderPaymentInfo | undefined {
  const norm = (idOrMethod || '').toLowerCase().replace(/[\s-_]/g, '');
  return CONFIGURED_PAYMENT_PROVIDERS.find((p) => {
    const pNorm = p.id.toLowerCase().replace(/[\s-_]/g, '');
    const pNameNorm = p.name.toLowerCase().replace(/[\s-_]/g, '');
    return pNorm === norm || pNameNorm.includes(norm) || norm.includes(pNorm);
  });
}

export function mapMethodToProviderName(method: string): PaymentProviderName {
  const m = (method || '').toLowerCase();
  if (m.includes('telebirr')) return PaymentProviderName.TELEBIRR;
  if (m.includes('mpesa') || m.includes('m-pesa')) return PaymentProviderName.MPESA;
  if (m.includes('cbe_birr') || m.includes('cbebirr')) return PaymentProviderName.CBE_BIRR;
  if (m.includes('cbe') || m.includes('commercial')) return PaymentProviderName.CBE_BANK;
  return PaymentProviderName.OTHER_BANK;
}
