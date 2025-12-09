/**
 * iOS AppDelegate Interface 配置
 * 添加 JPUSHRegisterDelegate 协议
 */

import { ConfigPlugin, withAppDelegate } from 'expo/config-plugins';

/**
 * 配置 AppDelegate Interface
 * 添加 JPUSHRegisterDelegate 协议声明
 */
export const withIosAppDelegateInterface: ConfigPlugin = (config) => {
  return withAppDelegate(config, (config) => {
    const implementationIndex = config.modResults.contents.indexOf(
      '@implementation AppDelegate'
    );

    if (implementationIndex === -1) {
      console.error('[MX_JPush_Expo] 未找到 @implementation AppDelegate');
      return config;
    }

    // 检查是否已经添加了 JPUSHRegisterDelegate
    if (
      config.modResults.contents.indexOf(
        '@interface AppDelegate ()<JPUSHRegisterDelegate>'
      ) !== -1
    ) {
      return config;
    }

    console.log('\n[MX_JPush_Expo] 配置 AppDelegate interface ...');

    const injectionCode = `
@interface AppDelegate () <JPUSHRegisterDelegate>
@end
`;

    // 在 @implementation AppDelegate 前插入代码
    config.modResults.contents =
      config.modResults.contents.slice(0, implementationIndex) +
      injectionCode +
      config.modResults.contents.slice(implementationIndex);

    return config;
  });
};
