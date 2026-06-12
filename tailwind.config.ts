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
        /* ── ISALY brand (new) ── */
        platre:       '#F4F3EE',
        nuit:         '#14171F',
        jaune:        '#FFC857',
        'jaune-light':'#FFF8E7',
        'jaune-dark': '#F59E0B',
        /* ── Legacy aliases (backward compat) ── */
        mint:         '#FFC857',
        'mint-light': '#FFF8E7',
        'mint-dark':  '#F59E0B',
        /* ── Neutral ── */
        charcoal:     '#14171F',
        'gray-mid':   '#7A7A74',
        'gray-light': '#F4F3EE',
        'gray-border':'#E5E4DE',
        'sidebar-bg': '#14171F',
        danger:       '#EF4444',
        warning:      '#F59E0B',
        'app-bg':     '#F4F3EE',
        /* ── shadcn/ui design tokens ── */
        background:   'hsl(var(--background))',
        foreground:   'hsl(var(--foreground))',
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
        sans:  ['Schibsted Grotesk', 'sans-serif'],
        title: ['Bricolage Grotesque', 'sans-serif'],
        serif: ['Bricolage Grotesque', 'sans-serif'],
      },
      borderRadius: {
        lg:      'var(--radius)',
        md:      'calc(var(--radius) - 2px)',
        sm:      'calc(var(--radius) - 4px)',
        DEFAULT: '14px',
        pill:    '50px',
      },
      boxShadow: {
        card: '0 2px 12px rgba(20,23,31,0.06)',
        lg:   '0 8px 36px rgba(20,23,31,0.12)',
      },
    },
  },
  plugins: [],
}
export default config
