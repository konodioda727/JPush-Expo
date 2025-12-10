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

    // 在最后一个 include 语句之后添加 JPush 模块
    validator.register("include ':jpush-react-native", (src) => {
      console.log('\n[MX_JPush_Expo] 配置 settings.gradle include jpush modules ...');
      
      // 查找最后一个 include 语句
      const includeMatches = Array.from(src.matchAll(/include\s+['"]:[\w-]+['"]/g));
      
      if (includeMatches.length === 0) {
        // 如果没有找到 include，在文件末尾添加
        return mergeContents({
          src,
          newSrc: getJPushModules(),
          tag: 'jpush-modules',
          anchor: /$/,
          offset: 0,
          comment: '//',
        });
      }
      
      // 使用最后一个 include 作为锚点
      const lastInclude = includeMatches[includeMatches.length - 1][0];
      
      return mergeContents({
        src,
        newSrc: getJPushModules(),
        tag: 'jpush-modules',
        anchor: new RegExp(lastInclude.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),  // 转义特殊字符
        offset: 1,  // 在最后一个 include 的下一行插入
        comment: '//',
      });
    });

    config.modResults.contents = validator.invoke();
    return config;
  });
