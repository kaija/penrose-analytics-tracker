/**
 * Event Queue
 * Manages event queuing and processing with retry logic
 * Handles network failures and provides localStorage backup
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 15.4
 */

import { QueuedEvent } from './types';
import { APIClient } from './APIClient';

const STORAGE_KEY = 'analytics_event_queue';
const DEFAULT_MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

export class EventQueue {
  private queue: QueuedEvent[] = [];
  private processing: boolean = false;
  private maxRetries: number;
  private apiClient: APIClient;

  constructor(apiClient: APIClient, maxRetries: number = DEFAULT_MAX_RETRIES) {
    this.apiClient = apiClient;
    this.maxRetries = maxRetries;
    
    // Load any pending events from localStorage on initialization
    this.loadFromLocalStorage();
  }

  /**
   * Add an event to the queue
   * Requirements: 9.1
   * 
   * @param endpoint - API endpoint path
   * @param data - Event data
   */
  enqueue(endpoint: string, data: Record<string, any>): void {
    const event: QueuedEvent = {
      id: this.generateEventId(),
      endpoint,
      data,
      timestamp: Date.now(),
      retries: 0
    };

    this.queue.push(event);
    
    // Start processing if not already processing
    if (!this.processing) {
      this.process().catch(error => {
        console.warn('Analytics Tracker: Error processing queue:', error);
      });
    }
  }

  /**
   * Process all events in the queue
   * Requirements: 9.2
   * 
   * Processes events in FIFO order
   */
  async process(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;

    try {
      while (this.queue.length > 0) {
        await this.processNext();
      }
    } catch (error) {
      console.warn('Analytics Tracker: Error during queue processing:', error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Immediately send all events using Beacon API
   * Requirements: 9.4, 15.4
   * 
   * Used during page unload to ensure events are sent
   */
  flush(): void {
    // Process all events synchronously using Beacon
    const eventsToFlush = [...this.queue];
    this.queue = [];

    for (const event of eventsToFlush) {
      try {
        // Use sendEvent with useBeacon=true for reliable unload sending
        this.apiClient.sendEvent(event.endpoint, event.data, true);
      } catch (error) {
        console.warn('Analytics Tracker: Failed to flush event:', error);
        // If flush fails, save to localStorage for next session
        this.queue.push(event);
      }
    }

    // Save any failed events to localStorage
    if (this.queue.length > 0) {
      this.saveToLocalStorage();
    }
  }

  /**
   * Process the next event in the queue
   * Requirements: 9.2
   * 
   * @private
   */
  private async processNext(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    const event = this.queue[0];

    try {
      // Send the event via API client
      await this.apiClient.sendEvent(event.endpoint, event.data, false);
      
      // Success - remove from queue
      this.queue.shift();
    } catch (error) {
      console.warn('Analytics Tracker: Failed to send event, will retry:', error);
      
      // Handle retry logic
      this.retry(event);
    }
  }

  /**
   * Retry failed event with exponential backoff
   * Requirements: 9.3
   * 
   * @param event - Event that failed to send
   * @private
   */
  private retry(event: QueuedEvent): void {
    event.retries++;

    if (event.retries >= this.maxRetries) {
      // Max retries reached - remove from queue and save to localStorage
      console.warn(`Analytics Tracker: Event ${event.id} failed after ${this.maxRetries} retries. Saving to localStorage.`);
      this.queue.shift();
      this.saveToLocalStorage();
      return;
    }

    // Keep event in queue and schedule retry with exponential backoff
    const delay = RETRY_DELAYS[event.retries - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
    
    setTimeout(() => {
      // Only retry if still processing
      if (this.processing) {
        this.processNext().catch(error => {
          console.warn('Analytics Tracker: Error in retry:', error);
        });
      }
    }, delay);
  }

  /**
   * Save failed events to localStorage
   * Requirements: 15.4
   * 
   * @private
   */
  private saveToLocalStorage(): void {
    if (typeof localStorage === 'undefined') {
      console.warn('Analytics Tracker: localStorage is not available in this environment.');
      return;
    }

    try {
      const serialized = JSON.stringify(this.queue);
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch (error) {
      // Check if it's a quota exceeded error
      if (error instanceof DOMException && 
          (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        console.warn('Analytics Tracker: localStorage quota exceeded. Unable to save pending events.');
      } else {
        console.warn('Analytics Tracker: Failed to save events to localStorage:', error);
      }
    }
  }

  /**
   * Load pending events from localStorage
   * Requirements: 15.4
   * 
   * @private
   */
  private loadFromLocalStorage(): void {
    if (typeof localStorage === 'undefined') {
      console.warn('Analytics Tracker: localStorage is not available in this environment.');
      return;
    }

    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      
      if (serialized) {
        const events = JSON.parse(serialized) as QueuedEvent[];
        
        // Add loaded events to queue
        this.queue.push(...events);
        
        // Clear localStorage after loading
        localStorage.removeItem(STORAGE_KEY);
        
        // Start processing loaded events
        if (events.length > 0 && !this.processing) {
          this.process().catch(error => {
            console.warn('Analytics Tracker: Error processing loaded events:', error);
          });
        }
      }
    } catch (error) {
      console.warn('Analytics Tracker: Failed to load events from localStorage. Data may be corrupted.', error);
      // Try to clear corrupted data
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (clearError) {
        console.warn('Analytics Tracker: Failed to clear corrupted localStorage data:', clearError);
      }
    }
  }

  /**
   * Generate a unique event ID
   * 
   * @private
   * @returns Unique event ID
   */
  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
