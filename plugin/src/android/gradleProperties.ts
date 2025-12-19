/**
 * Android gradle.properties 配置
 * 处理 Gradle 8.0 版本兼容性问题
 */

import { ConfigPlugin, withGradleProperties } from 'expo/config-plugins';
import { getVendorChannels } from '../utils/config';

/**
 * 配置 Android gradle.properties
 *
 * 说明：
 * - 如果使用 Gradle 8.0 版本，且集成华为 AGC 插件版本低于 1.9.1.300，
 *   需要添加 apmsInstrumentationEnabled=false 来禁用 APMS 插件
 * - 当前使用的 AGC 版本为 1.9.1.301，理论上不需要此配置
 * - 但为了兼容性和避免潜在问题，仍然添加此配置
 */
export const withAndroidGradleProperties: ConfigPlugin = (config) =>
  withGradleProperties(config, (config) => {
    const vendorChannels = getVendorChannels();

    // 如果启用了华为推送，添加 APMS 配置（Gradle 8.0 兼容性）
    if (vendorChannels?.huawei) {
      console.log(
        '\n[MX_JPush_Expo] 配置 gradle.properties 华为 AGC 兼容性（Gradle 8.0）...'
      );

      // 检查是否已存在该配置
      const existingProp = config.modResults.find(
        (prop) => prop.type === 'property' && prop.key === 'apmsInstrumentationEnabled'
      );

      if (!existingProp) {
        config.modResults.push({
          type: 'property',
          key: 'apmsInstrumentationEnabled',
          value: 'false',
        });
      }
    }

    return config;
  });
