/**
 * AutoTracker Unit Tests
 * Tests for automatic tracking of clicks, downloads, and outgoing links
 */

import { AutoTracker } from '../src/AutoTracker';
import { AutoTrackerConfig } from '../src/types';

describe('AutoTracker', () => {
  let mockTrackCallback: jest.Mock;
  let autoTracker: AutoTracker;

  beforeEach(() => {
    mockTrackCallback = jest.fn();
    // Clear document body
    document.body.innerHTML = '';
  });

  afterEach(() => {
    if (autoTracker) {
      autoTracker.destroy();
    }
  });

  describe('Initialization and Lifecycle', () => {
    test('should initialize with click tracking enabled', () => {
      const config: AutoTrackerConfig = {
        click_tracking: true,
        download_tracking: false,
        outgoing_tracking: false
      };

      autoTracker = new AutoTracker(mockTrackCallback, config);
      autoTracker.init();

      // Create and click an element
      const button = document.createElement('button');
      button.textContent = 'Click me';
      document.body.appendChild(button);

      button.click();

      expect(mockTrackCallback).toHaveBeenCalledWith('click', expect.objectContaining({
        tag: 'button',
        text: 'Click me'
      }));
    });

    test('should clean up event listeners on destroy', () => {
      const config: AutoTrackerConfig = {
        click_tracking: true,
        download_tracking: false,
        outgoing_tracking: false
      };

      autoTracker = new AutoTracker(mockTrackCallback, config);
      autoTracker.init();
      autoTracker.destroy();

      // Click after destroy should not trigger callback
      const button = document.createElement('button');
      document.body.appendChild(button);
      button.click();

      expect(mockTrackCallback).not.toHaveBeenCalled();
    });
  });

  describe('Click Tracking', () => {
    beforeEach(() => {
      const config: AutoTrackerConfig = {
        click_tracking: true,
        download_tracking: false,
        outgoing_tracking: false
      };
      autoTracker = new AutoTracker(mockTrackCallback, config);
      autoTracker.init();
    });

    test('should track button clicks', () => {
      const button = document.createElement('button');
      button.id = 'test-button';
      button.className = 'btn primary';
      button.textContent = 'Submit';
      document.body.appendChild(button);

      button.click();

      expect(mockTrackCallback).toHaveBeenCalledWith('click', {
        tag: 'button',
        text: 'Submit',
        id: 'test-button',
        class: 'btn primary'
      });
    });

    test('should track link clicks', () => {
      const link = document.createElement('a');
      link.href = '/page';
      link.textContent = 'Go to page';
      document.body.appendChild(link);

      link.click();

      expect(mockTrackCallback).toHaveBeenCalledWith('click', expect.objectContaining({
        url: expect.stringContaining('/page'),
        text: 'Go to page'
      }));
    });

    test('should handle clicks on nested elements', () => {
      const link = document.createElement('a');
      link.href = '/page';
      const span = document.createElement('span');
      span.textContent = 'Click here';
      link.appendChild(span);
      document.body.appendChild(link);

      // Click on the span inside the link
      span.click();

      expect(mockTrackCallback).toHaveBeenCalledWith('click', expect.objectContaining({
        url: expect.stringContaining('/page')
      }));
    });

    test('should not track clicks when click_tracking is disabled', () => {
      autoTracker.destroy();
      
      const config: AutoTrackerConfig = {
        click_tracking: false,
        download_tracking: false,
        outgoing_tracking: false
      };
      autoTracker = new AutoTracker(mockTrackCallback, config);
      autoTracker.init();

      const button = document.createElement('button');
      document.body.appendChild(button);
      button.click();

      expect(mockTrackCallback).not.toHaveBeenCalled();
    });
  });

  describe('Download Tracking', () => {
    beforeEach(() => {
      const config: AutoTrackerConfig = {
        click_tracking: false,
        download_tracking: true,
        outgoing_tracking: false
      };
      autoTracker = new AutoTracker(mockTrackCallback, config);
      autoTracker.init();
    });

    test('should identify PDF links as downloads', () => {
      const link = document.createElement('a');
      link.href = 'https://example.com/document.pdf';
      link.textContent = 'Download PDF';
      document.body.appendChild(link);

      link.click();

      expect(mockTrackCallback).toHaveBeenCalledWith('download', expect.objectContaining({
        url: 'https://example.com/document.pdf',
        file_type: 'pdf'
      }));
    });

    test('should identify various file extensions as downloads', () => {
      const extensions = ['zip', 'doc', 'xls', 'ppt', 'mp3', 'mp4', 'jpg'];

      extensions.forEach(ext => {
        mockTrackCallback.mockClear();
        
        const link = document.createElement('a');
        link.href = `https://example.com/file.${ext}`;
        document.body.appendChild(link);

        link.click();

        expect(mockTrackCallback).toHaveBeenCalledWith('download', expect.objectContaining({
          file_type: ext
        }));
      });
    });

    test('should identify links with download attribute', () => {
      const link = document.createElement('a');
      link.href = 'https://example.com/file.txt';
      link.setAttribute('download', '');
      document.body.appendChild(link);

      link.click();

      expect(mockTrackCallback).toHaveBeenCalledWith('download', expect.objectContaining({
        url: 'https://example.com/file.txt'
      }));
    });

    test('should handle download links with query parameters', () => {
      const link = document.createElement('a');
      link.href = 'https://example.com/document.pdf?version=2&token=abc123';
      document.body.appendChild(link);

      link.click();

      expect(mockTrackCallback).toHaveBeenCalledWith('download', expect.objectContaining({
        file_type: 'pdf'
      }));
    });

    test('should handle download links with hash fragments', () => {
      const link = document.createElement('a');
      link.href = 'https://example.com/document.pdf#page=5';
      document.body.appendChild(link);

      link.click();

      expect(mockTrackCallback).toHaveBeenCalledWith('download', expect.objectContaining({
        file_type: 'pdf'
      }));
    });

    test('should not track non-download links', () => {
      const link = document.createElement('a');
      link.href = 'https://example.com/page.html';
      document.body.appendChild(link);

      link.click();

      expect(mockTrackCallback).not.toHaveBeenCalled();
    });
  });

  describe('Outgoing Link Tracking', () => {
    beforeEach(() => {
      const config: AutoTrackerConfig = {
        click_tracking: false,
        download_tracking: false,
        outgoing_tracking: true
      };
      autoTracker = new AutoTracker(mockTrackCallback, config);
      autoTracker.init();
    });

    test('should identify external links as outgoing', () => {
      const link = document.createElement('a');
      link.href = 'https://external.com/page';
      link.textContent = 'External Link';
      document.body.appendChild(link);

      link.click();

      expect(mockTrackCallback).toHaveBeenCalledWith('outgoing', expect.objectContaining({
        url: 'https://external.com/page',
        text: 'External Link'
      }));
    });

    test('should not track internal links as outgoing', () => {
      const link = document.createElement('a');
      link.href = window.location.origin + '/internal-page';
      document.body.appendChild(link);

      link.click();

      expect(mockTrackCallback).not.toHaveBeenCalled();
    });

    test('should not track relative links as outgoing', () => {
      const link = document.createElement('a');
      link.href = '/relative-page';
      document.body.appendChild(link);

      link.click();

      expect(mockTrackCallback).not.toHaveBeenCalled();
    });

    test('should track different domains as outgoing', () => {
      const link = document.createElement('a');
      link.href = 'https://different-domain.com';
      document.body.appendChild(link);

      link.click();

      expect(mockTrackCallback).toHaveBeenCalledWith('outgoing', expect.objectContaining({
        url: expect.stringContaining('https://different-domain.com')
      }));
    });
  });

  describe('Priority and Combined Tracking', () => {
    test('should prioritize download tracking over outgoing tracking', () => {
      const config: AutoTrackerConfig = {
        click_tracking: false,
        download_tracking: true,
        outgoing_tracking: true
      };
      autoTracker = new AutoTracker(mockTrackCallback, config);
      autoTracker.init();

      // External download link
      const link = document.createElement('a');
      link.href = 'https://external.com/file.pdf';
      document.body.appendChild(link);

      link.click();

      // Should track as download, not outgoing
      expect(mockTrackCallback).toHaveBeenCalledWith('download', expect.any(Object));
      expect(mockTrackCallback).not.toHaveBeenCalledWith('outgoing', expect.any(Object));
    });

    test('should track all enabled features', () => {
      const config: AutoTrackerConfig = {
        click_tracking: true,
        download_tracking: true,
        outgoing_tracking: true
      };
      autoTracker = new AutoTracker(mockTrackCallback, config);
      autoTracker.init();

      // Regular button click
      const button = document.createElement('button');
      document.body.appendChild(button);
      button.click();
      expect(mockTrackCallback).toHaveBeenCalledWith('click', expect.any(Object));

      mockTrackCallback.mockClear();

      // Download link
      const downloadLink = document.createElement('a');
      downloadLink.href = 'https://example.com/file.pdf';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      expect(mockTrackCallback).toHaveBeenCalledWith('download', expect.any(Object));

      mockTrackCallback.mockClear();

      // Outgoing link
      const outgoingLink = document.createElement('a');
      outgoingLink.href = 'https://external.com/page';
      document.body.appendChild(outgoingLink);
      outgoingLink.click();
      expect(mockTrackCallback).toHaveBeenCalledWith('outgoing', expect.any(Object));
    });
  });

  describe('Link Information Extraction', () => {
    beforeEach(() => {
      const config: AutoTrackerConfig = {
        click_tracking: true,
        download_tracking: false,
        outgoing_tracking: false
      };
      autoTracker = new AutoTracker(mockTrackCallback, config);
      autoTracker.init();
    });

    test('should extract link target attribute', () => {
      const link = document.createElement('a');
      link.href = 'https://example.com';
      link.target = '_blank';
      document.body.appendChild(link);

      link.click();

      expect(mockTrackCallback).toHaveBeenCalledWith('click', expect.objectContaining({
        target: '_blank'
      }));
    });

    test('should extract link id and class', () => {
      const link = document.createElement('a');
      link.href = 'https://example.com';
      link.id = 'my-link';
      link.className = 'nav-link active';
      document.body.appendChild(link);

      link.click();

      expect(mockTrackCallback).toHaveBeenCalledWith('click', expect.objectContaining({
        id: 'my-link',
        class: 'nav-link active'
      }));
    });

    test('should handle links without id or class', () => {
      const link = document.createElement('a');
      link.href = 'https://example.com';
      document.body.appendChild(link);

      link.click();

      expect(mockTrackCallback).toHaveBeenCalledWith('click', expect.objectContaining({
        url: expect.stringContaining('https://example.com'),
        id: undefined,
        class: undefined
      }));
    });

    test('should trim and extract link text', () => {
      const link = document.createElement('a');
      link.href = 'https://example.com';
      link.textContent = '  Click here  ';
      document.body.appendChild(link);

      link.click();

      expect(mockTrackCallback).toHaveBeenCalledWith('click', expect.objectContaining({
        text: 'Click here'
      }));
    });
  });

  describe('Error Handling', () => {
    test('should handle errors gracefully during click handling', () => {
      const config: AutoTrackerConfig = {
        click_tracking: true,
        download_tracking: false,
        outgoing_tracking: false
      };

      // Mock callback that throws error
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });

      autoTracker = new AutoTracker(errorCallback, config);
      autoTracker.init();

      const button = document.createElement('button');
      document.body.appendChild(button);

      // Should not throw
      expect(() => button.click()).not.toThrow();
    });

    test('should handle malformed URLs gracefully', () => {
      const config: AutoTrackerConfig = {
        click_tracking: false,
        download_tracking: true,
        outgoing_tracking: false
      };
      autoTracker = new AutoTracker(mockTrackCallback, config);
      autoTracker.init();

      const link = document.createElement('a');
      // Set href to something that might cause issues
      link.setAttribute('href', 'javascript:void(0)');
      document.body.appendChild(link);

      // Should not throw
      expect(() => link.click()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty link text', () => {
      const config: AutoTrackerConfig = {
        click_tracking: true,
        download_tracking: false,
        outgoing_tracking: false
      };
      autoTracker = new AutoTracker(mockTrackCallback, config);
      autoTracker.init();

      const link = document.createElement('a');
      link.href = 'https://example.com';
      link.textContent = '';
      document.body.appendChild(link);

      link.click();

      expect(mockTrackCallback).toHaveBeenCalledWith('click', expect.objectContaining({
        text: ''
      }));
    });

    test('should handle very long element text', () => {
      const config: AutoTrackerConfig = {
        click_tracking: true,
        download_tracking: false,
        outgoing_tracking: false
      };
      autoTracker = new AutoTracker(mockTrackCallback, config);
      autoTracker.init();

      const div = document.createElement('div');
      div.textContent = 'a'.repeat(200);
      document.body.appendChild(div);

      div.click();

      expect(mockTrackCallback).toHaveBeenCalledWith('click', expect.objectContaining({
        text: expect.stringMatching(/^a{100}$/)
      }));
    });

    test('should handle links without href', () => {
      const config: AutoTrackerConfig = {
        click_tracking: true,
        download_tracking: false,
        outgoing_tracking: false
      };
      autoTracker = new AutoTracker(mockTrackCallback, config);
      autoTracker.init();

      const link = document.createElement('a');
      // No href set
      document.body.appendChild(link);

      link.click();

      // Should track as general click, not as link
      expect(mockTrackCallback).toHaveBeenCalledWith('click', expect.objectContaining({
        tag: 'a'
      }));
    });
  });
});
