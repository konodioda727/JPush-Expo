/**
 * Expo Config Plugin for JPush Integration
 * 
 * 极光推送 Expo 集成插件
 * 支持 Expo SDK 53+ 和 React Native 0.79.5+
 * 
 * @author MuxiStudio
 * @version 1.0.2
 * 
 * 参考文档：
 * - JPush 集成 Expo: https://juejin.cn/post/7423235127716659239
 * - Expo SDK 53+ 集成极光推送 iOS Swift: https://juejin.cn/post/7554288083597885467
 * - JPush-expo-config-plugin: https://github.com/RunoMeow/jpush-expo-config-plugin
 * 
 * 依赖版本：
 * - jpush-react-native: 3.1.9
 * - jcore-react-native: 2.3.0
 */

import { ConfigPlugin, createRunOncePlugin } from 'expo/config-plugins';
import { JPushPluginProps, validateProps } from './types';
import { setConfig } from './utils/config';
import { withIOSConfig } from './ios';
import { withAndroidConfig } from './android';

/**
 * JPush Expo Config Plugin 主入口
 * 
 * @param config - Expo config
 * @param props - Plugin props
 * @returns Modified config
 * 
 * @example
 * ```json
 * {
 *   "plugins": [
 *     [
 *       "mx-jpush-expo",
 *       {
 *         "appKey": "your-jpush-appkey",
 *         "channel": "your-channel",
 *         "apsForProduction": false
 *       }
 *     ]
 *   ]
 * }
 * ```
 */
const withJPush: ConfigPlugin<JPushPluginProps> = (config, props) => {
  try {
    // 验证配置参数
    validateProps(props);

    // 设置全局配置
    setConfig(props.appKey, props.channel, props.apsForProduction);

    // 应用 iOS 配置
    config = withIOSConfig(config);

    // 应用 Android 配置
    config = withAndroidConfig(config);

    return config;
  } catch (error) {
    // 提供更详细的错误信息
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`[MX_JPush_Expo] 配置失败: ${errorMessage}`);
  }
};

/**
 * 导出插件（使用 createRunOncePlugin 确保插件只运行一次）
 */
export default createRunOncePlugin(withJPush, 'mx-jpush-expo', '1.0.2');
