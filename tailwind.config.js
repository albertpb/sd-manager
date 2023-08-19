/* eslint global-require: off, import/no-extraneous-dependencies: off */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  plugins: [require('@tailwindcss/typography'), require('daisyui')],
  daisyui: {
    themes: [
      'light',
      'dark',
      'coffee',
      {
        mytheme: {
          primary: '#1971c2',
          secondary: '#e03131',
          accent: '#228be6',
          neutral: '#1a1b1e',
          'base-100': '#2c2e33',
          info: '#c1c2c5',
          success: '#2f9e44',
          warning: '#e03131',
          error: '#fa5252',
        },
      },
    ],
    base: true,
    darkTheme: 'coffee',
    styled: true,
    utils: true,
  },
};
