/**
 * iOS Info.plist 配置
 * 参考: https://juejin.cn/post/7554288083597885467
 */

import { ConfigPlugin, withInfoPlist } from 'expo/config-plugins';

/**
 * 配置 iOS Info.plist
 * 添加后台模式和权限说明
 */
export const withIosInfoPlist: ConfigPlugin = (config) =>
  withInfoPlist(config, (config) => {
    // 添加后台模式支持
    config.modResults.UIBackgroundModes = ['fetch', 'remote-notification'];

    // 添加推送相关权限说明（Expo SDK 53+ 要求）
    if (!config.modResults.NSUserTrackingUsageDescription) {
      config.modResults.NSUserTrackingUsageDescription =
        '需要相机权限用于视频通话';
    }
    if (!config.modResults.NSMicrophoneUsageDescription) {
      config.modResults.NSMicrophoneUsageDescription =
        '需要麦克风权限用于语音通话';
    }

    return config;
  });
