const fs = require('fs');
const file = 'd:/projects/real_pro/keno-game/apps/web/src/components/WalletModal.tsx';
let code = fs.readFileSync(file, 'utf8');

const oldMethods = `const PAYMENT_METHODS = [
  {
    id: 'telebirr',
    name: 'telebirr',
    icon: '📱',
    image: '/telebirr.jpg',
    badge: 'Auto Match',
    isInstant: true,
    accountNumber: '0948491265',
    accountName: 'Fseha Hagos',
    hint: 'e.g. CI94719082',
    instructions: [
      'Open your Telebirr app or dial *127#',
      'Select "Send Money" to 0948491265 (Fseha Hagos)',
      'Enter the EXACT deposit amount',
      'Confirm the transaction with your PIN',
      'Our automated instant verification system automatically detects your payment!',
    ],
  },
  {
    id: 'cbe_bank',
    name: 'Commercial Bank of Ethiopia',
    icon: '🏛️',
    image: '/cbe.jpg',
    badge: 'FT Code',
    isInstant: false,
    accountNumber: '1000287635657',
    accountName: 'Fseha Hagos',
    hint: 'e.g. FT262920XXXX',
    instructions: [
      'Transfer via CBE Mobile Banking or branch to Account: 1000234567891',
      'Recipient: Fseha Hagos',
      'Enter the FT transaction reference code for verification',
    ],
  },
  {
    id: 'cbe_birr',
    name: 'CBEbirr',
    icon: '🏦',
    image: '/cbe.jpg',
    badge: 'Auto Match',
    isInstant: false,
    accountNumber: '0948491265',
    accountName: 'Fseha Hagos',
    hint: 'e.g. CB987654321',
    instructions: [
      'Open CBE Birr app or dial *847#',
      'Transfer to CBE Birr mobile: 0948491265 (Fseha Hagos)',
      'Enter the EXACT amount and confirm',
      'Incoming SMS notification is detected and matched automatically',
    ],
  },
  {
    id: 'mpesa',
    name: 'M-Pesa (Safaricom)',
    icon: '📲',
    image: '/mpesa.jpg',
    badge: 'Auto Match',
    isInstant: false,
    accountNumber: '0700000000',
    accountName: 'Fseha Hagos',
    hint: 'e.g. NL47JK890',
    instructions: [
      'Open your M-Pesa app or dial *777#',
      'Select "Send Money" to 0700000000 (Fseha Hagos)',
      'Enter the EXACT deposit amount and confirm',
      'M-Pesa confirmation SMS will be captured and matched automatically',
    ],
  },
  {
    id: 'other_bank',
    name: 'Bank of Abyssinia / Other Banks',
    icon: '💳',
    image: null,
    badge: 'Awash/Dashen/BOA',
    isInstant: false,
    accountNumber: '1000-------',
    accountName: 'Fseha Hagos',
    hint: 'e.g. Bank Ref / Slip No',
    instructions: [
      'Transfer from Bank of Abyssinia, Awash, Dashen, Nib, etc.',
      'Send to CBE Account: 1000------- (Fseha Hagos)',
      'Enter your transaction reference for admin review',
    ],
  },
];`;

