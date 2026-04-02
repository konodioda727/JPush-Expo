/**
 * iOS Info.plist 配置
 * 参考: https://juejin.cn/post/7554288083597885467
 */

import { ExpoConfig } from 'expo/config';
import { withInfoPlist } from 'expo/config-plugins';
import { ResolvedJPushPluginProps } from '../types';

const REQUIRED_BACKGROUND_MODES = ['fetch', 'remote-notification'] as const;

export function mergeBackgroundModes(
  existingModes: string[] | string | undefined
): string[] {
  const mergedModes = new Set(
    Array.isArray(existingModes)
      ? existingModes
      : typeof existingModes === 'string'
        ? [existingModes]
        : []
  );

  for (const mode of REQUIRED_BACKGROUND_MODES) {
    mergedModes.add(mode);
  }

  return Array.from(mergedModes);
}

/**
 * 配置 iOS Info.plist
 * 添加推送通知所需的后台模式
 */
/**
 * 配置 iOS Info.plist
 * 添加推送通知所需的后台模式
 */
export function applyIosInfoPlist(
  infoPlist: Record<string, any>,
  props: ResolvedJPushPluginProps
): Record<string, any> {
  infoPlist.UIBackgroundModes = mergeBackgroundModes(
    infoPlist.UIBackgroundModes
  );
  infoPlist.JPUSH_APPKEY = props.appKey;
  infoPlist.JPUSH_CHANNEL = props.channel;
  infoPlist.JPUSH_APS_FOR_PRODUCTION = props.apsForProduction;

  return infoPlist;
}

export function withIosInfoPlist(
  config: ExpoConfig,
  props: ResolvedJPushPluginProps
): ExpoConfig {
  return withInfoPlist(config, (nextConfig) => {
    nextConfig.modResults = applyIosInfoPlist(nextConfig.modResults, props);
    return nextConfig;
  });
}
