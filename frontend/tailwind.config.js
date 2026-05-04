/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      fontFamily: {
        heading: ["Inter", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"]
      },
      colors: {
        background: "#F8F9FB",
        surface: "#FFFFFF",
        primary: {
          DEFAULT: "#4F46E5",
          hover: "#4338CA",
          foreground: "#FFFFFF"
        },
        aiAccent: {
          DEFAULT: "#8B5CF6",
          foreground: "#0A0A0A"
        },
        pastel: {
          pink: "#E9D5FF",
          blue: "#DBEAFE",
          yellow: "#FEF3C7"
        },
        text: {
          primary: "#111827",
          secondary: "#4B5563",
          muted: "#6B7280"
        },
        border: "#E5E7EB"
      },
      boxShadow: {
        brutal: "0 8px 24px rgba(17, 24, 39, 0.08)",
        "brutal-lg": "0 18px 48px rgba(17, 24, 39, 0.12)",
        "brutal-hover": "0 10px 28px rgba(17, 24, 39, 0.12)",
        "brutal-pressed": "inset 0 1px 2px rgba(17, 24, 39, 0.08)",
        brutalInput: "0 1px 2px rgba(17, 24, 39, 0.05)",
        brutalFocus: "0 0 0 4px rgba(79, 70, 229, 0.15), 0 10px 28px rgba(17, 24, 39, 0.12)",
        brutalSoft: "0 6px 18px rgba(17, 24, 39, 0.06)"
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
      },
      animation: {
        'pop-in': 'pop-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'sparkle': 'sparkle 1s infinite',
        'shake-soft': 'shake-soft 0.3s ease-in-out',
        'float-slow': 'float-slow 2.8s ease-in-out infinite'
      },
      keyframes: {
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'sparkle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        'shake-soft': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-1px)' },
          '75%': { transform: 'translateX(1px)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' },
        }
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};
