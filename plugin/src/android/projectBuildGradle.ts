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
 * 配置 Android project/build.gradle
 */
export const withAndroidProjectBuildGradle: ConfigPlugin = (config) =>
  withProjectBuildGradle(config, (config) => {
    const vendorChannels = getVendorChannels();
    const validator = new Validator(config.modResults.contents);

    // 1. 添加华为 Maven 仓库到 buildscript repositories（如果启用了华为推送）
    if (vendorChannels?.huawei) {
      validator.register('jpush-huawei-maven-buildscript', (src) => {
        console.log('\n[MX_JPush_Expo] 配置 buildscript repositories 华为 Maven 仓库 ...');
        
        return mergeContents({
          src,
          newSrc: `maven { url 'https://developer.huawei.com/repo/' }`,
          tag: 'jpush-huawei-maven-buildscript',
          anchor: /buildscript\s*\{/,
          offset: 2,  // 跳过 buildscript { 和 repositories {
          comment: '//',
        });
      });
    }

    // 1.1 添加荣耀 Maven 仓库到 buildscript repositories（如果启用了荣耀推送）
    if (vendorChannels?.honor) {
      validator.register('jpush-honor-maven-buildscript', (src) => {
        console.log('\n[MX_JPush_Expo] 配置 buildscript repositories 荣耀 Maven 仓库 ...');
        
        return mergeContents({
          src,
          newSrc: `maven { url 'https://developer.hihonor.com/repo' }`,
          tag: 'jpush-honor-maven-buildscript',
          anchor: /buildscript\s*\{/,
          offset: 2,  // 跳过 buildscript { 和 repositories {
          comment: '//',
        });
      });
    }

    // 2. 添加厂商通道 classpath 依赖到 buildscript dependencies
    const classpaths = getVendorClasspaths();
    if (classpaths) {
      validator.register('classpath', (src) => {
        console.log('\n[MX_JPush_Expo] 配置 buildscript dependencies classpath ...');
        
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

    // 3. 添加华为 Maven 仓库到 allprojects repositories（如果启用了华为推送）
    if (vendorChannels?.huawei) {
      validator.register('jpush-huawei-maven-allprojects', (src) => {
        console.log('\n[MX_JPush_Expo] 配置 allprojects repositories 华为 Maven 仓库 ...');
        
        // 检查 allprojects 中是否已存在 repositories 块
        const hasAllprojects = /allprojects\s*\{/.test(src);
        if (!hasAllprojects) {
          return { contents: src, didMerge: false, didClear: false };
        }
        
        const hasRepositories = /allprojects\s*\{[^}]*repositories\s*\{/.test(src);
        
        if (hasRepositories) {
          // 在 allprojects 的 repositories 块中添加
          return mergeContents({
            src,
            newSrc: `maven { url 'https://developer.huawei.com/repo/' }`,
            tag: 'jpush-huawei-maven-allprojects',
            anchor: /allprojects\s*\{/,
            offset: 2,  // 跳过 allprojects { 和 repositories {
            comment: '//',
          });
        } else {
          // 创建新的 repositories 块
          return mergeContents({
            src,
            newSrc: `repositories {
        maven { url 'https://developer.huawei.com/repo/' }
    }`,
            tag: 'jpush-huawei-maven-allprojects',
            anchor: /allprojects\s*\{/,
            offset: 1,
            comment: '//',
          });
        }
      });
    }

    // 3.1 添加荣耀 Maven 仓库到 allprojects repositories（如果启用了荣耀推送）
    if (vendorChannels?.honor) {
      validator.register('jpush-honor-maven-allprojects', (src) => {
        console.log('\n[MX_JPush_Expo] 配置 allprojects repositories 荣耀 Maven 仓库 ...');
        
        // 检查 allprojects 中是否已存在 repositories 块
        const hasAllprojects = /allprojects\s*\{/.test(src);
        if (!hasAllprojects) {
          return { contents: src, didMerge: false, didClear: false };
        }
        
        const hasRepositories = /allprojects\s*\{[^}]*repositories\s*\{/.test(src);
        
        if (hasRepositories) {
          // 在 allprojects 的 repositories 块中添加
          return mergeContents({
            src,
            newSrc: `maven { url 'https://developer.hihonor.com/repo' }`,
            tag: 'jpush-honor-maven-allprojects',
            anchor: /allprojects\s*\{/,
            offset: 2,  // 跳过 allprojects { 和 repositories {
            comment: '//',
          });
        } else {
          // 创建新的 repositories 块
          return mergeContents({
            src,
            newSrc: `repositories {
        maven { url 'https://developer.hihonor.com/repo' }
    }`,
            tag: 'jpush-honor-maven-allprojects',
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
