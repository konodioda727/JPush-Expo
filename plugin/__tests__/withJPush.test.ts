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

  it('should require vendorChannels.meizu.appKey to be a non-empty string', () => {
    expect(() => {
      validateProps({
        appKey: 'test-app-key',
        channel: 'test-channel',
        packageName: 'com.example.test',
        vendorChannels: {
          meizu: { appKey: '', appId: 'meizu-app-id' },
        },
      });
    }).toThrow('[MX_JPush_Expo] vendorChannels.meizu.appKey 是必填项，且必须是非空字符串');
  });

  it('should require vendorChannels.xiaomi.appId to be a non-empty string', () => {
    expect(() => {
      validateProps({
        appKey: 'test-app-key',
        channel: 'test-channel',
        packageName: 'com.example.test',
        vendorChannels: {
          xiaomi: { appId: '   ', appKey: 'xiaomi-app-key' },
        },
      });
    }).toThrow('[MX_JPush_Expo] vendorChannels.xiaomi.appId 是必填项，且必须是非空字符串');
  });

  it('should require vendorChannels.oppo.appSecret to be a non-empty string', () => {
    expect(() => {
      validateProps({
        appKey: 'test-app-key',
        channel: 'test-channel',
        packageName: 'com.example.test',
        vendorChannels: {
          oppo: {
            appKey: 'oppo-app-key',
            appId: 'oppo-app-id',
            appSecret: undefined as any,
          },
        },
      });
    }).toThrow('[MX_JPush_Expo] vendorChannels.oppo.appSecret 是必填项，且必须是非空字符串');
  });

  it('should require vendorChannels.vivo.appKey to be a non-empty string', () => {
    expect(() => {
      validateProps({
        appKey: 'test-app-key',
        channel: 'test-channel',
        packageName: 'com.example.test',
        vendorChannels: {
          vivo: { appKey: '', appId: 'vivo-app-id' },
        },
      });
    }).toThrow('[MX_JPush_Expo] vendorChannels.vivo.appKey 是必填项，且必须是非空字符串');
  });

  it('should require vendorChannels.honor.appId to be a non-empty string', () => {
    expect(() => {
      validateProps({
        appKey: 'test-app-key',
        channel: 'test-channel',
        packageName: 'com.example.test',
        vendorChannels: {
          honor: { appId: '' },
        },
      });
    }).toThrow('[MX_JPush_Expo] vendorChannels.honor.appId 是必填项，且必须是非空字符串');
  });

  it('should require vendorChannels.nio.appId to be a non-empty string', () => {
    expect(() => {
      validateProps({
        appKey: 'test-app-key',
        channel: 'test-channel',
        packageName: 'com.example.test',
        vendorChannels: {
          nio: { appId: '' },
        },
      });
    }).toThrow('[MX_JPush_Expo] vendorChannels.nio.appId 是必填项，且必须是非空字符串');
  });

  it('should accept complete vendor channel configurations', () => {
    expect(() => {
      validateProps({
        appKey: 'test-app-key',
        channel: 'test-channel',
        packageName: 'com.example.test',
        vendorChannels: {
          huawei: { enabled: true },
          fcm: { enabled: false },
          meizu: { appKey: 'meizu-app-key', appId: 'meizu-app-id' },
          xiaomi: { appId: 'xiaomi-app-id', appKey: 'xiaomi-app-key' },
          oppo: {
            appKey: 'oppo-app-key',
            appId: 'oppo-app-id',
            appSecret: 'oppo-app-secret',
          },
          vivo: { appKey: 'vivo-app-key', appId: 'vivo-app-id' },
          honor: { appId: 'honor-app-id' },
          nio: { appId: 'nio-app-id' },
        },
      });
    }).not.toThrow();
  });
});
