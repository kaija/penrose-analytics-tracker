/**
 * Cookie Manager
 * Manages visitor ID and cookie operations for analytics tracking
 * 
 * Requirements: 4.1, 4.2, 4.3, 18.3
 */

import { CookieOptions } from './types';

export class CookieManager {
  private options: CookieOptions;
  private cookieName: string;

  constructor(cookieName: string = 'wooTracker', options: CookieOptions = {}) {
    this.cookieName = cookieName;
    this.options = {
      domain: options.domain,
      expire: options.expire ?? 730, // Default 2 years
      path: options.path ?? '/',
      secure: options.secure ?? false
    };
  }

  /**
   * Get the visitor ID from cookie, or generate a new one if not exists
   * Requirements: 4.1, 4.2
   */
  getVisitorId(): string {
    const existingId = this.getCookie(this.cookieName);
    
    if (existingId) {
      return existingId;
    }
    
    // Generate new visitor ID if not exists
    const newId = this.generateVisitorId();
    this.setVisitorId(newId);
    
    // Verify the cookie was set successfully
    const verifyId = this.getCookie(this.cookieName);
    if (!verifyId) {
      console.warn('Analytics Tracker: Cookies appear to be disabled. Using temporary visitor ID for this session only.');
    }
    
    return newId;
  }

  /**
   * Set the visitor ID in cookie
   * Requirements: 4.1, 4.3
   */
  setVisitorId(id: string): void {
    this.setCookie(this.cookieName, id, this.options);
  }

  /**
   * Get a cookie value by name
   * Requirements: 4.2
   */
  getCookie(name: string): string | null {
    // Check if document is available (browser environment)
    if (typeof document === 'undefined') {
      console.warn('Analytics Tracker: Cookies are not available in this environment.');
      return null;
    }
    
    try {
      const cookies = this.parseCookie(document.cookie);
      return cookies[name] || null;
    } catch (error) {
      console.warn('Analytics Tracker: Failed to read cookie:', error);
      return null;
    }
  }

  /**
   * Set a cookie with specified options
   * Requirements: 4.3, 18.3
   */
  setCookie(name: string, value: string, options?: CookieOptions): void {
    // Check if document is available (browser environment)
    if (typeof document === 'undefined') {
      console.warn('Analytics Tracker: Cookies are not available in this environment.');
      return;
    }
    
    try {
      const opts = { ...this.options, ...options };
      let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

      // Add expiration
      if (opts.expire) {
        const date = new Date();
        date.setTime(date.getTime() + opts.expire * 24 * 60 * 60 * 1000);
        cookieString += `; expires=${date.toUTCString()}`;
      }

      // Add path
      if (opts.path) {
        cookieString += `; path=${opts.path}`;
      }

      // Add domain for cross-domain tracking
      if (opts.domain) {
        cookieString += `; domain=${opts.domain}`;
      }

      // Add secure flag
      if (opts.secure) {
        cookieString += '; secure';
      }

      // Add SameSite attribute for security
      cookieString += '; SameSite=Lax';

      document.cookie = cookieString;
    } catch (error) {
      console.warn('Analytics Tracker: Failed to set cookie. Cookies may be disabled.', error);
    }
  }

  /**
   * Delete a cookie by name
   */
  deleteCookie(name: string): void {
    this.setCookie(name, '', { ...this.options, expire: -1 });
  }

  /**
   * Generate a unique visitor ID
   * Uses a combination of timestamp and random values
   * Requirements: 4.1
   */
  private generateVisitorId(): string {
    // Generate a UUID-like string
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    const randomPart2 = Math.random().toString(36).substring(2, 15);
    
    return `${timestamp}-${randomPart}${randomPart2}`;
  }

  /**
   * Parse cookie string into key-value pairs
   * Requirements: 4.2
   */
  private parseCookie(cookieString: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    
    if (!cookieString) {
      return cookies;
    }

    const pairs = cookieString.split(';');
    
    for (const pair of pairs) {
      const [key, ...valueParts] = pair.split('=');
      const trimmedKey = key.trim();
      const value = valueParts.join('=').trim();
      
      if (trimmedKey) {
        try {
          cookies[decodeURIComponent(trimmedKey)] = decodeURIComponent(value);
        } catch (error) {
          // Skip malformed cookie entries
          cookies[trimmedKey] = value;
        }
      }
    }
    
    return cookies;
  }
}
