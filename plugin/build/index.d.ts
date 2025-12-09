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
import { ConfigPlugin } from 'expo/config-plugins';
import { JPushPluginProps } from './types';
/**
 * 导出插件（使用 createRunOncePlugin 确保插件只运行一次）
 */
declare const _default: ConfigPlugin<JPushPluginProps>;
export default _default;
//# sourceMappingURL=index.d.ts.map