import { getGoogleAdsCustomer } from './client';
import {
  getLastNDaysInTimezone,
  getTodayInTimezone,
  getYesterdayInTimezone,
  DEFAULT_TIMEZONE,
} from '../../../utils/googleAdsDates';

// Cache the timezone in memory (could be enhanced with Redis for multi-instance deployments)
let cachedTimezone: string | null = null;
let timezoneCacheTime: number = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get the account timezone from Google Ads API (with caching)
 * @returns The account timezone string (e.g., 'America/Los_Angeles')
 */
export async function getAccountTimezone(): Promise<string> {
  // Return cached timezone if available and not expired
  const now = Date.now();
  if (cachedTimezone && (now - timezoneCacheTime) < CACHE_TTL) {
    return cachedTimezone;
  }

  try {
    // Fetch timezone from Google Ads API
    const customer = getGoogleAdsCustomer();
    
    const query = `
      SELECT 
        customer.time_zone
      FROM customer
      LIMIT 1
    `;
    
    const response = await customer.query(query);
    const rows = Array.isArray(response) 
      ? response 
      : (response as any)?.rows || (response as any)?.results || [];
    
    if (rows.length > 0 && rows[0]?.customer?.time_zone) {
      cachedTimezone = rows[0].customer.time_zone;
      timezoneCacheTime = now;
      return cachedTimezone;
    }
  } catch (error) {
    console.error('Error fetching account timezone:', error);
  }

  // Fallback to default if fetch fails
  if (!cachedTimezone) {
    cachedTimezone = DEFAULT_TIMEZONE;
    console.warn('⚠️ Using default timezone:', DEFAULT_TIMEZONE);
  }
  
  return cachedTimezone;
}

/**
 * Get default date range for last N days in account timezone
 * @param days - Number of days to go back
 * @returns Object with startDate and endDate strings
 */
export async function getDefaultDateRange(days: number = 30): Promise<{ startDate: string; endDate: string }> {
  const timezone = await getAccountTimezone();
  return getLastNDaysInTimezone(days, timezone);
}

