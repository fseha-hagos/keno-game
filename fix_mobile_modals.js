const fs = require('fs');

// 1. Update ProfileModal.tsx
const profileFile = 'd:/projects/real_pro/keno-game/apps/web/src/components/ProfileModal.tsx';
let pCode = fs.readFileSync(profileFile, 'utf8');

pCode = pCode.replace(
  'maxWidth: 420,\r\n          padding: \'24px 22px\',',
  'maxWidth: 420,\r\n          maxHeight: \'90vh\',\r\n          overflowY: \'auto\',\r\n          WebkitOverflowScrolling: \'touch\',\r\n          padding: \'24px 22px\','
);
fs.writeFileSync(profileFile, pCode, 'utf8');

// 2. Update ResponsibleGamblingModal.tsx
const rgFile = 'd:/projects/real_pro/keno-game/apps/web/src/components/ResponsibleGamblingModal.tsx';
let rgCode = fs.readFileSync(rgFile, 'utf8');

rgCode = rgCode.replace(
  'zIndex: 1000,',
  'zIndex: 1100,'
);

rgCode = rgCode.replace(
  'maxWidth: 440,\r\n          padding: \'24px 22px\',',
  'maxWidth: 440,\r\n          maxHeight: \'90vh\',\r\n          overflowY: \'auto\',\r\n          WebkitOverflowScrolling: \'touch\',\r\n          padding: \'24px 22px\','
);

// Replace confirm() with direct mutation or custom confirmation
rgCode = rgCode.replace(
  `onClick={() => {\r\n                  if (confirm(\`Are you sure you want to self-exclude for \${days} days?\`)) {\r\n                    selfExcludeMutation.mutate(days);\r\n                  }\r\n                }}`,
  `onClick={() => {\r\n                  selfExcludeMutation.mutate(days);\r\n                }}`
);

// Invalidate useAuthStore / auth on self-exclusion success so profile reflects immediately
rgCode = rgCode.replace(
  `toastSuccess(\r\n        'Self-Exclusion Active',\r\n        'Your account has been temporarily self-excluded. Bets are paused.',\r\n      );\r\n      onClose();`,
  `toastSuccess(\r\n        'Self-Exclusion Active',\r\n        'Your account has been temporarily self-excluded. Bets are paused.',\r\n      );\r\n      // Refresh auth profile state immediately\r\n      useAuthStore.getState().checkAuth?.();\r\n      onClose();`
);

if (!rgCode.includes('useAuthStore')) {
  rgCode = rgCode.replace(
    `import React, { useState } from 'react';`,
    `import React, { useState } from 'react';\r\nimport { useAuthStore } from '../store/useAuthStore';`
  );
}

fs.writeFileSync(rgFile, rgCode, 'utf8');

console.log('PROFILE_SCROLL_OK:', pCode.includes('maxHeight: \'90vh\''));
console.log('RG_ZINDEX_OK:', rgCode.includes('zIndex: 1100'));
console.log('RG_CONFIRM_REMOVED:', !rgCode.includes('if (confirm('));

