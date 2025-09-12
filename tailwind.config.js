module.exports = {
  content: ["./pages/*.{html,js}", "./index.html", "./js/*.js"],
  theme: {
    extend: {
      colors: {
        // Primary Colors - Deep forest grounding for trust and stability
        primary: {
          DEFAULT: "#2D5A3D", // forest-600
          50: "#F0F7F2", // forest-50
          100: "#D9EBE0", // forest-100
          200: "#B3D7C1", // forest-200
          300: "#8CC3A2", // forest-300
          400: "#66AF83", // forest-400
          500: "#409B64", // forest-500
          600: "#2D5A3D", // forest-600
          700: "#1A3A26", // forest-700
          800: "#0D1D13", // forest-800
          900: "#070F0A", // forest-900
        },
        // Secondary Colors - Soft lavender wisdom for spiritual connection
        secondary: {
          DEFAULT: "#8B7B9B", // lavender-500
          50: "#F7F6F9", // lavender-50
          100: "#EFEDF3", // lavender-100
          200: "#DFDBE7", // lavender-200
          300: "#CFC9DB", // lavender-300
          400: "#BFB7CF", // lavender-400
          500: "#8B7B9B", // lavender-500
          600: "#6F5F7F", // lavender-600
          700: "#534763", // lavender-700
          800: "#372F47", // lavender-800
          900: "#1B172B", // lavender-900
        },
        // Accent Colors - Warm gold highlighting for premium sacred content
        accent: {
          DEFAULT: "#D4A574", // gold-400
          50: "#FBF8F4", // gold-50
          100: "#F7F1E9", // gold-100
          200: "#EFE3D3", // gold-200
          300: "#E7D5BD", // gold-300
          400: "#D4A574", // gold-400
          500: "#C19A5D", // gold-500
          600: "#A17B3D", // gold-600
          700: "#7A5C2E", // gold-700
          800: "#523D1F", // gold-800
          900: "#291E0F", // gold-900
        },
        // Background Colors
        background: "#FEFEFE", // pure-white
        surface: "#F8F6F3", // warm-white
        // Text Colors
        text: {
          primary: "#2C2C2C", // charcoal-800
          secondary: "#6B6B6B", // gray-500
        },
        // Status Colors
        success: "#4A7C59", // nurturing-green
        warning: "#B8860B", // gentle-amber
        error: "#A0522D", // earthy-concern
        // Border Colors
        border: {
          light: "#F0EDE8", // warm-border
        },
      },
      fontFamily: {
        crimson: ['Crimson Text', 'serif'],
        inter: ['Inter', 'sans-serif'],
        dancing: ['Dancing Script', 'cursive'],
        sans: ['Inter', 'sans-serif'],
        serif: ['Crimson Text', 'serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.6rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1.3' }],
        '6xl': ['3.75rem', { lineHeight: '1.3' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      boxShadow: {
        'sacred': '0 2px 8px rgba(45, 90, 61, 0.1)',
        'sacred-strong': '0 4px 16px rgba(45, 90, 61, 0.15)',
        'contemplative': '0 8px 32px rgba(45, 90, 61, 0.08)',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      transitionDuration: {
        '300': '300ms',
        '400': '400ms',
      },
      transitionTimingFunction: {
        'contemplative': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'reveal': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 400ms ease-out',
        'slide-up': 'slideUp 400ms ease-out',
        'gentle-bounce': 'gentleBounce 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(2rem)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        gentleBounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-0.5rem)' },
        },
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
}