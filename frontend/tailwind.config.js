/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      fontFamily: {
        heading: ["Cabinet Grotesk", "sans-serif"],
        body: ["Satoshi", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"]
      },
      colors: {
        background: "#F4F3ED",
        surface: "#FFFFFF",
        primary: {
          DEFAULT: "#FF4500",
          hover: "#E03C00",
          foreground: "#FFFFFF"
        },
        aiAccent: {
          DEFAULT: "#D4FF33",
          foreground: "#0A0A0A"
        },
        pastel: {
          pink: "#FFB3C6",
          blue: "#9BF6FF",
          yellow: "#FDFFB6"
        },
        text: {
          primary: "#0A0A0A",
          secondary: "#333333",
          muted: "#4A4A4A"
        },
        border: "#0A0A0A"
      },
      boxShadow: {
        brutal: "4px 4px 0px #0A0A0A",
        "brutal-lg": "8px 8px 0px #0A0A0A",
        "brutal-hover": "2px 2px 0px #0A0A0A",
        "brutal-pressed": "0px 0px 0px #0A0A0A",
        brutalInput: "2px 2px 0px #0A0A0A",
        brutalFocus: "0px 0px 0px #0A0A0A, 4px 4px 0px #FFD21F",
        brutalSoft: "3px 3px 0px #0A0A0A"
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
