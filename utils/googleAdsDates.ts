/**
 * Utility functions for working with Google Ads dates in account timezone
 * Google Ads API uses the account's timezone for segments.date, not UTC
 */

/**
 * Format a date in YYYY-MM-DD format using the account timezone
 * @param date - The date to format
 * @param timezone - The timezone string (e.g., 'America/Los_Angeles')
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateInTimezone(date: Date, timezone: string): string {
  try {
    // Use Intl.DateTimeFormat to format date in the specified timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    const parts = formatter.formatToParts(date);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    // Fallback to local date formatting if timezone is invalid
    console.warn(`Invalid timezone ${timezone}, falling back to local date:`, error);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Get today's date in the account timezone
 */
export function getTodayInTimezone(timezone: string): string {
  return formatDateInTimezone(new Date(), timezone);
}

/**
 * Get yesterday's date in the account timezone
 */
export function getYesterdayInTimezone(timezone: string): string {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDateInTimezone(yesterday, timezone);
}

/**
 * Get a date range for the last N days in the account timezone
 */
export function getLastNDaysInTimezone(days: number, timezone: string): { startDate: string; endDate: string } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return {
    startDate: formatDateInTimezone(startDate, timezone),
    endDate: formatDateInTimezone(endDate, timezone),
  };
}

/**
 * Get start and end of current month in account timezone
 */
export function getThisMonthInTimezone(timezone: string): { startDate: string; endDate: string } {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date();
  
  return {
    startDate: formatDateInTimezone(startDate, timezone),
    endDate: formatDateInTimezone(endDate, timezone),
  };
}

/**
 * Get start and end of last month in account timezone
 */
export function getLastMonthInTimezone(timezone: string): { startDate: string; endDate: string } {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endDate = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of previous month
  
  return {
    startDate: formatDateInTimezone(startDate, timezone),
    endDate: formatDateInTimezone(endDate, timezone),
  };
}

/**
 * Default timezone fallback (Google Ads default is Pacific Time)
 */
export const DEFAULT_TIMEZONE = 'America/Los_Angeles';

