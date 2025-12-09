/**
 * JPush Config Plugin Tests
 */

import { ExpoConfig } from 'expo/config';
import withJPush from '../src';

describe('withJPush', () => {
  const mockConfig: ExpoConfig = {
    name: 'test-app',
    slug: 'test-app',
    version: '1.0.0',
  };

  it('should throw error when appKey is missing', () => {
    expect(() => {
      withJPush(mockConfig, { channel: 'test' } as any);
    }).toThrow('[MX_JPush_Expo] appKey 是必填项');
  });

  it('should throw error when channel is missing', () => {
    expect(() => {
      withJPush(mockConfig, { appKey: 'test' } as any);
    }).toThrow('[MX_JPush_Expo] channel 是必填项');
  });

  it('should accept valid configuration', () => {
    const result = withJPush(mockConfig, {
      appKey: 'test-app-key',
      channel: 'test-channel',
    });

    expect(result).toBeDefined();
    expect(result.name).toBe('test-app');
  });

  it('should accept optional apsForProduction parameter', () => {
    const result = withJPush(mockConfig, {
      appKey: 'test-app-key',
      channel: 'test-channel',
      apsForProduction: false,
    });

    expect(result).toBeDefined();
  });

  it('should throw error for invalid apsForProduction type', () => {
    expect(() => {
      withJPush(mockConfig, {
        appKey: 'test-app-key',
        channel: 'test-channel',
        apsForProduction: 'invalid' as any,
      });
    }).toThrow('[MX_JPush_Expo] apsForProduction 必须是布尔值');
  });
});
