/**
 * Color palette for the Advent of Code TUI
 * Only use these colors throughout the UI
 */
export const colors = {
  pink: "#eba4cf",
  orange: "#f8a59a",
  yellow: "#e5b473",
  green: "#b8c77c",
  teal: "#7ed2ab",
  cyan: "#66d0df",
  blue: "#8fc2fd",
  purple: "#c5b0f6",
} as const;

// Semantic color mappings for consistent usage
export const semanticColors = {
  // Text colors
  primary: colors.cyan,
  secondary: colors.purple,
  muted: colors.blue,

  // Status colors
  success: colors.green,
  warning: colors.yellow,
  error: colors.orange,
  info: colors.cyan,

  // UI elements
  highlight: colors.pink,
  accent: colors.teal,
  border: colors.cyan,

  // Selection
  selected: colors.blue,
  selectedText: "#ffffff",
} as const;
