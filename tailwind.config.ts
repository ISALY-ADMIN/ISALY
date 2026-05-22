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
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        serif: ['DM Serif Display', 'serif'],
      },
      borderRadius: {
        DEFAULT: '14px',
        sm: '9px',
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,.07)',
        lg: '0 8px 36px rgba(0,0,0,.13)',
      },
    },
  },
  plugins: [],
}
export default config
