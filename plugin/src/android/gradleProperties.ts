/**
 * Android gradle.properties 配置
 * 处理 Gradle 8.0 版本兼容性问题
 */

import { ExpoConfig } from 'expo/config';
import { withGradleProperties } from 'expo/config-plugins';
import { ResolvedJPushPluginProps, VendorChannelConfig } from '../types';
import { getVendorChannels } from '../utils/vendorChannels';

type GradleProperty =
  | {
      type: 'comment';
      value: string;
    }
  | {
      type: 'empty';
    }
  | {
      type: 'property';
      key: string;
      value: string;
    };

export function applyAndroidGradleProperties(properties: GradleProperty[]): GradleProperty[] {
  const vendorChannels = getVendorChannels();

  if (!vendorChannels?.huawei?.enabled) {
    return properties;
  }

  console.log('\n[MX_JPush_Expo] 配置 gradle.properties 华为 AGC 兼容性（Gradle 8.0）...');

  const existingProp = properties.find(
    (prop) => prop.type === 'property' && prop.key === 'apmsInstrumentationEnabled'
  );

  if (existingProp) {
    return properties;
  }

  return [
    ...properties,
    {
      type: 'property',
      key: 'apmsInstrumentationEnabled',
      value: 'false',
    },
  ];
}

/**
 * 配置 Android gradle.properties
 *
 * 说明：
 * - 如果使用 Gradle 8.0 版本，且集成华为 AGC 插件版本低于 1.9.1.300，
 *   需要添加 apmsInstrumentationEnabled=false 来禁用 APMS 插件
 * - 当前使用的 AGC 版本为 1.9.1.301，理论上不需要此配置
 * - 但为了兼容性和避免潜在问题，仍然添加此配置
 */
export function withAndroidGradleProperties(
  config: ExpoConfig,
  props: Pick<ResolvedJPushPluginProps, 'vendorChannels'>
): ExpoConfig {
  return withGradleProperties(config, (nextConfig) => {
    if (props.vendorChannels?.huawei?.enabled === true) {
      console.log(
        '\n[MX_JPush_Expo] 配置 gradle.properties 华为 AGC 兼容性（Gradle 8.0）...'
      );

      const existingProp = nextConfig.modResults.find(
        (prop) =>
          prop.type === 'property' && prop.key === 'apmsInstrumentationEnabled'
      );

      if (!existingProp) {
        nextConfig.modResults.push({
          type: 'property',
          key: 'apmsInstrumentationEnabled',
          value: 'false',
        });
      }
    }

    return nextConfig;
  });
}
