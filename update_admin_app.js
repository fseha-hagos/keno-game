const fs = require('fs');
const file = 'd:/projects/real_pro/keno-game/apps/admin/src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add handleToggleSelfExclusion handler
const freezeHandler = `  // Toggle Player Freeze / Unfreeze\r\n  const handleToggleFreeze = async (userId: string, currentStatus: string) => {`;

const exclusionHandler = `  // Toggle Player Self-Exclusion (Stop or Apply)
  const handleToggleSelfExclusion = async (userId: string, isExcluded: boolean) => {
    const action = isExcluded ? 'STOP' : 'EXCLUDE';
    const confirmMsg = isExcluded
      ? 'STOP self-exclusion for this player? Their account will become ACTIVE immediately.'
      : 'EXCLUDE this player for 7 days? They will be unable to place bets.';

    if (!window.confirm(confirmMsg)) return;

    try {
      await axios.post(
        \`\${API_URL}/api/v1/admin/players/\${userId}/toggle-exclusion\`,
        { action, durationDays: 7, reason: isExcluded ? 'Self-exclusion lifted by admin' : 'Exclusion initiated by admin' },
        { headers: authHeaders }
      );
      // Refresh current player list
      if (activeTab === 'players') {
        const res = await axios.get(\`\${API_URL}/api/v1/admin/players\`, { headers: authHeaders });
        setPlayerList(res.data);
      }
      alert(isExcluded ? 'Self-exclusion stopped! Account is now ACTIVE.' : 'Self-exclusion applied for 7 days.');
    } catch (err: any) {
      alert(\`Failed to update exclusion: \${err.response?.data?.message || err.message}\`);
    }
  };\r\n\r\n  // Toggle Player Freeze / Unfreeze\r\n  const handleToggleFreeze = async (userId: string, currentStatus: string) => {`;

code = code.replace(freezeHandler, exclusionHandler);

// 2. Add Status option to filter: SELF_EXCLUDED
code = code.replace(
  '<option value="SUSPENDED">Suspended Only</option>',
  '<option value="SUSPENDED">Suspended Only</option>\r\n                  <option value="SELF_EXCLUDED">Self-Excluded Only</option>'
);

// 3. Update table columns and action buttons
const oldTableCol = `< th style = {{ padding: '14px 16px' }
}> ACCOUNT STATUS</th > `;
const newTableCol = `< th style = {{ padding: '14px 16px' }}> ACCOUNT STATUS</th >\r\n < th style = {{ padding: '14px 16px' }}> SELF - EXCLUSION</th > `;

code = code.replace(oldTableCol, newTableCol);

const oldRowActions = `< td style = {{ padding: '14px 16px' }}>\r\n < StatusBadge status = { p.status } />\r\n                        </td >\r\n < td style = {{ padding: '14px 16px', color: '#64748B', fontSize: '12px' }}> { formatDate(p.createdAt) }</td >\r\n < td style = {{ padding: '14px 16px', textAlign: 'right' }}>\r\n < button\r\n                            onClick = {() => handleToggleFreeze(p.id, p.status)}\r\n                            style = {{ \r\n                              backgroundColor: isFrozen ? '#064E3B' : '#7F1D1D', \r\n                              color: isFrozen ? '#34D399' : '#FCA5A5', \r\n                              border: 'none', padding: '6px 12px', borderRadius: '6px', \r\n                              fontSize: '11px', fontWeight: 800, cursor: 'pointer', \r\n }}\r\n >\r\n                            { isFrozen ? '✅ UNFREEZE USER' : '❄️ FREEZE ACCOUNT' } \r\n                          </button >\r\n                        </td > `;

const newRowActions = `< td style = {{ padding: '14px 16px' }}>\r\n < StatusBadge status = { p.status } />\r\n                        </td >\r\n < td style = {{ padding: '14px 16px' }}>\r\n                          { p.selfExcludedUntil && new Date(p.selfExcludedUntil) > new Date() ? (\r\n < span style = {{ \r\n                              backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#F87171', \r\n                              padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, \r\n } }>\r\n                              Until { new Date(p.selfExcludedUntil).toLocaleDateString() } \r\n                            </span >\r\n                          ) : (\r\n < span style = {{ color: '#64748B', fontSize: '12px' }}> None</span >\r\n                          )}\r\n                        </td >\r\n < td style = {{ padding: '14px 16px', color: '#64748B', fontSize: '12px' }}> { formatDate(p.createdAt) }</td >\r\n < td style = {{ padding: '14px 16px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>\r\n                          { p.selfExcludedUntil && new Date(p.selfExcludedUntil) > new Date() ? (\r\n < button\r\n                              onClick = {() => handleToggleSelfExclusion(p.id, true) } \r\n                              style = {{ \r\n                                backgroundColor: '#1E3A8A', color: '#93C5FD', \r\n                                border: '1px solid #3B82F6', padding: '6px 12px', borderRadius: '6px', \r\n                                fontSize: '11px', fontWeight: 800, cursor: 'pointer', \r\n }}\r\n >\r\n                              ▶️ STOP EXCLUSION\r\n                            </button >\r\n                          ) : (\r\n < button\r\n                              onClick = {() => handleToggleSelfExclusion(p.id, false)}\r\n                              style = {{ \r\n                                backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#F87171', \r\n                                border: '1px solid rgba(239, 68, 68, 0.4)', padding: '6px 10px', borderRadius: '6px', \r\n                                fontSize: '11px', fontWeight: 800, cursor: 'pointer', \r\n }}\r\n >\r\n                              ⏸️ EXCLUDE(7D) \r\n                            </button >\r\n                          )}\r\n < button\r\n                            onClick = {() => handleToggleFreeze(p.id, p.status)}\r\n                            style = {{ \r\n                              backgroundColor: isFrozen ? '#064E3B' : '#7F1D1D', \r\n                              color: isFrozen ? '#34D399' : '#FCA5A5', \r\n                              border: 'none', padding: '6px 12px', borderRadius: '6px', \r\n                              fontSize: '11px', fontWeight: 800, cursor: 'pointer', \r\n }}\r\n >\r\n                            { isFrozen ? '✅ UNFREEZE' : '❄️ FREEZE' } \r\n                          </button >\r\n                        </td > `;

code = code.replace(oldRowActions, newRowActions);

fs.writeFileSync(file, code, 'utf8');
console.log('ADMIN_APP_UPDATED_OK:', code.includes('handleToggleSelfExclusion'));
