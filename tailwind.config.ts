import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* ── ISALY brand ── */
        mint: '#4ECBA0',
        'mint-light': '#E8F9F3',
        'mint-dark': '#2AA87C',
        charcoal: '#1A1A1A',
        'gray-mid': '#6B7280',
        'gray-light': '#F5F5F5',
        'gray-border': '#E5E7EB',
        'sidebar-bg': '#111827',
        danger: '#EF4444',
        warning: '#F59E0B',
        'app-bg': '#F7F8FA',
        /* ── shadcn/ui design tokens ── */
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input:  'hsl(var(--input))',
        ring:   'hsl(var(--ring))',
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        serif: ['Outfit', 'sans-serif'],
      },
      borderRadius: {
        lg:      'var(--radius)',
        md:      'calc(var(--radius) - 2px)',
        sm:      'calc(var(--radius) - 4px)',
        DEFAULT: '14px',
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,.07)',
        lg:   '0 8px 36px rgba(0,0,0,.13)',
      },
    },
  },
  plugins: [],
}
export default config
