/** @type {import('tailwindcss').Config} */
import { fontFamily } from 'tailwindcss/defaultTheme';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // === PALETTE PREMIUM INDUSTRIAL - Indigo Profond ===
      colors: {
        // Background & Foreground
        'background': 'hsl(var(--background))',
        'foreground': 'hsl(var(--foreground))',
        
        // Surface - Teintes Slate (bleutées) très sombres/très claires
        'surface': {
          DEFAULT: 'hsl(var(--surface))',
          '50': 'hsl(var(--surface-50))',
          '100': 'hsl(var(--surface-100))',
          '200': 'hsl(var(--surface-200))',
          '300': 'hsl(var(--surface-300))',
          '400': 'hsl(var(--surface-400))',
          '500': 'hsl(var(--surface-500))',
          '600': 'hsl(var(--surface-600))',
          '700': 'hsl(var(--surface-700))',
          '800': 'hsl(var(--surface-800))',
          '900': 'hsl(var(--surface-900))',
        },
        
        // Cards
        'card': 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',
        
        // Primary - Indigo Profond (#34519e) avec variantes vibrantes
        'primary': {
          DEFAULT: 'hsl(var(--primary))',
          '50': 'hsl(var(--primary-50))',
          '100': 'hsl(var(--primary-100))',
          '200': 'hsl(var(--primary-200))',
          '300': 'hsl(var(--primary-300))',
          '400': 'hsl(var(--primary-400))',
          '500': 'hsl(var(--primary))',
          '600': 'hsl(var(--primary-600))',
          '700': 'hsl(var(--primary-700))',
          '800': 'hsl(var(--primary-800))',
          '900': 'hsl(var(--primary-900))',
          'foreground': 'hsl(var(--primary-foreground))',
        },
        
        // Secondary
        'secondary': 'hsl(var(--secondary))',
        'secondary-foreground': 'hsl(var(--secondary-foreground))',
        
        // Muted - Slate
        'muted': 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        
        // Accent
        'accent': 'hsl(var(--accent))',
        'accent-foreground': 'hsl(var(--accent-foreground))',
        
        // Destructive
        'destructive': 'hsl(var(--destructive))',
        'destructive-foreground': 'hsl(var(--destructive-foreground))',
        
        // Ring (focus)
        'ring': 'hsl(var(--ring))',
        
        // Statuts Néon (pour mode sombre)
        'success': {
          DEFAULT: 'hsl(var(--success))',
          'glow': 'hsl(var(--success-glow))',
          'foreground': 'hsl(var(--success-foreground))',
        },
        'warning': {
          DEFAULT: 'hsl(var(--warning))',
          'glow': 'hsl(var(--warning-glow))',
          'foreground': 'hsl(var(--warning-foreground))',
        },
        'error': {
          DEFAULT: 'hsl(var(--error))',
          'glow': 'hsl(var(--error-glow))',
          'foreground': 'hsl(var(--error-foreground))',
        },
      },
      
      // === TYPOGRAPHIE INTER - Échelle fluide ===
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        // Échelle de typographie fluide - Base 16px sur mobile
        'caption': ['0.75rem', { lineHeight: '1rem', fontWeight: '500', letterSpacing: '0.01em' }],
        'body': ['0.875rem', { lineHeight: '1.5rem', fontWeight: '400', letterSpacing: '0' }],
        'body-lg': ['1rem', { lineHeight: '1.5rem', fontWeight: '400', letterSpacing: '0' }],
        'h2': ['1.125rem', { lineHeight: '1.75rem', fontWeight: '500', letterSpacing: '-0.02em' }],
        'h2-lg': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '500', letterSpacing: '-0.02em' }],
        'h1': ['1.5rem', { lineHeight: '2rem', fontWeight: '500', letterSpacing: '-0.02em' }],
        'h1-lg': ['1.875rem', { lineHeight: '2.25rem', fontWeight: '500', letterSpacing: '-0.02em' }],
        // Tailles supplémentaires
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
      },
      fontWeight: {
        'light': '300',
        'normal': '400',
        'medium': '500',
        'semibold': '600',
        'bold': '700',
      },
      letterSpacing: {
        'tight': '-0.02em',
        'normal': '0',
        'wide': '0.01em',
      },
      
      // === OMBRES PORTÉES COLORÉES (Premium Industrial) ===
      boxShadow: {
        // Ombres indigo colorées pour lévitation moderne
        'indigo-sm': '0 2px 8px -2px rgb(52 81 158 / 0.15), 0 0 0 1px rgb(52 81 158 / 0.1)',
        'indigo': '0 4px 16px -4px rgb(52 81 158 / 0.2), 0 0 0 1px rgb(52 81 158 / 0.15)',
        'indigo-lg': '0 8px 32px -6px rgb(52 81 158 / 0.25), 0 0 0 1px rgb(52 81 158 / 0.2)',
        'indigo-xl': '0 16px 48px -8px rgb(52 81 158 / 0.3), 0 0 0 1px rgb(52 81 158 / 0.25)',
        // Glass panels avec ombres subtiles
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.05), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
        'glass-lg': '0 20px 60px 0 rgba(0, 0, 0, 0.08), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)',
        // Success/Warning/Error glows néon
        'success-glow': '0 0 20px -5px rgba(34, 197, 94, 0.4), 0 0 40px -10px rgba(34, 197, 94, 0.2)',
        'warning-glow': '0 0 20px -5px rgba(251, 191, 36, 0.4), 0 0 40px -10px rgba(251, 191, 36, 0.2)',
        'error-glow': '0 0 20px -5px rgba(239, 68, 68, 0.4), 0 0 40px -10px rgba(239, 68, 68, 0.2)',
      },
      
      // === BACKDROP BLUR ===
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'DEFAULT': '12px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '40px',
        '3xl': '64px',
      },
      
      // === ANIMATIONS GLOBALES ===
      keyframes: {
        // Enter - Glissement vers le haut + fondu en entrée
        'enter': {
          '0%': { 
            opacity: '0', 
            transform: 'translateY(8px) scale(0.98)' 
          },
          '100%': { 
            opacity: '1', 
            transform: 'translateY(0) scale(1)' 
          },
        },
        // Shimmer - Effet de brillance pour les cartes de chargement
        'shimmer': {
          '0%': { 
            backgroundPosition: '-200% 0' 
          },
          '100%': { 
            backgroundPosition: '200% 0' 
          },
        },
        // Exit
        'exit': {
          '0%': { 
            opacity: '1', 
            transform: 'translateY(0) scale(1)' 
          },
          '100%': { 
            opacity: '0', 
            transform: 'translateY(-8px) scale(0.98)' 
          },
        },
        // Float pour les éléments flottants
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        // Pulse lent et organique
        'pulse-slow': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
      },
      animation: {
        'enter': 'enter 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'shimmer': 'shimmer 2s linear infinite',
        'exit': 'exit 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'float': 'float 3s ease-in-out infinite',
        'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
      },
      
      // === TRANSITIONS GLOBALES ===
      transitionProperty: {
        'all': 'all',
      },
      transitionDuration: {
        '200': '200ms',
        '300': '300ms',
        '400': '400ms',
      },
      transitionTimingFunction: {
        'out': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      
      // === Z-INDEX MANAGEMENT ===
      zIndex: {
        'background': '0',
        'content': '10',
        'sticky': '20',
        'overlay': '30',
        'modal': '40',
        'toast': '50',
      },
      
      // === ESPACEMENTS RESPIRANTS ===
      spacing: {
        ...require('tailwindcss/defaultTheme').spacing,
      },
      
      // === BORDER RADIUS ===
      borderRadius: {
        'DEFAULT': '0.75rem', // 12px
        'sm': '0.5rem',
        'md': '0.75rem',
        'lg': '1rem',
        'xl': '1.5rem',
        '2xl': '2rem',
        'full': '9999px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};
