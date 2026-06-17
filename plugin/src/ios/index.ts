/**
 * iOS 配置集成
 * 参考: https://juejin.cn/post/7554288083597885467
 */

import { ExpoConfig } from 'expo/config';
import { withIosInfoPlist } from './infoPlist';
import { withIosAppDelegate } from './appDelegate';
import { withIosBridgingHeader } from './bridgingHeader';
import { withIosEntitlements } from './entitlements';
import { ResolvedJPushPluginProps } from '../types';

/**
 * 应用所有 iOS 配置
 * @param config - Expo config
 * @param props - 已归一化的插件配置
 * @returns Modified config
 */
export function withIOSConfig(
  config: ExpoConfig,
  props: ResolvedJPushPluginProps
): ExpoConfig {
  config = withIosInfoPlist(config, props);
  config = withIosEntitlements(config, props);
  config = withIosAppDelegate(config);
  config = withIosBridgingHeader(config);

  return config;
}
