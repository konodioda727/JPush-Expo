/**
 * JPush Config Plugin Tests
 */

import { ExpoConfig } from 'expo/config';
import withJPush from '../src';
import { resolveProps, validateProps } from '../src/types';

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

  it('should default channel when it is missing', () => {
    const resolved = resolveProps({
      appKey: 'test',
      packageName: 'com.example.test',
    });

    expect(resolved.channel).toBe('developer-default');
  });

  it('should infer packageName from expo android package', () => {
    const resolved = resolveProps(
      {
        appKey: 'test',
        channel: 'test-channel',
      },
      'com.example.fromexpo'
    );

    expect(resolved.packageName).toBe('com.example.fromexpo');
  });

  it('should throw error when packageName cannot be resolved', () => {
    expect(() => {
      resolveProps({
        appKey: 'test',
      });
    }).toThrow('[MX_JPush_Expo] packageName 是必填项');
  });

  it('should throw error for invalid channel type', () => {
    expect(() => {
      resolveProps({
        appKey: 'test-app-key',
        channel: 123 as any,
        packageName: 'com.example.test',
      });
    }).toThrow('[MX_JPush_Expo] channel 必须是字符串');
  });

  it('should throw error for invalid packageName type', () => {
    expect(() => {
      resolveProps({
        appKey: 'test-app-key',
        channel: 'test-channel',
        packageName: 123 as any,
      });
    }).toThrow('[MX_JPush_Expo] packageName 必须是字符串');
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

  it('should accept config with only appKey when android.package exists', () => {
    const result = withJPush(
      {
        ...mockConfig,
        android: {
          package: 'com.example.fromconfig',
        },
      },
      {
        appKey: 'test-app-key',
      }
    );

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
