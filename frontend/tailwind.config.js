/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ─── Semantic layer (canonical) ──────────────────────────────────
        // The single vocabulary for all NEW work. Meaning, not hue: a success
        // state is `text-success`, never `text-green-400` or a raw hex. The
        // primitive palettes below (navy/gold/ink) stay put so existing
        // components keep working, and get migrated onto these over time.
        //
        // Rule of thumb: components reference semantic tokens; only this file
        // knows the hex values.
        success: {
          DEFAULT: "#4fd18b",
          soft: "rgba(79,209,139,0.12)",
          border: "rgba(79,209,139,0.28)",
          strong: "#22a35a",
        },
        warning: {
          DEFAULT: "#f5a623",
          soft: "rgba(245,166,35,0.12)",
          border: "rgba(245,166,35,0.28)",
        },
        danger: {
          DEFAULT: "#f16060",
          soft: "rgba(239,96,96,0.10)",
          border: "rgba(239,96,96,0.35)",
          strong: "#c0392b",
        },
        info: {
          DEFAULT: "#4fbfd1",
          soft: "rgba(79,191,209,0.12)",
          border: "rgba(79,191,209,0.28)",
        },
        // Surfaces — page ground → card → raised. Replaces ad-hoc
        // bg-[#0d0d10] / bg-navy-800/60 drift in new work.
        surface: {
          DEFAULT: "#08080a",
          card: "#0d0d10",
          raised: "#14171f",
        },
        // Text ramp for dark surfaces.
        content: {
          DEFAULT: "#e8e8ec",
          muted: "#8a8a93",
          dim: "#6b6b73",
          faint: "#3a3a42",
        },

        // ─── Primitive palettes (legacy — migrating onto the semantic layer) ──
        // Semantic dark surface tokens — referenced throughout components
        navy: {
          50:  "#fdf8ed",
          100: "#f5e9c4",
          200: "#e8cc80",
          300: "#d4a833",
          400: "#1c1a26",  // card hover
          500: "#18161f",  // border-active
          600: "#141219",  // card bg
          700: "#100e15",  // button bg
          800: "#0e0c13",  // card bg default
          900: "#0a0810",  // deep surface
          950: "#070509",  // near black
        },
        gold: {
          300: "#fde68a",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
        },
        prize: "#22c55e",   // always green for prize / positive amounts
        neon: {
          gold: "#fbbf24",
        },
        dark: {
          100: "#18161f",
          200: "#0e0c13",
          300: "#070509",
        },
        // Premium landing-page palette (Hero / WelcomeSplash only — rest of the
        // site keeps navy/gold). Hex values match the brand spec exactly.
        ink: {
          DEFAULT: "#090B10", // page background
          surface: "#11141B", // secondary surfaces
          card: "#171B23",    // cards
        },
        accent: {
          blue: "#1565D8",
          gold: "#F7B52C",
          silver: "#D8D8DD",
        },
        premtext: {
          primary: "#F5F7FA",
          secondary: "#9EA7B8",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gold-glow": "radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.12) 0%, transparent 70%)",
      },
      animation: {
        "pulse-slow":  "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "bounce-slow": "bounce 2s infinite",
        "spin-slow":   "spin 3s linear infinite",
        float:         "float 6s ease-in-out infinite",
        "slide-up":    "slideUp 0.5s ease-out",
        shimmer:       "shimmer 2s infinite",
        "glow-pulse":  "glowPulse 3s ease-in-out infinite",
        "pop-in":      "popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        "ring-rotate": "ringRotate 3s linear infinite",
      },
      keyframes: {
        popIn: {
          "0%":   { transform: "scale(0.6)", opacity: "0" },
          "100%": { transform: "scale(1)",   opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-10px)" },
        },
        slideUp: {
          "0%":   { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)",    opacity: "1" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(245,158,11,0.15)" },
          "50%":      { boxShadow: "0 0 40px rgba(245,158,11,0.35)" },
        },
        ringRotate: {
          "0%":   { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      fontFamily: {
        gaming: ["Orbitron", "monospace"],
        sans:   ["Inter", "system-ui", "sans-serif"],
        // Data/label face — IDs, stat values, section labels in the admin suite.
        mono:   ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        card:       "0 4px 24px rgba(0,0,0,0.5)",
        "card-hover":"0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(245,158,11,0.25)",
        gold:       "0 0 20px rgba(245,158,11,0.35)",
        "gold-lg":  "0 0 40px rgba(245,158,11,0.3)",
      },
    },
  },
  plugins: [],
};
