/**
 * @fileoverview Tailwind CSS configuration
 * Defines custom colors and content paths
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Files to scan for Tailwind classes
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],

  theme: {
    extend: {
      // Custom colors matching Spotify brand
      colors: {
        spotify: {
          green: '#1DB954',
          black: '#191414',
          white: '#FFFFFF',
          gray: '#535353',
          lightgray: '#B3B3B3',
        },
      },
    },
  },

  plugins: [],
};
