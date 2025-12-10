/**
 * iOS 配置集成
 * 参考: https://juejin.cn/post/7554288083597885467
 */

import { ConfigPlugin } from 'expo/config-plugins';
import { withIosInfoPlist } from './infoPlist';
import { withIosAppDelegate } from './appDelegate';
import { withIosBridgingHeader } from './bridgingHeader';
import { withIosPodfile } from './podfile';

/**
 * 应用所有 iOS 配置
 * @param config - Expo config
 * @returns Modified config
 */
export const withIOSConfig: ConfigPlugin = (config) => {
  config = withIosInfoPlist(config);
  config = withIosAppDelegate(config);
  config = withIosBridgingHeader(config);
  config = withIosPodfile(config);

  return config;
};
