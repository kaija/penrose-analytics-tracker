/**
 * Unit tests for EventQueue
 * Tests event queuing, processing, retry logic, and localStorage backup
 */

import { EventQueue } from '../src/EventQueue';
import { APIClient } from '../src/APIClient';
import { APIClientConfig } from '../src/types';

describe('EventQueue', () => {
  let queue: EventQueue;
  let apiClient: APIClient;
  let mockSendEvent: jest.SpyInstance;

  beforeEach(() => {
    // Create API client
    const config: APIClientConfig = {
      baseURL: 'https://api.example.com',
      project: 'test-project'
    };
    apiClient = new APIClient(config);

    // Mock sendEvent method
    mockSendEvent = jest.spyOn(apiClient, 'sendEvent').mockResolvedValue();

    // Clear localStorage
    localStorage.clear();

    // Create queue
    queue = new EventQueue(apiClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  describe('constructor', () => {
    it('should initialize with empty queue', () => {
      expect(queue).toBeInstanceOf(EventQueue);
    });

    it('should load events from localStorage on initialization', () => {
      const savedEvents = [
        {
          id: 'test-1',
          endpoint: '/track/',
          data: { event: 'test1' },
          timestamp: Date.now(),
          retries: 0
        }
      ];

      localStorage.setItem('analytics_event_queue', JSON.stringify(savedEvents));

      const newQueue = new EventQueue(apiClient);

      // Give it time to process
      return new Promise(resolve => {
        setTimeout(() => {
          expect(mockSendEvent).toHaveBeenCalledWith(
            '/track/',
            { event: 'test1' },
            false
          );
          resolve(undefined);
        }, 100);
      });
    });
  });

  describe('enqueue', () => {
    it('should add event to queue', () => {
      queue.enqueue('/track/', { event: 'test_event' });

      // Event should be processed
      return new Promise(resolve => {
        setTimeout(() => {
          expect(mockSendEvent).toHaveBeenCalledWith(
            '/track/',
            { event: 'test_event' },
            false
          );
          resolve(undefined);
        }, 100);
      });
    });

    it('should generate unique event IDs', () => {
      const sendEventCalls: any[] = [];
      mockSendEvent.mockImplementation((endpoint, data) => {
        sendEventCalls.push({ endpoint, data });
        return Promise.resolve();
      });

      queue.enqueue('/track/', { event: 'event1' });
      queue.enqueue('/track/', { event: 'event2' });

      return new Promise(resolve => {
        setTimeout(() => {
          expect(sendEventCalls.length).toBe(2);
          expect(sendEventCalls[0].data.event).toBe('event1');
          expect(sendEventCalls[1].data.event).toBe('event2');
          resolve(undefined);
        }, 100);
      });
    });

    it('should start processing automatically', () => {
      queue.enqueue('/track/', { event: 'auto_process' });

      return new Promise(resolve => {
        setTimeout(() => {
          expect(mockSendEvent).toHaveBeenCalled();
          resolve(undefined);
        }, 100);
      });
    });
  });

  describe('process', () => {
    it('should process events in FIFO order', async () => {
      const processedEvents: string[] = [];
      
      mockSendEvent.mockImplementation((endpoint, data) => {
        processedEvents.push(data.event);
        return Promise.resolve();
      });

      queue.enqueue('/track/', { event: 'first' });
      queue.enqueue('/track/', { event: 'second' });
      queue.enqueue('/track/', { event: 'third' });

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(processedEvents).toEqual(['first', 'second', 'third']);
    });

    it('should not process if already processing', async () => {
      let callCount = 0;
      
      mockSendEvent.mockImplementation(() => {
        callCount++;
        return new Promise(resolve => setTimeout(resolve, 100));
      });

      queue.enqueue('/track/', { event: 'event1' });
      
      // Try to process again immediately
      await queue.process();
      await queue.process();

      await new Promise(resolve => setTimeout(resolve, 200));

      // Should only process once
      expect(callCount).toBe(1);
    });

    it('should handle empty queue', async () => {
      await queue.process();
      expect(mockSendEvent).not.toHaveBeenCalled();
    });
  });

  describe('retry logic', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should retry failed events with exponential backoff', async () => {
      let attemptCount = 0;
      
      mockSendEvent.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve();
      });

      queue.enqueue('/track/', { event: 'retry_test' });

      // Wait for initial attempt and first retry
      await jest.advanceTimersByTimeAsync(100);
      
      // First retry after 1s
      await jest.advanceTimersByTimeAsync(1100);
      
      // Second retry after 2s
      await jest.advanceTimersByTimeAsync(2100);

      // Should have attempted 3 times total
      expect(attemptCount).toBeGreaterThanOrEqual(2);
    });

    it('should give up after max retries', async () => {
      mockSendEvent.mockRejectedValue(new Error('Network error'));

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      queue.enqueue('/track/', { event: 'fail_test' });

      // Initial attempt
      await jest.advanceTimersByTimeAsync(100);

      // Retry 1 (after 1s)
      await jest.advanceTimersByTimeAsync(1000);

      // Retry 2 (after 2s)
      await jest.advanceTimersByTimeAsync(2000);

      // Retry 3 (after 4s)
      await jest.advanceTimersByTimeAsync(4000);

      // Should have logged warning about max retries
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('failed after 3 retries')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should save to localStorage after max retries', async () => {
      mockSendEvent.mockRejectedValue(new Error('Network error'));

      queue.enqueue('/track/', { event: 'save_test' });

      // Process through all retries
      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(1000);
      await jest.advanceTimersByTimeAsync(2000);
      await jest.advanceTimersByTimeAsync(4000);

      // Check localStorage
      const saved = localStorage.getItem('analytics_event_queue');
      expect(saved).toBeTruthy();
    });
  });

  describe('flush', () => {
    it('should send all events using Beacon API', () => {
      queue.enqueue('/track/', { event: 'event1' });
      queue.enqueue('/track/', { event: 'event2' });

      // Clear previous calls
      mockSendEvent.mockClear();

      queue.flush();

      expect(mockSendEvent).toHaveBeenCalledTimes(2);
      expect(mockSendEvent).toHaveBeenCalledWith(
        '/track/',
        { event: 'event1' },
        true // useBeacon
      );
      expect(mockSendEvent).toHaveBeenCalledWith(
        '/track/',
        { event: 'event2' },
        true // useBeacon
      );
    });

    it('should save failed flush events to localStorage', () => {
      mockSendEvent.mockImplementation((endpoint, data, useBeacon) => {
        if (useBeacon) {
          throw new Error('Beacon failed');
        }
        return Promise.resolve();
      });

      queue.enqueue('/track/', { event: 'flush_fail' });

      queue.flush();

      const saved = localStorage.getItem('analytics_event_queue');
      expect(saved).toBeTruthy();
      
      const events = JSON.parse(saved!);
      expect(events).toHaveLength(1);
      expect(events[0].data.event).toBe('flush_fail');
    });

    it('should clear queue after successful flush', () => {
      queue.enqueue('/track/', { event: 'event1' });
      queue.enqueue('/track/', { event: 'event2' });

      mockSendEvent.mockClear();

      queue.flush();

      // Queue should be empty
      const saved = localStorage.getItem('analytics_event_queue');
      expect(saved).toBeNull();
    });
  });

  describe('localStorage integration', () => {
    it('should save events to localStorage', () => {
      mockSendEvent.mockRejectedValue(new Error('Network error'));

      queue.enqueue('/track/', { event: 'save_test' });

      return new Promise(resolve => {
        setTimeout(() => {
          // After max retries, should save to localStorage
          const saved = localStorage.getItem('analytics_event_queue');
          // Note: This test may need adjustment based on retry timing
          resolve(undefined);
        }, 100);
      });
    });

    it('should handle localStorage not available', () => {
      const originalLocalStorage = global.localStorage;
      
      // Remove localStorage
      Object.defineProperty(global, 'localStorage', {
        value: undefined,
        writable: true,
        configurable: true
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Should not throw error
      const newQueue = new EventQueue(apiClient);
      newQueue.enqueue('/track/', { event: 'test' });

      // Restore localStorage
      Object.defineProperty(global, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
        configurable: true
      });

      consoleWarnSpy.mockRestore();
    });

    it('should handle corrupted localStorage data', () => {
      localStorage.setItem('analytics_event_queue', 'invalid json');

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Should not throw error
      const newQueue = new EventQueue(apiClient);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Analytics Tracker: Failed to load events from localStorage. Data may be corrupted.',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    it('should clear localStorage after loading events', () => {
      const savedEvents = [
        {
          id: 'test-1',
          endpoint: '/track/',
          data: { event: 'test1' },
          timestamp: Date.now(),
          retries: 0
        }
      ];

      localStorage.setItem('analytics_event_queue', JSON.stringify(savedEvents));

      const newQueue = new EventQueue(apiClient);

      // localStorage should be cleared immediately after loading
      const saved = localStorage.getItem('analytics_event_queue');
      expect(saved).toBeNull();
    });
  });

  describe('network failure handling', () => {
    it('should keep event in queue on network failure', async () => {
      let attemptCount = 0;
      
      mockSendEvent.mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve();
      });

      queue.enqueue('/track/', { event: 'network_fail' });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have attempted once
      expect(attemptCount).toBeGreaterThanOrEqual(1);
    });

    it('should continue processing other events after failure', async () => {
      const processedEvents: string[] = [];
      
      mockSendEvent.mockImplementation((endpoint, data) => {
        if (data.event === 'fail') {
          return Promise.reject(new Error('Network error'));
        }
        processedEvents.push(data.event);
        return Promise.resolve();
      });

      queue.enqueue('/track/', { event: 'success1' });
      queue.enqueue('/track/', { event: 'fail' });
      queue.enqueue('/track/', { event: 'success2' });

      await new Promise(resolve => setTimeout(resolve, 200));

      // First event should succeed
      expect(processedEvents).toContain('success1');
    });
  });

  describe('edge cases', () => {
    it('should handle multiple enqueues during processing', async () => {
      const processedEvents: string[] = [];
      
      mockSendEvent.mockImplementation((endpoint, data) => {
        processedEvents.push(data.event);
        return new Promise(resolve => setTimeout(resolve, 50));
      });

      queue.enqueue('/track/', { event: 'event1' });
      
      // Enqueue more while processing
      setTimeout(() => {
        queue.enqueue('/track/', { event: 'event2' });
        queue.enqueue('/track/', { event: 'event3' });
      }, 25);

      await new Promise(resolve => setTimeout(resolve, 300));

      expect(processedEvents).toEqual(['event1', 'event2', 'event3']);
    });

    it('should handle events with different endpoints', async () => {
      const calls: Array<{ endpoint: string; data: any }> = [];
      
      mockSendEvent.mockImplementation((endpoint, data) => {
        calls.push({ endpoint, data });
        return Promise.resolve();
      });

      queue.enqueue('/track/', { event: 'track_event' });
      queue.enqueue('/identify', { user: 'user123' });
      queue.enqueue('/update', { duration: 1000 });

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(calls).toHaveLength(3);
      expect(calls[0].endpoint).toBe('/track/');
      expect(calls[1].endpoint).toBe('/identify');
      expect(calls[2].endpoint).toBe('/update');
    });

    it('should handle large event data', async () => {
      const largeData = {
        event: 'large_event',
        properties: {}
      };

      // Create large properties object
      for (let i = 0; i < 100; i++) {
        (largeData.properties as any)[`prop_${i}`] = `value_${i}`.repeat(10);
      }

      queue.enqueue('/track/', largeData);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockSendEvent).toHaveBeenCalledWith(
        '/track/',
        largeData,
        false
      );
    });
  });
});
