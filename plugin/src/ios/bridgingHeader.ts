/**
 * iOS Bridging Header 配置
 * 支持 Swift/OC 混编
 * 参考: https://juejin.cn/post/7554288083597885467
 */

import { ConfigPlugin, withXcodeProject } from 'expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 配置 iOS 桥接头文件
 * 支持 React Native 0.79.5+ 的 Swift 新架构
 */
export const withIosBridgingHeader: ConfigPlugin = (config) =>
  withXcodeProject(config, (config) => {
    console.log('\n[MX_JPush_Expo] 配置 Bridging Header ...');

    const xcodeProject = config.modResults;

    // 设置桥接头文件路径
    const bridgingHeaderPath =
      '"$(SRCROOT)/$(TARGET_NAME)/$(TARGET_NAME)-Bridging-Header.h"';
    
    // 遍历所有 build configurations，只为非 widget target 设置 bridging header
    const configurations = xcodeProject.pbxXCBuildConfigurationSection();
    
    for (const key in configurations) {
      const config = configurations[key];
      if (config && typeof config === 'object' && config.buildSettings) {
        const bundleId = config.buildSettings.PRODUCT_BUNDLE_IDENTIFIER;
        
        // 如果 bundleIdentifier 包含 "widget"，则清空 SWIFT_OBJC_BRIDGING_HEADER
        if (bundleId && typeof bundleId === 'string' && bundleId.includes('widget')) {
          config.buildSettings.SWIFT_OBJC_BRIDGING_HEADER = '""';
          console.log(`[MX_JPush_Expo] 跳过 widget target: ${bundleId}`);
        } else if (bundleId) {
          // 非 widget target，设置 bridging header
          config.buildSettings.SWIFT_OBJC_BRIDGING_HEADER = bridgingHeaderPath;
          console.log(`[MX_JPush_Expo] 设置 Bridging Header for: ${bundleId}`);
        }
      }
    }

    // 实际创建/修改桥接头文件内容
    const iosDir = path.join(config._internal!.projectRoot, 'ios');

    // 尝试查找桥接头文件
    const possiblePaths = [
      path.join(iosDir, 'app', 'app-Bridging-Header.h'),
      path.join(
        iosDir,
        config.modRequest.projectName || '',
        `${config.modRequest.projectName}-Bridging-Header.h`
      ),
    ];

    const bridgingHeaderFile = possiblePaths.find((p) => fs.existsSync(p));

    if (bridgingHeaderFile) {
      let bridgingContent = fs.readFileSync(bridgingHeaderFile, 'utf8');

      // 添加 JPush 相关导入（支持 jpush-react-native@3.1.9）
      // 注意：不需要导入 JPUSHService.h，Swift 可以直接 import
      // 只需要导入 React Native 桥接模块
      const jpushImports = `
// JPush 相关导入
#import <JPUSHService.h>
#import <RCTJPushModule.h>
#import <RCTJPushEventQueue.h>
`;

      if (!bridgingContent.includes('JPUSHService.h')) {
        bridgingContent = bridgingContent.trim() + jpushImports;
        fs.writeFileSync(bridgingHeaderFile, bridgingContent);
        console.log('[MX_JPush_Expo] 已更新 Bridging Header 文件');
      } else {
        console.log('[MX_JPush_Expo] Bridging Header 已包含 JPush 导入，跳过');
      }
    } else {
      console.log(
        '[MX_JPush_Expo] 未找到 Bridging Header 文件，将在 prebuild 后自动创建'
      );
    }

    return config;
  });
