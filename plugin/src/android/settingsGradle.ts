/**
 * Android settings.gradle 配置
 * 添加 JPush 模块引用
 */

import { ConfigPlugin, withSettingsGradle } from 'expo/config-plugins';
import { mergeContents } from '../utils/generateCode';
import { Validator } from '../utils/codeValidator';

/**
 * 生成 JPush 模块配置
 */
const getJPushModules = (): string => {
  return `
include ':jpush-react-native'
project(':jpush-react-native').projectDir = new File(rootProject.projectDir, '../node_modules/jpush-react-native/android')

include ':jcore-react-native'
project(':jcore-react-native').projectDir = new File(rootProject.projectDir, '../node_modules/jcore-react-native/android')`;
};

/**
 * 配置 Android settings.gradle
 * 添加 jpush-react-native 和 jcore-react-native 模块
 */
export const withAndroidSettingsGradle: ConfigPlugin = (config) =>
  withSettingsGradle(config, (config) => {
    const validator = new Validator(config.modResults.contents);

    // 在 includeBuild(expoAutolinking.reactNativeGradlePlugin) 上方添加 JPush 模块
    validator.register("include ':jpush-react-native", (src) => {
      console.log('\n[MX_JPush_Expo] 配置 settings.gradle include jpush modules ...');
      
      return mergeContents({
        src,
        newSrc: getJPushModules(),
        tag: 'jpush-modules',
        anchor: /include\s+['"]?:app['"]?/,
        offset: -1,  // 在锚点上方插入
        comment: '//',
      });
    });

    config.modResults.contents = validator.invoke();
    return config;
  });
