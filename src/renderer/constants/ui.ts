/**
 * UI-related constants
 * Centralizes layout, spacing, and responsive breakpoints
 */

// Responsive breakpoints
export const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  large: 1200
} as const;

// Z-index layers
export const Z_INDEX = {
  dropdown: 100,
  overlay: 999,
  modal: 1000,
  contextMenu: 10001,
  tooltip: 10002
} as const;

// Sidebar
export const SIDEBAR = {
  width: 90,
  animationDuration: 300
} as const;

// Chart dimensions
export const CHART = {
  defaultWidth: 600,
  defaultHeight: 400,
  padding: {
    small: { top: 20, right: 20, bottom: 20, left: 20 },
    medium: { top: 30, right: 30, bottom: 30, left: 30 },
    large: { top: 40, right: 40, bottom: 40, left: 40 }
  },
  colors: {
    primary: '#8b5cf6',
    secondary: '#6b7280', 
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6'
  }
} as const;

// Animation durations
export const ANIMATION = {
  fast: 150,
  normal: 300,
  slow: 500
} as const;

// Grid and spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40
} as const;

// Form validation
export const VALIDATION = {
  minTitleLength: 1,
  maxTitleLength: 200,
  maxDescriptionLength: 1000
} as const;