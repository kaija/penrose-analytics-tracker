/**
 * Unit tests for APIClient
 * Tests HTTP communication, Beacon API, and URL building
 */

import { APIClient } from '../src/APIClient';
import { APIClientConfig } from '../src/types';

describe('APIClient', () => {
  let client: APIClient;
  let config: APIClientConfig;

  beforeEach(() => {
    config = {
      baseURL: 'https://api.example.com',
      project: 'test-project'
    };
    client = new APIClient(config);
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(client).toBeInstanceOf(APIClient);
    });
  });

  describe('sendEvent', () => {
    let xhrMock: any;
    let originalXHR: any;

    beforeEach(() => {
      // Mock XMLHttpRequest
      originalXHR = global.XMLHttpRequest;
      xhrMock = {
        open: jest.fn(),
        send: jest.fn(),
        setRequestHeader: jest.fn(),
        status: 200,
        statusText: 'OK',
        onload: null,
        onerror: null,
        ontimeout: null
      };
      global.XMLHttpRequest = jest.fn(() => xhrMock) as any;
    });

    afterEach(() => {
      global.XMLHttpRequest = originalXHR;
    });

    it('should send event via XHR by default', async () => {
      const data = { event: 'test_event', user: 'user123' };
      
      const sendPromise = client.sendEvent('/track/', data);
      
      // Trigger onload callback
      if (xhrMock.onload) {
        xhrMock.onload();
      }
      
      await sendPromise;
      
      expect(xhrMock.open).toHaveBeenCalledWith(
        'POST',
        'https://api.example.com/track/',
        true
      );
      expect(xhrMock.setRequestHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/json'
      );
      expect(xhrMock.send).toHaveBeenCalledWith(
        JSON.stringify({ project: 'test-project', ...data })
      );
    });

    it('should include project in payload', async () => {
      const data = { event: 'test_event' };
      
      const sendPromise = client.sendEvent('/track/', data);
      
      if (xhrMock.onload) {
        xhrMock.onload();
      }
      
      await sendPromise;
      
      const sentData = JSON.parse(xhrMock.send.mock.calls[0][0]);
      expect(sentData.project).toBe('test-project');
      expect(sentData.event).toBe('test_event');
    });

    it('should handle XHR errors', async () => {
      const data = { event: 'test_event' };
      
      const sendPromise = client.sendEvent('/track/', data);
      
      // Trigger onerror callback
      if (xhrMock.onerror) {
        xhrMock.onerror();
      }
      
      await expect(sendPromise).rejects.toThrow('Network error');
    });

    it('should handle HTTP error status codes', async () => {
      xhrMock.status = 500;
      xhrMock.statusText = 'Internal Server Error';
      
      const data = { event: 'test_event' };
      
      const sendPromise = client.sendEvent('/track/', data);
      
      if (xhrMock.onload) {
        xhrMock.onload();
      }
      
      await expect(sendPromise).rejects.toThrow('HTTP 500');
    });

    it('should handle timeout errors', async () => {
      const data = { event: 'test_event' };
      
      const sendPromise = client.sendEvent('/track/', data);
      
      // Trigger ontimeout callback
      if (xhrMock.ontimeout) {
        xhrMock.ontimeout();
      }
      
      await expect(sendPromise).rejects.toThrow('Request timeout');
    });
  });

  describe('sendEvent with Beacon', () => {
    let originalNavigator: any;
    let beaconMock: jest.Mock;

    beforeEach(() => {
      originalNavigator = global.navigator;
      beaconMock = jest.fn().mockReturnValue(true);
      
      Object.defineProperty(global, 'navigator', {
        value: { sendBeacon: beaconMock },
        writable: true,
        configurable: true
      });
    });

    afterEach(() => {
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true,
        configurable: true
      });
    });

    it('should use sendBeacon when useBeacon is true', async () => {
      const data = { event: 'test_event', user: 'user123' };
      
      await client.sendEvent('/track/', data, true);
      
      expect(beaconMock).toHaveBeenCalled();
      
      // Check the URL
      const url = beaconMock.mock.calls[0][0];
      expect(url).toContain('https://api.example.com/track/');
      
      // Check the blob
      const blob = beaconMock.mock.calls[0][1];
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should fallback to XHR when sendBeacon is not available', async () => {
      // Remove sendBeacon
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
        configurable: true
      });

      const xhrMock = {
        open: jest.fn(),
        send: jest.fn(),
        setRequestHeader: jest.fn(),
        status: 200,
        statusText: 'OK'
      };
      global.XMLHttpRequest = jest.fn(() => xhrMock) as any;

      const data = { event: 'test_event' };
      
      await client.sendEvent('/track/', data, true);
      
      // Should use synchronous XHR as fallback
      expect(xhrMock.open).toHaveBeenCalledWith(
        'POST',
        'https://api.example.com/track/',
        false // synchronous
      );
    });

    it('should fallback to XHR when sendBeacon fails', async () => {
      beaconMock.mockReturnValue(false);

      const xhrMock = {
        open: jest.fn(),
        send: jest.fn(),
        setRequestHeader: jest.fn(),
        status: 200,
        statusText: 'OK'
      };
      global.XMLHttpRequest = jest.fn(() => xhrMock) as any;

      const data = { event: 'test_event' };
      
      await client.sendEvent('/track/', data, true);
      
      expect(beaconMock).toHaveBeenCalled();
      expect(xhrMock.open).toHaveBeenCalled();
    });
  });

  describe('URL building', () => {
    it('should build URL with endpoint', () => {
      // Test through sendEvent to access private buildURL
      const xhrMock = {
        open: jest.fn(),
        send: jest.fn(),
        setRequestHeader: jest.fn(),
        status: 200,
        onload: null
      };
      global.XMLHttpRequest = jest.fn(() => xhrMock) as any;

      client.sendEvent('/track/', { event: 'test' });

      expect(xhrMock.open).toHaveBeenCalledWith(
        'POST',
        'https://api.example.com/track/',
        true
      );
    });

    it('should handle baseURL with trailing slash', () => {
      const configWithSlash: APIClientConfig = {
        baseURL: 'https://api.example.com/',
        project: 'test-project'
      };
      const clientWithSlash = new APIClient(configWithSlash);

      const xhrMock = {
        open: jest.fn(),
        send: jest.fn(),
        setRequestHeader: jest.fn(),
        status: 200,
        onload: null
      };
      global.XMLHttpRequest = jest.fn(() => xhrMock) as any;

      clientWithSlash.sendEvent('/track/', { event: 'test' });

      expect(xhrMock.open).toHaveBeenCalledWith(
        'POST',
        'https://api.example.com/track/',
        true
      );
    });

    it('should handle endpoint without leading slash', () => {
      const xhrMock = {
        open: jest.fn(),
        send: jest.fn(),
        setRequestHeader: jest.fn(),
        status: 200,
        onload: null
      };
      global.XMLHttpRequest = jest.fn(() => xhrMock) as any;

      client.sendEvent('track/', { event: 'test' });

      expect(xhrMock.open).toHaveBeenCalledWith(
        'POST',
        'https://api.example.com/track/',
        true
      );
    });
  });

  describe('parameter serialization', () => {
    it('should serialize simple parameters', () => {
      const xhrMock = {
        open: jest.fn(),
        send: jest.fn(),
        setRequestHeader: jest.fn(),
        status: 200,
        onload: null
      };
      global.XMLHttpRequest = jest.fn(() => xhrMock) as any;

      const data = {
        event: 'test_event',
        count: 42,
        active: true
      };

      client.sendEvent('/track/', data);

      const sentData = JSON.parse(xhrMock.send.mock.calls[0][0]);
      expect(sentData.event).toBe('test_event');
      expect(sentData.count).toBe(42);
      expect(sentData.active).toBe(true);
    });

    it('should serialize object parameters', () => {
      const xhrMock = {
        open: jest.fn(),
        send: jest.fn(),
        setRequestHeader: jest.fn(),
        status: 200,
        onload: null
      };
      global.XMLHttpRequest = jest.fn(() => xhrMock) as any;

      const data = {
        event: 'test_event',
        metadata: { key: 'value', nested: { deep: true } }
      };

      client.sendEvent('/track/', data);

      const sentData = JSON.parse(xhrMock.send.mock.calls[0][0]);
      expect(sentData.metadata).toEqual({ key: 'value', nested: { deep: true } });
    });

    it('should handle special characters in values', () => {
      const xhrMock = {
        open: jest.fn(),
        send: jest.fn(),
        setRequestHeader: jest.fn(),
        status: 200,
        onload: null
      };
      global.XMLHttpRequest = jest.fn(() => xhrMock) as any;

      const data = {
        event: 'test event',
        url: 'https://example.com/path?query=value&other=123',
        special: 'hello & goodbye = test'
      };

      client.sendEvent('/track/', data);

      const sentData = JSON.parse(xhrMock.send.mock.calls[0][0]);
      expect(sentData.event).toBe('test event');
      expect(sentData.url).toBe('https://example.com/path?query=value&other=123');
      expect(sentData.special).toBe('hello & goodbye = test');
    });

    it('should skip null and undefined values', () => {
      const xhrMock = {
        open: jest.fn(),
        send: jest.fn(),
        setRequestHeader: jest.fn(),
        status: 200,
        onload: null
      };
      global.XMLHttpRequest = jest.fn(() => xhrMock) as any;

      const data = {
        event: 'test_event',
        nullValue: null,
        undefinedValue: undefined,
        validValue: 'test'
      };

      client.sendEvent('/track/', data);

      const sentData = JSON.parse(xhrMock.send.mock.calls[0][0]);
      expect(sentData.event).toBe('test_event');
      expect(sentData.validValue).toBe('test');
      // null and undefined should be included in JSON
      expect('nullValue' in sentData).toBe(true);
      expect('undefinedValue' in sentData).toBe(false);
    });
  });

  describe('endpoint routing', () => {
    let xhrMock: any;

    beforeEach(() => {
      xhrMock = {
        open: jest.fn(),
        send: jest.fn(),
        setRequestHeader: jest.fn(),
        status: 200,
        onload: null
      };
      global.XMLHttpRequest = jest.fn(() => xhrMock) as any;
    });

    it('should route to /track/ endpoint', async () => {
      const sendPromise = client.sendEvent('/track/', { event: 'test' });
      if (xhrMock.onload) xhrMock.onload();
      await sendPromise;

      expect(xhrMock.open).toHaveBeenCalledWith(
        'POST',
        'https://api.example.com/track/',
        true
      );
    });

    it('should route to /identify endpoint', async () => {
      const sendPromise = client.sendEvent('/identify', { user: 'test' });
      if (xhrMock.onload) xhrMock.onload();
      await sendPromise;

      expect(xhrMock.open).toHaveBeenCalledWith(
        'POST',
        'https://api.example.com/identify',
        true
      );
    });

    it('should route to /update endpoint', async () => {
      const sendPromise = client.sendEvent('/update', { duration: 1000 });
      if (xhrMock.onload) xhrMock.onload();
      await sendPromise;

      expect(xhrMock.open).toHaveBeenCalledWith(
        'POST',
        'https://api.example.com/update',
        true
      );
    });
  });
});