const newMethods = `const PAYMENT_METHODS = [
  {
    id: 'cbe_bank',
    name: 'Commercial Bank of Ethiopia (CBE)',
    icon: '🏛️',
    image: '/cbe.jpg',
    badge: 'FT Code',
    isInstant: false,
    accountNumber: '1000282131138',
    accountName: 'Abel Alemseged',
    hint: 'e.g. FT262920XXXX',
    instructions: [
      'Transfer via CBE Mobile Banking or branch to Account: 1000282131138',
      'Recipient Account Name: Abel Alemseged',
      'Enter the FT transaction reference code for verification',
    ],
  },
  {
    id: 'telebirr',
    name: 'telebirr',
    icon: '📱',
    image: '/telebirr.jpg',
    badge: 'Auto Match',
    isInstant: true,
    accountNumber: '0930547684',
    accountName: 'Abel Alemseged',
    hint: 'e.g. CI94719082',
    instructions: [
      'Open your Telebirr app or dial *127#',
      'Select "Send Money" to 0930547684 (Abel Alemseged)',
      'Enter the EXACT deposit amount',
      'Confirm the transaction with your PIN',
      'Our automated instant verification system automatically detects your payment!',
    ],
  },
  {
    id: 'cbe_birr',
    name: 'CBEbirr',
    icon: '🏦',
    image: '/cbe.jpg',
    badge: 'Auto Match',
    isInstant: false,
    accountNumber: '0930547684',
    accountName: 'Abel Alemseged',
    hint: 'e.g. CB987654321',
    instructions: [
      'Open CBE Birr app or dial *847#',
      'Transfer to CBE Birr mobile: 0930547684 (Abel Alemseged)',
      'Enter the EXACT amount and confirm',
      'Incoming SMS notification is detected and matched automatically',
    ],
  },
  {
    id: 'mpesa',
    name: 'M-Pesa (Safaricom)',
    icon: '📲',
    image: '/mpesa.jpg',
    badge: 'Coming Soon',
    isInstant: false,
    accountNumber: 'Safaricom M-Pesa',
    accountName: 'Abel Alemseged',
    hint: 'Coming soon',
    instructions: [
      'Safaricom M-Pesa integration is currently in progress.',
      'We will integrate this service soon! Please use Telebirr or CBE in the meantime.',
    ],
  },
  {
    id: 'other_bank',
    name: 'Bank of Abyssinia / Other Banks',
    icon: '💳',
    image: null,
    badge: 'Awash/Dashen/BOA',
    isInstant: false,
    accountNumber: '1000282131138',
    accountName: 'Abel Alemseged',
    hint: 'e.g. Bank Ref / Slip No',
    instructions: [
      'Transfer from Bank of Abyssinia, Awash, Dashen, Nib, etc.',
      'Send to CBE Account: 1000282131138 (Abel Alemseged)',
      'Enter your transaction reference for admin review',
    ],
  },
];`;

const crlfOld = oldMethods.replace(/\n/g, '\r\n');
const crlfNew = newMethods.replace(/\n/g, '\r\n');

code = code.replace(crlfOld, crlfNew);

// Click handler on deposit payment method: if mpesa, show info toast
const oldClick = 'onClick={() => setSelectedMethod(method.id)}';
const newClick = `onClick={() => {
                          if (method.id === 'mpesa') {
                            toastInfo('M-Pesa (Safaricom)', 'We will integrate Safaricom M-Pesa soon! Please use Telebirr or CBE for now.');
                            return;
                          }
                          setSelectedMethod(method.id);
                        }}`;

code = code.replace(oldClick, newClick);

// Withdraw click handler: if mpesa, notify soon
const oldWithdrawClick = `onClick={() => {
                          setWithdrawMethod(method.id);
                          if (method.id === 'telebirr') {
                            if (!isManualAccount) setWithdrawAccount(user?.phone || '');
                            if (!isManualName) setWithdrawName(user?.username || '');
                          }
                        }}`;

const newWithdrawClick = `onClick={() => {
                          if (method.id === 'mpesa') {
                            toastInfo('M-Pesa (Safaricom)', 'We will integrate Safaricom M-Pesa soon! Please use Telebirr or CBE for now.');
                            return;
                          }
                          setWithdrawMethod(method.id);
                          if (method.id === 'telebirr') {
                            if (!isManualAccount) setWithdrawAccount(user?.phone || '');
                            if (!isManualName) setWithdrawName(user?.username || '');
                          }
                        }}`;

code = code.replace(oldWithdrawClick.replace(/\n/g, '\r\n'), newWithdrawClick.replace(/\n/g, '\r\n'));

fs.writeFileSync(file, code, 'utf8');
console.log('CREDENTIALS_UPDATED_OK:', code.includes('1000282131138') && code.includes('0930547684') && code.includes('Abel Alemseged'));

