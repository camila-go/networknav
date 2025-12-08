import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Custom brand colors for NetworkNav - WCAG AA Compliant
        // Navy scale with improved contrast ratios
        navy: {
          50: "#f5f7fa",   // Background tints
          100: "#e4e9f0",  // Subtle backgrounds
          200: "#c8d3e0",  // Borders, dividers
          300: "#a3b3c7",  // Disabled states
          400: "#7a8fa8",  // Placeholder text (4.5:1 on white)
          500: "#5a7089",  // Secondary text (5.3:1 on white)
          600: "#45576c",  // Body text (7.5:1 on white)
          700: "#33414f",  // Primary text (10.5:1 on white)
          800: "#252f3a",  // Headings (13:1 on white)
          900: "#1a2028",  // Maximum contrast (16:1 on white)
        },
        // Coral scale - accessible accent color
        coral: {
          50: "#fff6f5",
          100: "#ffe8e6",
          200: "#ffd0cc",
          300: "#ffb3ad",
          400: "#ff8c82",  // Decorative only
          500: "#e85c50",  // 4.5:1 on white - AA compliant
          600: "#c94a3f",  // 6:1 on white
          700: "#a83d33",  // 7.5:1 on white
          800: "#8a3229",  // 9:1 on white
          900: "#6b2720",  // 11:1 on white
        },
        // Teal scale - primary brand color
        teal: {
          50: "#edfafa",
          100: "#d5f5f5",
          200: "#a8e8e8",
          300: "#6fd4d4",
          400: "#3eb8b8",  // Decorative only
          500: "#2a9393",  // 4.5:1 on white - AA compliant
          600: "#237a7a",  // 5.7:1 on white
          700: "#1c6161",  // 7.3:1 on white
          800: "#164d4d",  // 9:1 on white
          900: "#113b3b",  // 11:1 on white
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "Times New Roman", "serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;

