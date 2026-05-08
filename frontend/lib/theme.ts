// Standardized color theme for MattySpins
export const theme = {
  colors: {
    // Primary brand colors
    primary: {
      50: "#eff6ff",
      100: "#dbeafe",
      200: "#bfdbfe",
      300: "#93c5fd",
      400: "#60a5fa",
      500: "#3b82f6", // Main blue
      600: "#2563eb",
      700: "#1d4ed8",
      800: "#1e40af",
      900: "#1e3a8a",
    },

    // Secondary purple colors
    secondary: {
      50: "#faf5ff",
      100: "#f3e8ff",
      200: "#e9d5ff",
      300: "#d8b4fe",
      400: "#c084fc",
      500: "#a855f7", // Main purple
      600: "#9333ea",
      700: "#7c3aed",
      800: "#6b21a8",
      900: "#581c87",
    },

    // Accent gold colors
    accent: {
      50: "#fffbeb",
      100: "#fef3c7",
      200: "#fde68a",
      300: "#fcd34d",
      400: "#fbbf24",
      500: "#f59e0b", // Main gold
      600: "#d97706",
      700: "#b45309",
      800: "#92400e",
      900: "#78350f",
    },

    // Status colors
    success: {
      50: "#ecfdf5",
      100: "#d1fae5",
      200: "#a7f3d0",
      300: "#6ee7b7",
      400: "#34d399",
      500: "#10b981",
      600: "#059669",
      700: "#047857",
      800: "#065f46",
      900: "#064e3b",
    },

    error: {
      50: "#fef2f2",
      100: "#fee2e2",
      200: "#fecaca",
      300: "#fca5a5",
      400: "#f87171",
      500: "#ef4444",
      600: "#dc2626",
      700: "#b91c1c",
      800: "#991b1b",
      900: "#7f1d1d",
    },

    warning: {
      50: "#fffbeb",
      100: "#fef3c7",
      200: "#fde68a",
      300: "#fcd34d",
      400: "#fbbf24",
      500: "#f59e0b",
      600: "#d97706",
      700: "#b45309",
      800: "#92400e",
      900: "#78350f",
    },

    // Neutral grays
    gray: {
      50: "#f9fafb",
      100: "#f3f4f6",
      200: "#e5e7eb",
      300: "#d1d5db",
      400: "#9ca3af",
      500: "#6b7280",
      600: "#4b5563",
      700: "#374151",
      800: "#1f2937",
      900: "#111827",
    },
  },

  // Gradient combinations
  gradients: {
    primary: "bg-gradient-to-r from-blue-600 to-purple-600",
    secondary: "bg-gradient-to-r from-purple-600 to-pink-600",
    accent: "bg-gradient-to-r from-yellow-500 to-orange-500",
    success: "bg-gradient-to-r from-green-500 to-emerald-500",
    error: "bg-gradient-to-r from-red-500 to-pink-500",
    warning: "bg-gradient-to-r from-yellow-500 to-amber-500",
    background: "bg-gradient-to-br from-purple-900 via-black to-green-900",
    card: "bg-gradient-to-br from-gray-900/50 to-black/50",
  },

  // Component styles
  components: {
    button: {
      primary:
        "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white",
      secondary: "bg-gray-700 hover:bg-gray-600 text-white",
      success:
        "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white",
      danger:
        "bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white",
      warning:
        "bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 text-white",
      ghost:
        "border-2 border-gray-600 hover:border-gray-400 text-white hover:bg-gray-800/50",
    },

    card: {
      default:
        "bg-black/50 backdrop-blur-lg border border-gray-700/50 rounded-2xl",
      primary:
        "bg-blue-500/10 backdrop-blur-lg border border-blue-500/30 rounded-2xl",
      secondary:
        "bg-purple-500/10 backdrop-blur-lg border border-purple-500/30 rounded-2xl",
      success:
        "bg-green-500/10 backdrop-blur-lg border border-green-500/30 rounded-2xl",
      error:
        "bg-red-500/10 backdrop-blur-lg border border-red-500/30 rounded-2xl",
      warning:
        "bg-yellow-500/10 backdrop-blur-lg border border-yellow-500/30 rounded-2xl",
    },

    input: {
      default:
        "bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
      error:
        "bg-gray-900/50 border border-red-500 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent",
      success:
        "bg-gray-900/50 border border-green-500 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent",
    },
  },

  // Animation durations
  animation: {
    fast: "150ms",
    normal: "300ms",
    slow: "500ms",
  },

  // Spacing scale
  spacing: {
    xs: "0.5rem",
    sm: "1rem",
    md: "1.5rem",
    lg: "2rem",
    xl: "3rem",
    "2xl": "4rem",
  },

  // Border radius scale
  borderRadius: {
    sm: "0.375rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
    "2xl": "1.5rem",
  },
} as const;

// Utility functions for theme usage
export const getButtonClass = (
  variant: keyof typeof theme.components.button = "primary",
) => {
  return `px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 ${theme.components.button[variant]}`;
};

export const getCardClass = (
  variant: keyof typeof theme.components.card = "default",
) => {
  return `p-6 ${theme.components.card[variant]}`;
};

export const getInputClass = (
  variant: keyof typeof theme.components.input = "default",
) => {
  return `px-4 py-3 w-full ${theme.components.input[variant]}`;
};
