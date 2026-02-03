/**
 * @fileoverview Next.js App component
 * Wraps all pages with global styles
 */

import '../styles/globals.css';

/**
 * Custom App component
 * Applies global styles to all pages
 * 
 * @param {Object} props - Component props
 * @param {React.Component} props.Component - The page component
 * @param {Object} props.pageProps - Props for the page
 */
export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
