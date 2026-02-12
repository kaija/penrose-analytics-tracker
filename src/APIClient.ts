/**
 * API Client
 * Handles communication with the backend API
 * Supports both XMLHttpRequest and Beacon API for reliable data transmission
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.5, 15.1, 15.2
 */

import { APIClientConfig } from './types';

export class APIClient {
  private config: APIClientConfig;

  constructor(config: APIClientConfig) {
    this.config = config;
  }

  /**
   * Send an event to the backend API
   * Supports both XHR and Beacon methods
   * Requirements: 15.1, 15.2
   * 
   * @param endpoint - API endpoint path (e.g., '/track/', '/identify', '/update')
   * @param data - Event data to send
   * @param useBeacon - Whether to use sendBeacon API (default: false)
   */
  async sendEvent(
    endpoint: string,
    data: Record<string, any>,
    useBeacon: boolean = false
  ): Promise<void> {
    // Add project to data if not already present
    const payload = {
      project: this.config.project,
      ...data
    };

    if (useBeacon) {
      // Try sendBeacon first for page unload scenarios
      const url = this.buildURL(endpoint, payload);
      const success = this.sendViaBeacon(url, payload);
      
      if (!success) {
        // Fallback to synchronous XHR if beacon fails
        console.warn('Analytics Tracker: sendBeacon failed, falling back to synchronous XHR.');
        try {
          await this.sendViaXHR(endpoint, payload, true);
        } catch (error) {
          console.warn('Analytics Tracker: Failed to send event via XHR fallback:', error);
          throw error;
        }
      }
    } else {
      // Use regular XHR for normal requests
      try {
        await this.sendViaXHR(endpoint, payload);
      } catch (error) {
        console.warn('Analytics Tracker: Network error while sending event:', error);
        throw error;
      }
    }
  }

  /**
   * Build full URL with query parameters
   * Requirements: 12.5
   * 
   * @param endpoint - API endpoint path
   * @param params - Query parameters
   * @returns Full URL with serialized parameters
   */
  private buildURL(endpoint: string, params: Record<string, any>): string {
    const baseURL = this.config.baseURL.replace(/\/$/, ''); // Remove trailing slash
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const queryString = this.serializeParams(params);
    
    return queryString ? `${baseURL}${path}?${queryString}` : `${baseURL}${path}`;
  }

  /**
   * Send data using the Beacon API
   * Requirements: 15.1
   * 
   * @param url - Full URL to send to
   * @param data - Data payload
   * @returns true if beacon was queued successfully, false otherwise
   */
  private sendViaBeacon(url: string, data: Record<string, any>): boolean {
    // Check if sendBeacon is available
    if (typeof navigator === 'undefined' || !navigator.sendBeacon) {
      console.warn('Analytics Tracker: sendBeacon API is not available in this browser.');
      return false;
    }

    try {
      // sendBeacon accepts Blob, FormData, or string
      // We'll use JSON string with proper content type
      const blob = new Blob([JSON.stringify(data)], {
        type: 'application/json'
      });
      
      const success = navigator.sendBeacon(url, blob);
      
      if (!success) {
        console.warn('Analytics Tracker: sendBeacon returned false, possibly due to size limits or browser restrictions.');
      }
      
      return success;
    } catch (error) {
      console.warn('Analytics Tracker: sendBeacon failed with error:', error);
      return false;
    }
  }

  /**
   * Send data using XMLHttpRequest
   * Requirements: 15.2
   * 
   * @param endpoint - API endpoint path
   * @param data - Data payload
   * @param synchronous - Whether to use synchronous request (for page unload)
   */
  private async sendViaXHR(
    endpoint: string,
    data: Record<string, any>,
    synchronous: boolean = false
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const xhr = new XMLHttpRequest();
        const url = this.buildURL(endpoint, {});
        
        // Use POST for sending data
        xhr.open('POST', url, !synchronous);
        
        // Set headers
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        if (!synchronous) {
          // Async request handlers
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              const error = new Error(`Analytics Tracker: HTTP ${xhr.status}: ${xhr.statusText}`);
              console.warn(error.message);
              reject(error);
            }
          };
          
          xhr.onerror = () => {
            const error = new Error('Analytics Tracker: Network error occurred while sending event.');
            console.warn(error.message);
            reject(error);
          };
          
          xhr.ontimeout = () => {
            const error = new Error('Analytics Tracker: Request timeout while sending event.');
            console.warn(error.message);
            reject(error);
          };
        }
        
        xhr.send(JSON.stringify(data));
        
        // For synchronous requests, resolve immediately
        if (synchronous) {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            const error = new Error(`Analytics Tracker: HTTP ${xhr.status}: ${xhr.statusText}`);
            console.warn(error.message);
            reject(error);
          }
        }
      } catch (error) {
        console.warn('Analytics Tracker: Failed to send XHR request:', error);
        reject(error);
      }
    });
  }

  /**
   * Serialize parameters to URL query string
   * Requirements: 12.5
   * 
   * @param params - Parameters to serialize
   * @returns URL-encoded query string
   */
  private serializeParams(params: Record<string, any>): string {
    const pairs: string[] = [];
    
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined) {
        continue;
      }
      
      // Handle different value types
      let serializedValue: string;
      
      if (typeof value === 'object') {
        // Serialize objects and arrays as JSON
        serializedValue = JSON.stringify(value);
      } else {
        serializedValue = String(value);
      }
      
      pairs.push(
        `${encodeURIComponent(key)}=${encodeURIComponent(serializedValue)}`
      );
    }
    
    return pairs.join('&');
  }
}
