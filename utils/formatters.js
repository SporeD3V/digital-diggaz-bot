/**
 * @fileoverview Formatting utilities
 * Converts raw data into human-readable formats
 */

/**
 * Format milliseconds into HH:MM:SS string
 * 
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted time string (e.g., "12:34:56")
 * 
 * @example
 * formatDuration(3723000) // "1:02:03"
 */
function formatDuration(ms) {
  // Handle invalid input
  if (!ms || ms < 0) return '0:00:00';

  // Convert to seconds
  const totalSeconds = Math.floor(ms / 1000);

  // Calculate hours, minutes, seconds
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Format with leading zeros for minutes and seconds
  const paddedMinutes = minutes.toString().padStart(2, '0');
  const paddedSeconds = seconds.toString().padStart(2, '0');

  return `${hours}:${paddedMinutes}:${paddedSeconds}`;
}

/**
 * Format a number with thousand separators
 * 
 * @param {number} num - Number to format
 * @returns {string} Formatted number (e.g., "1,234")
 * 
 * @example
 * formatNumber(1234567) // "1,234,567"
 */
function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('en-US');
}

/**
 * Format a date string into relative time or short date
 * 
 * @param {string} dateStr - ISO date string
 * @returns {string} Formatted date (e.g., "2 days ago" or "Jan 15")
 * 
 * @example
 * formatDate("2024-01-15T12:00:00Z") // "Jan 15"
 */
function formatDate(dateStr) {
  if (!dateStr) return 'Unknown';

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Show relative time for recent dates
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  // Show short date for older dates
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Truncate text with ellipsis
 * 
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated text with "..." if needed
 */
function truncate(text, maxLength = 30) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

// Export all formatters
module.exports = {
  formatDuration,
  formatNumber,
  formatDate,
  truncate,
};
