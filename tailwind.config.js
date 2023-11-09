const themes = require('./themes');
/* eslint global-require: off, import/no-extraneous-dependencies: off */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/react-tailwindcss-select/dist/index.esm.js',
  ],
  plugins: [require('@tailwindcss/typography'), require('daisyui')],
  daisyui: {
    themes: [
      ...themes,
      {
        default: {
          primary: '#9ece6a',
          secondary: '#f7768e',
          accent: '#ff9e64',
          neutral: '#414868',
          'base-100': '#1a1b26',
          info: '#b4f9f8',
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
