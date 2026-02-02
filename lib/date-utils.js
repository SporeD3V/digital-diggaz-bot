/**
 * @fileoverview Date utilities for calculating month boundaries.
 * Used to determine which posts to scan and filter tracks by release date.
 */

/**
 * Month names for playlist naming (e.g., "Digital Diggaz January 2026").
 * @type {string[]}
 */
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Get the previous month's date boundaries and metadata.
 * Used to determine which posts to fetch and what release dates to accept.
 * 
 * @param {Date} [now=new Date()] - Reference date (defaults to current time)
 * @returns {{
 *   year: number,
 *   month: number,
 *   monthName: string,
 *   startDate: Date,
 *   endDate: Date,
 *   yearMonth: string
 * }} Previous month info with start/end boundaries
 * 
 * @example
 * // If today is Feb 1, 2026:
 * getPreviousMonthBounds() // Returns Jan 2026 boundaries
 */
function getPreviousMonthBounds(now = new Date()) {
  /**
   * Calculate previous month/year, handling January -> December rollover.
   * JS months are 0-indexed, so we subtract 1 and handle underflow.
   */
  const currentMonth = now.getUTCMonth();
  const currentYear = now.getUTCFullYear();
  
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  
  /**
   * Build UTC date boundaries for the previous month.
   * startDate: First moment of first day (00:00:00.000)
   * endDate: Last moment of last day (23:59:59.999)
   */
  const startDate = new Date(Date.UTC(prevYear, prevMonth, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(prevYear, prevMonth + 1, 0, 23, 59, 59, 999));
  
  /**
   * yearMonth format "YYYY-MM" matches Spotify's album.release_date format.
   * Used to check if a track was released in the target month.
   */
  const yearMonth = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;
  
  return {
    year: prevYear,
    month: prevMonth + 1,
    monthName: MONTH_NAMES[prevMonth],
    startDate,
    endDate,
    yearMonth
  };
}

/**
 * Check if a Spotify release date falls within the target year-month.
 * Spotify returns dates in formats: "YYYY-MM-DD", "YYYY-MM", or "YYYY".
 * 
 * @param {string} releaseDate - Spotify's album.release_date field
 * @param {string} targetYearMonth - Target in "YYYY-MM" format
 * @returns {boolean} True if release matches target month
 * 
 * @example
 * isReleasedInMonth("2026-01-15", "2026-01") // true
 * isReleasedInMonth("2026-01", "2026-01")    // true
 * isReleasedInMonth("2026", "2026-01")       // false (too vague)
 */
function isReleasedInMonth(releaseDate, targetYearMonth) {
  if (!releaseDate || !targetYearMonth) return false;
  
  /**
   * Only accept dates precise enough to confirm the month.
   * "YYYY" alone is rejected because we can't confirm the specific month.
   */
  if (releaseDate.length < 7) return false;
  
  return releaseDate.startsWith(targetYearMonth);
}

/**
 * Convert a Date to ISO string for Facebook Graph API since/until params.
 * Facebook expects Unix timestamps or ISO strings for time filtering.
 * 
 * @param {Date} date - Date to convert
 * @returns {number} Unix timestamp (seconds since epoch)
 */
function toUnixTimestamp(date) {
  return Math.floor(date.getTime() / 1000);
}

module.exports = {
  MONTH_NAMES,
  getPreviousMonthBounds,
  isReleasedInMonth,
  toUnixTimestamp
};
