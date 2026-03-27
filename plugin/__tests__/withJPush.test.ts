/**
 * JPush Config Plugin Tests
 */

import { ExpoConfig } from 'expo/config';
import withJPush from '../src';
import { validateProps } from '../src/types';

describe('withJPush', () => {
  const mockConfig: ExpoConfig = {
    name: 'test-app',
    slug: 'test-app',
    version: '1.0.0',
  };

  it('should throw error when appKey is missing', () => {
    expect(() => {
      validateProps({
        channel: 'test',
        packageName: 'com.example.test',
      } as any);
    }).toThrow('[MX_JPush_Expo] appKey 是必填项');
  });

  it('should throw error when channel is missing', () => {
    expect(() => {
      validateProps({
        appKey: 'test',
        packageName: 'com.example.test',
      } as any);
    }).toThrow('[MX_JPush_Expo] channel 是必填项');
  });

  it('should accept valid configuration', () => {
    const result = withJPush(mockConfig, {
      appKey: 'test-app-key',
      channel: 'test-channel',
      packageName: 'com.example.test',
    });

    expect(result).toBeDefined();
    expect(result.name).toBe('test-app');
  });

  it('should accept optional apsForProduction parameter', () => {
    const result = withJPush(mockConfig, {
      appKey: 'test-app-key',
      channel: 'test-channel',
      packageName: 'com.example.test',
      apsForProduction: false,
    });

    expect(result).toBeDefined();
  });

  it('should throw error for invalid apsForProduction type', () => {
    expect(() => {
      validateProps({
        appKey: 'test-app-key',
        channel: 'test-channel',
        packageName: 'com.example.test',
        apsForProduction: 'invalid' as any,
      });
    }).toThrow('[MX_JPush_Expo] apsForProduction 必须是布尔值');
  });

  it('should require vendorChannels.huawei.enabled when Huawei config is present', () => {
    expect(() => {
      validateProps({
        appKey: 'test-app-key',
        channel: 'test-channel',
        packageName: 'com.example.test',
        vendorChannels: {
          huawei: {} as any,
        },
      });
    }).toThrow('[MX_JPush_Expo] vendorChannels.huawei.enabled 必须存在且为布尔值');
  });

  it('should require vendorChannels.fcm.enabled to be a boolean when FCM config is present', () => {
    expect(() => {
      validateProps({
        appKey: 'test-app-key',
        channel: 'test-channel',
        packageName: 'com.example.test',
        vendorChannels: {
          fcm: { enabled: 'true' as any },
        },
      });
    }).toThrow('[MX_JPush_Expo] vendorChannels.fcm.enabled 必须存在且为布尔值');
  });
});
