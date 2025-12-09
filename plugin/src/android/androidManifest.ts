/**
 * Android AndroidManifest.xml 配置
 * 添加 JPush AppKey 和 Channel
 */

import { AndroidConfig, ConfigPlugin, withAndroidManifest } from 'expo/config-plugins';

/**
 * 配置 Android AndroidManifest
 * 添加 JPUSH_APPKEY 和 JPUSH_CHANNEL meta-data
 */
export const withAndroidManifestConfig: ConfigPlugin = (config) =>
  withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];

    if (!application) {
      throw new Error('[MX_JPush_Expo] 未找到 AndroidManifest application 节点');
    }

    // 添加 JPUSH_CHANNEL
    if (
      AndroidConfig.Manifest.findMetaDataItem(application, 'JPUSH_CHANNEL') ===
      -1
    ) {
      console.log('\n[MX_JPush_Expo] 配置 AndroidManifest JPUSH_CHANNEL ...');
      AndroidConfig.Manifest.addMetaDataItemToMainApplication(
        application,
        'JPUSH_CHANNEL',
        '${JPUSH_CHANNEL}'
      );
    }

    // 添加 JPUSH_APPKEY
    if (
      AndroidConfig.Manifest.findMetaDataItem(application, 'JPUSH_APPKEY') ===
      -1
    ) {
      console.log('\n[MX_JPush_Expo] 配置 AndroidManifest JPUSH_APPKEY ...');
      AndroidConfig.Manifest.addMetaDataItemToMainApplication(
        application,
        'JPUSH_APPKEY',
        '${JPUSH_APPKEY}'
      );
    }

    return config;
  });
