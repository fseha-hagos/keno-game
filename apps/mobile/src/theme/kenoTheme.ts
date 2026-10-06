/** Visual tokens — Shamo.bet Fast Keno authentic dark casino aesthetic */
export const KENO_COLORS = {
  /** Background / stage — deep dark navy-charcoal like Shamo.bet */
  bgPrimary: '#0F1923',
  bgSecondary: '#141D27',
  bgCard: '#172230',
  bgGrid: '#111A24',

  /** Grid cells — authentic dark charcoal tiles as seen on Shamo.bet */
  cellDefault: '#212C3A',
  cellBorder: '#293748',

  /** User's picks on the board — rich casino emerald green (Shamo.bet cell 4) */
  pickFill: '#387F56',
  pickBorder: '#4DB57A',

  /** House draw only (not in player picks) — dark emerald tint */
  drawnFill: '#1A3328',
  drawnBorder: '#2B704A',
  drawnText: '#9FE6BD',

  /** Pick + drawn match (HIT) — radiant winning neon green */
  hitFill: '#22C55E',
  hitBorder: '#4ADE80',
  hitGlow: 'rgba(34, 197, 94, 0.85)',

  /** 3D Ball colors */
  ballNavy: '#162232',
  ballDark: '#0D1520',
  ballHighlight: 'rgba(255, 255, 255, 0.32)',
  ballGreen: '#064E3B',

  /** Text colors */
  textDefault: '#8292A6',
  textSelected: '#FFFFFF',
  textMuted: '#64748B',
  textBright: '#F8FAFC',

  /** Accent */
  drawLabel: '#22C55E',
  badgeGold: '#FACC15',
  accentGreen: '#22C55E',
  neonGreen: '#00E701',

  /** Timer glow — cyan/teal like Shamo.bet countdown */
  timerCyan: '#00E5FF',
  timerGlow: 'rgba(0, 229, 255, 0.6)',

  /** Hot / Cold dot markers */
  hotDot: '#EF4444',
  coldDot: '#38BDF8',

  /** Status colors */
  statusWaiting: '#FACC15',
  statusWin: '#10B981',
  statusLost: '#EF4444',
};

export const KENO_GRADIENTS = {
  stage: ['#0F1923', '#141C28', '#182230', '#0F1923'] as const,
  stageFrame: ['#141C28', '#0F1923'] as const,
  paytable: ['#182230', '#1A2332', '#182230'] as const,
  cell: ['#1E2A38', '#1A2332'] as const,
};

export const KENO_GRADIENT_VERTICAL = {
  start: { x: 0.5, y: 0 },
  end: { x: 0.5, y: 1 },
} as const;
