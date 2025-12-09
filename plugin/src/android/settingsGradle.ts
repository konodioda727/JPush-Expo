/**
 * Android settings.gradle 配置
 * 添加 JPush 模块引用
 */

import { ConfigPlugin, withSettingsGradle } from 'expo/config-plugins';

/**
 * 配置 Android settings.gradle
 * 添加 jpush-react-native 和 jcore-react-native 模块
 */
export const withAndroidSettingsGradle: ConfigPlugin = (config) =>
  withSettingsGradle(config, (config) => {
    let contents = config.modResults.contents;

    // 添加 jpush-react-native
    if (!contents.includes(`include ':jpush-react-native'`)) {
      console.log(
        '\n[MX_JPush_Expo] 配置 settings.gradle include jpush-react-native ...'
      );
      contents += `
include ':jpush-react-native'
project(':jpush-react-native').projectDir = new File(rootProject.projectDir, '../node_modules/jpush-react-native/android')`;
    }

    // 添加 jcore-react-native
    if (!contents.includes(`include ':jcore-react-native'`)) {
      console.log(
        '\n[MX_JPush_Expo] 配置 settings.gradle include jcore-react-native ...'
      );
      contents += `
include ':jcore-react-native'
project(':jcore-react-native').projectDir = new File(rootProject.projectDir, '../node_modules/jcore-react-native/android')`;
    }

    config.modResults.contents = contents;
    return config;
  });
