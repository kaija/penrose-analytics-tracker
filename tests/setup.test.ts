/**
 * Basic setup test to verify testing environment
 */

describe('Testing Environment', () => {
  it('should run basic tests', () => {
    expect(true).toBe(true);
  });

  it('should support TypeScript', () => {
    const value: string = 'test';
    expect(typeof value).toBe('string');
  });
});
