/**
 * Android project/build.gradle 配置
 * 添加厂商通道所需的 classpath 依赖
 */

import { ConfigPlugin, withProjectBuildGradle } from 'expo/config-plugins';
import { getVendorChannels } from '../utils/config';
import { mergeContents } from '../utils/generateCode';
import { Validator } from '../utils/codeValidator';

/**
 * 生成厂商通道 classpath 依赖
 */
const getVendorClasspaths = (): string => {
  const vendorChannels = getVendorChannels();
  const classpaths: string[] = [];

  if (vendorChannels?.fcm) {
    classpaths.push(`// Google Services for FCM`);
    classpaths.push(`classpath 'com.google.gms:google-services:4.4.0'`);
  }

  if (vendorChannels?.huawei) {
    classpaths.push(`// Huawei AGConnect`);
    classpaths.push(`classpath 'com.huawei.agconnect:agcp:1.9.1.301'`);
  }

  return classpaths.length > 0 ? classpaths.join('\n        ') : '';
};

/**
 * 生成华为 Maven 仓库配置
 */
const getHuaweiMavenRepo = (): string => {
  return `repositories {
        maven { url 'https://developer.huawei.com/repo/' }
    }`;
};

/**
 * 配置 Android project/build.gradle
 */
export const withAndroidProjectBuildGradle: ConfigPlugin = (config) =>
  withProjectBuildGradle(config, (config) => {
    const vendorChannels = getVendorChannels();
    const validator = new Validator(config.modResults.contents);

    // 1. 添加厂商通道 classpath 依赖
    const classpaths = getVendorClasspaths();
    if (classpaths) {
      validator.register('classpath', (src) => {
        console.log('\n[MX_JPush_Expo] 配置 project build.gradle classpath ...');
        
        return mergeContents({
          src,
          newSrc: classpaths,
          tag: 'jpush-vendor-classpaths',
          anchor: /dependencies\s*\{/,
          offset: 1,
          comment: '//',
        });
      });
    }

    // 2. 添加华为 Maven 仓库（如果启用了华为推送）
    if (vendorChannels?.huawei) {
      validator.register('developer.huawei.com', (src) => {
        console.log('\n[MX_JPush_Expo] 配置 project build.gradle 华为 Maven 仓库 ...');
        
        // 检查是否已存在 repositories 块
        const hasRepositoriesBlock = /repositories\s*\{/.test(src);
        
        if (hasRepositoriesBlock) {
          // 如果已存在 repositories 块，在其中添加华为 Maven 仓库
          return mergeContents({
            src,
            newSrc: `maven { url 'https://developer.huawei.com/repo/' }`,
            tag: 'jpush-huawei-maven',
            anchor: /repositories\s*\{/,
            offset: 1,
            comment: '//',
          });
        } else {
          // 如果不存在 repositories 块，添加完整的 repositories 块
          return mergeContents({
            src,
            newSrc: `repositories {
        maven { url 'https://developer.huawei.com/repo/' }
    }`,
            tag: 'jpush-huawei-maven',
            anchor: /allprojects\s*\{/,
            offset: 1,
            comment: '//',
          });
        }
      });
    }

    config.modResults.contents = validator.invoke();
    return config;
  });
