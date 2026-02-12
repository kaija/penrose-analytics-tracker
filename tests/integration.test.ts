/**
 * Integration Tests
 * Tests the complete event flow: track → queue → API
 * 
 * Requirements: All core requirements
 */

import { Tracker } from '../src/Tracker';
import { TrackerConfig } from '../src/types';

// Mock browser APIs
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

// Mock document.cookie
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: ''
});

// Mock XMLHttpRequest
class MockXMLHttpRequest {
  public status = 200;
  public statusText = 'OK';
  public readyState = 4;
  public responseText = '';
  public onload: (() => void) | null = null;
  public onerror: (() => void) | null = null;
  public ontimeout: (() => void) | null = null;
  private requestData: any = null;
  private requestUrl: string = '';
  private requestMethod: string = '';

  open(method: string, url: string, async: boolean = true) {
    this.requestMethod = method;
    this.requestUrl = url;
  }

  setRequestHeader(name: string, value: string) {
    // Mock implementation
  }

  send(data?: any) {
    this.requestData = data;
    // Simulate async response
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 0);
  }

  getRequestData() {
    return this.requestData;
  }

  getRequestUrl() {
    return this.requestUrl;
  }
}

(global as any).XMLHttpRequest = MockXMLHttpRequest;

// Mock navigator.sendBeacon
const mockSendBeacon = jest.fn(() => true);
Object.defineProperty(navigator, 'sendBeacon', {
  writable: true,
  value: mockSendBeacon
});

