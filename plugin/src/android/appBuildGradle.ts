/**
 * Android app/build.gradle 配置
 * 添加 JPush 依赖和 manifestPlaceholders
 */

import { ConfigPlugin, withAppBuildGradle } from 'expo/config-plugins';
import { getAppKey, getChannel } from '../utils/config';
import { mergeContents } from '../utils/generateCode';
import { Validator } from '../utils/codeValidator';

/**
 * 生成 manifestPlaceholders 代码
 */
const getManifestPlaceholders = (): string => {
  return `manifestPlaceholders = [
            JPUSH_APPKEY: "${getAppKey()}",
            JPUSH_CHANNEL: "${getChannel()}"
        ]`;
};

/**
 * 生成 JPush 依赖代码
 */
const getJPushDependencies = (): string => {
  return `implementation project(':jpush-react-native')
    implementation project(':jcore-react-native')`;
};

/**
 * 配置 Android build.gradle
 */
export const withAndroidAppBuildGradle: ConfigPlugin = (config) =>
  withAppBuildGradle(config, (config) => {
    const validator = new Validator(config.modResults.contents);

    // 1. 添加 manifestPlaceholders
    validator.register('JPUSH_APPKEY', (src) => {
      console.log('\n[MX_JPush_Expo] 配置 build.gradle appKey & channel ...');
      
      return mergeContents({
        src,
        newSrc: getManifestPlaceholders(),
        tag: 'jpush-manifest-placeholders',
        anchor: /versionName\s+["'][\d.]+["']\n/,  // 匹配 versionName "1.0"
        offset: 1,  // 在 versionName 的下一行插入
        comment: '//',
      });
    });

    // 2. 添加 JPush 依赖
    validator.register("implementation project(':jpush-react-native')", (src) => {
      console.log('\n[MX_JPush_Expo] 配置 build.gradle dependencies ...');
      
      return mergeContents({
        src,
        newSrc: getJPushDependencies(),
        tag: 'jpush-dependencies',
        anchor: /dependencies \{\n/,
        offset: 1,  // 在 dependencies { 的下一行插入
        comment: '//',
      });
    });

    config.modResults.contents = validator.invoke();
    return config;
  });
