/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Refined Earthy Luxury Palette from User Specification:
        // #1E201E (Obsidian Canvas)
        // #3C3D37 (Warm Slate Surface / Borders)
        // #697565 (Sage Green / Olive Accent)
        // #ECDFCC (Warm Alabaster / Cream Text)

        zinc: {
          950: '#1E201E', // Canvas base background (#1E201E)
          900: '#252724', // Elevated surface
          850: '#2F312B', // Deep card fill
          800: '#3C3D37', // Card surface / Borders (#3C3D37)
          700: '#4D4F46', // Secondary borders & hover strokes
          600: '#63665B', // Controls
          500: '#7E8276', // Muted captions & placeholders
          400: '#A4A89D', // Secondary text
          300: '#C7CBC0', // High legibility muted text
          200: '#DED5C5', // Light cream text
          100: '#ECDFCC', // Warm Alabaster Cream (#ECDFCC)
          50:  '#FAF5ED', // Brightest cream
        },

        // Sage / Olive Accent Palette (#697565)
        sage: {
          50:  '#F4F6F3',
          100: '#E4E8E3',
          200: '#CCD3CA',
          300: '#B0BBAE',
          400: '#8B9986',
          500: '#697565', // Exact user accent (#697565)
          600: '#586354',
          700: '#475044',
          800: '#363D34',
          900: '#272C25',
          950: '#1B1F1A',
        },

        // Cream / Alabaster (#ECDFCC)
        cream: {
          DEFAULT: '#ECDFCC',
          light:   '#FAF5ED',
          dark:    '#D8C9B3',
          muted:   '#A89B87',
        },

        // Map indigo tokens to the elegant sage palette for seamless application-wide consistency
        indigo: {
          50:  '#FAF5ED',
          100: '#ECDFCC',
          200: '#CCD3CA',
          300: '#B0BBAE',
          400: '#8B9986',
          500: '#7A8875',
          600: '#697565', // User Color 3
          700: '#586354',
          800: '#475044',
          900: '#363D34',
          950: '#222720',
        },

        // Mapped emerald tokens to harmonious forest/sage green
        emerald: {
          400: '#8B9986',
          500: '#697565',
          800: '#363D34',
          900: '#272C25',
          950: '#1B1F1A',
        },

        navy: {
          950: '#1E201E',
          900: '#252724',
          800: '#3C3D37',
        },

        accent: {
          DEFAULT: '#697565',
          light:   '#ECDFCC',
          dark:    '#3C3D37',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Fira Code', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.4)',
        card: '0 0 0 1px rgba(236, 223, 204, 0.05), 0 2px 6px 0 rgba(0, 0, 0, 0.45)',
        'card-md': '0 0 0 1px rgba(236, 223, 204, 0.08), 0 8px 18px -4px rgba(0, 0, 0, 0.65)',
        'terminal': '0 20px 50px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(236, 223, 204, 0.1)',
        'glow-subtle': '0 0 20px -5px rgba(105, 117, 101, 0.15)',
      },
      animation: {
        'pulse-subtle': 'pulseSubtle 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-down': 'slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
