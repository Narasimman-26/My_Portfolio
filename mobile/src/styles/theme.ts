/**
 * Dark Cyberpunk Theme Tokens
 */

export const CyberTheme = {
  colors: {
    // Base backgrounds
    background: '#080B10',
    backgroundSecondary: '#0E131F',
    surface: '#141B2D',
    surfaceSubtle: '#1A233A',
    surfaceHighlight: '#222F4C',

    // Accents
    neonCyan: '#00F0FF',
    neonGreen: '#00FF9D',
    neonPink: '#FF0055',
    neonYellow: '#FFE600',
    neonPurple: '#A020F0',

    // Text
    textPrimary: '#F0F6FC',
    textSecondary: '#8B949E',
    textMuted: '#484F58',
    textCyan: '#00F0FF',
    textGreen: '#00FF9D',
    textDanger: '#FF0055',

    // Borders & dividers
    border: '#1F293D',
    borderNeon: 'rgba(0, 240, 255, 0.4)',
    borderGreen: 'rgba(0, 255, 157, 0.4)',
    borderDanger: 'rgba(255, 0, 85, 0.4)',

    // Status
    online: '#00FF9D',
    offline: '#484F58',
    delivered: '#8B949E',
    read: '#00F0FF',
  },

  typography: {
    fontMono: 'monospace',
    fontRegular: 'System',
    sizes: {
      xs: 10,
      sm: 12,
      md: 14,
      lg: 16,
      xl: 18,
      xxl: 22,
      hero: 28,
    },
  },

  shadows: {
    neonGlowCyan: {
      shadowColor: '#00F0FF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 10,
      elevation: 6,
    },
    neonGlowGreen: {
      shadowColor: '#00FF9D',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 10,
      elevation: 6,
    },
    neonGlowPink: {
      shadowColor: '#FF0055',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 10,
      elevation: 6,
    },
  },

  radii: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    full: 9999,
  },
};
