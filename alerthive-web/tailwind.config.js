/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // FedEx Brand: Purple & Orange Promise (via CSS variables for dark/light)
        // Semantic colors use RGB channel format to support Tailwind opacity modifiers
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        'primary-dark': 'rgb(var(--color-primary-dark) / <alpha-value>)',
        'primary-light': 'rgb(var(--color-primary-light) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        'accent-dark': 'rgb(var(--color-accent-dark) / <alpha-value>)',
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-light': 'var(--color-surface-light)',
        'surface-highlight': 'var(--color-surface-highlight)',
        border: 'var(--color-border)',
        'border-light': 'var(--color-border-light)',
        critical: 'rgb(var(--color-critical) / <alpha-value>)',
        high: 'rgb(var(--color-high) / <alpha-value>)',
        medium: 'rgb(var(--color-medium) / <alpha-value>)',
        low: 'rgb(var(--color-low) / <alpha-value>)',
        info: 'rgb(var(--color-info) / <alpha-value>)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
      },
    },
  },
  plugins: [],
}

