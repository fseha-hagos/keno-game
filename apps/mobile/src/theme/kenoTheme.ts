/** Visual tokens — warm red cabinet, darker (not black) at bottom */
export const KENO_COLORS = {
  stageTop: '#D84343',
  stageMid: '#B52F2F',
  stageBottom: '#6E2222',
  cellDefault: '#6E2828',
  cellBorder: '#5A2020',
  /** User’s picks on the board */
  pickFill: '#FFEA00',
  pickBorder: '#FFFFFF',
  /** House draw (not the same as user picks) */
  drawnFill: '#7DD3FC',
  drawnBorder: '#0EA5E9',
  /** Pick + drawn match */
  hitFill: '#4ADE80',
  hitBorder: '#16A34A',
  ballYellow: '#FFEB3B',
  textOnOrange: '#FFF8F5',
  textMuted: 'rgba(255,248,245,0.72)',
  chrome: '#D4D4D4',
  chromeMid: '#A8A8A8',
  chromeEdge: '#6E6E6E',
  chromeDark: '#505050',
  drawLabel: '#C8E66C',
  badgeGold: '#F5C542',
  glassFill: 'rgba(255,255,255,0.12)',
  glassBorder: 'rgba(255,255,255,0.35)',
};

/** Softer vertical gradient: red top → deep red bottom (avoid pure black) */
export const KENO_GRADIENTS = {
  stage: ['#D94848', '#C73A3A', '#B03030', '#8F2828', '#6E2222'] as const,
  stageFrame: ['#7A2525', '#5C1E1E', '#4A1818'] as const,
  paytable: ['#9A3030', '#7A2828', '#5C2020'] as const,
  cell: ['#7A2E2E', '#6E2828', '#5A2020'] as const,
};

export const KENO_GRADIENT_VERTICAL = {
  start: { x: 0.5, y: 0 },
  end: { x: 0.5, y: 1 },
} as const;