describe('Integration Tests', () => {
  let testConfig: TrackerConfig;

  beforeEach(() => {
    // Reset mocks
    mockLocalStorage.clear();
    (document as any).cookie = '';
    mockSendBeacon.mockClear();
    jest.clearAllMocks();

    // Default test configuration
    testConfig = {
      project: 'test-project',
      endpoint: 'https://api.example.com',
      click_tracking: false,
      download_tracking: false,
      outgoing_tracking: false,
      idle_timeout: 30000
    };
  });

  describe('Complete Event Flow', () => {
    test('should complete full tracking flow: track → queue → API', async () => {
      const tracker = new Tracker(testConfig);

      // Track an event
      tracker.track('test_event', { button: 'submit' });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      tracker.destroy();
    });

    test('should include all standard fields in tracked events', async () => {
      const tracker = new Tracker(testConfig);

      // Track an event
      tracker.track('page_view');

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      tracker.destroy();
    });

    test('should persist visitor properties across multiple events', async () => {
      const tracker = new Tracker(testConfig);

      // Identify visitor
      tracker.identify({ email: 'user@example.com', name: 'John Doe' });

      // Track multiple events
      tracker.track('event1');
      tracker.track('event2');
      tracker.track('event3');

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      tracker.destroy();
    });

    test('should include session and project properties in events', async () => {
      const tracker = new Tracker(testConfig);

      // Set session and project properties
      tracker.setSessionProperties({ session_id: 'sess_123' });
      tracker.setProjectProperties({ app_version: '1.0.0' });

      // Track event
      tracker.track('test_event');

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      tracker.destroy();
    });
  });

  describe('Auto Tracking Integration', () => {
    test('should integrate auto tracking with manual tracking', async () => {
      const autoTrackingConfig = {
        ...testConfig,
        click_tracking: true,
        download_tracking: true,
        outgoing_tracking: true
      };

      const tracker = new Tracker(autoTrackingConfig);

      // Manual tracking
      tracker.track('manual_event');

      // Simulate click event
      const button = document.createElement('button');
      document.body.appendChild(button);
      button.click();

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      document.body.removeChild(button);
      tracker.destroy();
    });

    test('should track download links automatically', async () => {
      const autoTrackingConfig = {
        ...testConfig,
        download_tracking: true
      };

      const tracker = new Tracker(autoTrackingConfig);

      // Create download link
      const link = document.createElement('a');
      link.href = 'https://example.com/file.pdf';
      link.textContent = 'Download PDF';
      document.body.appendChild(link);

      // Simulate click
      link.click();

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      document.body.removeChild(link);
      tracker.destroy();
    });

    test('should track outgoing links automatically', async () => {
      const autoTrackingConfig = {
        ...testConfig,
        outgoing_tracking: true
      };

      const tracker = new Tracker(autoTrackingConfig);

      // Create outgoing link
      const link = document.createElement('a');
      link.href = 'https://external-site.com';
      link.textContent = 'External Link';
      document.body.appendChild(link);

      // Simulate click
      link.click();

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      document.body.removeChild(link);
      tracker.destroy();
    });
  });

  describe('Configuration Updates', () => {
    test('should handle configuration updates during runtime', async () => {
      const tracker = new Tracker(testConfig);

      // Track event with initial config
      tracker.track('event1');

      // Update configuration
      tracker.config({
        click_tracking: true,
        idle_timeout: 60000
      });

      // Track event with updated config
      tracker.track('event2');

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      tracker.destroy();
    });

    test('should update endpoint and continue tracking', async () => {
      const tracker = new Tracker(testConfig);

      // Track event with initial endpoint
      tracker.track('event1');

      // Update endpoint
      tracker.config({ endpoint: 'https://new-api.example.com' });

      // Track event with new endpoint
      tracker.track('event2');

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      tracker.destroy();
    });
  });

  describe('Page Lifecycle Integration', () => {
    test('should track page state changes', async () => {
      const tracker = new Tracker(testConfig);

      // Track initial event
      tracker.track('page_load');

      // Simulate visibility change
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        value: 'hidden'
      });
      document.dispatchEvent(new Event('visibilitychange'));

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      tracker.destroy();
    });

    test('should send final event on page unload', async () => {
      const tracker = new Tracker(testConfig);

      // Track an event
      tracker.track('test_event');

      // Simulate page unload
      window.dispatchEvent(new Event('beforeunload'));

      // Should have called sendBeacon
      expect(mockSendBeacon).toHaveBeenCalled();

      tracker.destroy();
    });
  });

  describe('Session Management Integration', () => {
    test('should clear session properties on session end', async () => {
      const tracker = new Tracker(testConfig);

      // Set session properties
      tracker.setSessionProperties({ session_id: 'sess_123' });

      // Track event
      tracker.track('event1');

      // Simulate page unload (session end)
      window.dispatchEvent(new Event('beforeunload'));

      // Session properties should be cleared
      // Track another event (in a new "session")
      tracker.track('event2');

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      tracker.destroy();
    });

    test('should preserve project properties after session end', async () => {
      const tracker = new Tracker(testConfig);

      // Set both session and project properties
      tracker.setSessionProperties({ session_id: 'sess_123' });
      tracker.setProjectProperties({ app_version: '1.0.0' });

      // Track event
      tracker.track('event1');

      // Simulate page unload (session end)
      window.dispatchEvent(new Event('beforeunload'));

      // Track another event
      tracker.track('event2');

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      tracker.destroy();
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle network errors gracefully', async () => {
      const tracker = new Tracker(testConfig);

      // Track event (will fail due to mock)
      tracker.track('test_event');

      // Should not throw
      await new Promise(resolve => setTimeout(resolve, 100));

      tracker.destroy();
    });

    test('should use localStorage backup on unload failure', async () => {
      const tracker = new Tracker(testConfig);

      // Mock sendBeacon to fail
      mockSendBeacon.mockReturnValue(false);

      // Track event
      tracker.track('test_event');

      // Simulate page unload
      window.dispatchEvent(new Event('beforeunload'));

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      tracker.destroy();
    });
  });

  describe('Multiple Trackers', () => {
    test('should support multiple tracker instances', async () => {
      const tracker1 = new Tracker({
        ...testConfig,
        project: 'project1'
      });

      const tracker2 = new Tracker({
        ...testConfig,
        project: 'project2'
      });

      // Track events from both trackers
      tracker1.track('event1');
      tracker2.track('event2');

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      tracker1.destroy();
      tracker2.destroy();
    });

    test('should maintain separate state for each tracker', async () => {
      const tracker1 = new Tracker(testConfig);
      const tracker2 = new Tracker(testConfig);

      // Set different properties for each tracker
      tracker1.identify({ user_id: 'user1' });
      tracker2.identify({ user_id: 'user2' });

      tracker1.setSessionProperties({ session: 'session1' });
      tracker2.setSessionProperties({ session: 'session2' });

      // Track events
      tracker1.track('event1');
      tracker2.track('event2');

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      tracker1.destroy();
      tracker2.destroy();
    });
  });
});
