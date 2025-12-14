/**
 * Android app/build.gradle 配置
 * 添加 JPush 依赖和 manifestPlaceholders
 */

import { ConfigPlugin, withAppBuildGradle } from 'expo/config-plugins';
import { getAppKey, getChannel, getPackageName, getVendorChannels } from '../utils/config';
import { mergeContents } from '../utils/generateCode';
import { Validator } from '../utils/codeValidator';

/**
 * 生成 NDK abiFilters 配置
 */
const getNdkConfig = (): string => {
  return `ndk {
                //选择要添加的对应 cpu 类型的 .so 库。
                abiFilters 'armeabi', 'armeabi-v7a', 'arm64-v8a'
                // 还可以添加 'x86', 'x86_64', 'mips', 'mips64'
            }`;
};

/**
 * 生成 manifestPlaceholders 代码
 */
const getManifestPlaceholders = (): string => {
  const vendorChannels = getVendorChannels();
  const placeholders: string[] = [
    `JPUSH_PKGNAME: "${getPackageName()}"`,
    `JPUSH_APPKEY: "${getAppKey()}"`,
    `JPUSH_CHANNEL: "${getChannel()}"`
  ];

  // 添加厂商通道配置
  if (vendorChannels?.meizu) {
    placeholders.push(`MEIZU_APPKEY: "${vendorChannels.meizu.appKey}"`);
    placeholders.push(`MEIZU_APPID: "${vendorChannels.meizu.appId}"`);
  }

  if (vendorChannels?.xiaomi) {
    placeholders.push(`XIAOMI_APPID: "${vendorChannels.xiaomi.appId}"`);
    placeholders.push(`XIAOMI_APPKEY: "${vendorChannels.xiaomi.appKey}"`);
  }

  if (vendorChannels?.oppo) {
    placeholders.push(`OPPO_APPKEY: "${vendorChannels.oppo.appKey}"`);
    placeholders.push(`OPPO_APPID: "${vendorChannels.oppo.appId}"`);
    placeholders.push(`OPPO_APPSECRET: "${vendorChannels.oppo.appSecret}"`);
  }

  if (vendorChannels?.vivo) {
    placeholders.push(`VIVO_APPKEY: "${vendorChannels.vivo.appKey}"`);
    placeholders.push(`VIVO_APPID: "${vendorChannels.vivo.appId}"`);
  }

  if (vendorChannels?.honor) {
    placeholders.push(`HONOR_APPID: "${vendorChannels.honor.appId}"`);
  }

  if (vendorChannels?.nio) {
    placeholders.push(`NIO_APPID: "${vendorChannels.nio.appId}"`);
  }

  return `manifestPlaceholders = [
                ${placeholders.join(',\n                ')}
            ]`;
};

/**
 * 生成 JPush SDK 依赖代码
 */
const getJPushDependencies = (): string => {
  const vendorChannels = getVendorChannels();
  const dependencies: string[] = [
    `// JPush React Native 桥接（已包含 JPush 核心 SDK）`,
    `implementation project(':jpush-react-native')`,
    `implementation project(':jcore-react-native')`
  ];

  // 添加厂商通道 SDK 依赖
  if (vendorChannels) {
    const hasVendorChannels = Object.keys(vendorChannels).length > 0;
    if (hasVendorChannels) {
      dependencies.push(``, `// 厂商通道 SDK（JPush 5.7.0）`);
    }

    // 华为推送
    if (vendorChannels.huawei) {
      dependencies.push(
        `// 华为厂商`,
        `implementation 'com.huawei.hms:push:6.13.0.300'`,
        `implementation 'cn.jiguang.sdk.plugin:huawei:5.7.0'`
      );
    }

    // FCM 推送
    if (vendorChannels.fcm) {
      dependencies.push(
        `// FCM 厂商`,
        `implementation 'com.google.firebase:firebase-messaging:24.1.0'`,
        `implementation 'cn.jiguang.sdk.plugin:fcm:5.7.0'`
      );
    }

    // 魅族推送
    if (vendorChannels.meizu) {
      dependencies.push(
        `// 魅族厂商`,
        `implementation 'cn.jiguang.sdk.plugin:meizu:5.7.0'`,
        `// 需要单独引入魅族厂商 aar: push-internal-5.0.3.aar 到 android/app/libs`,
        `implementation(name: 'push-internal-5.0.3', ext: 'aar')`
      );
    }

    // VIVO 推送
    if (vendorChannels.vivo) {
      dependencies.push(
        `// VIVO 厂商`,
        `implementation 'cn.jiguang.sdk.plugin:vivo:5.7.0'`
      );
    }

    // 小米推送
    if (vendorChannels.xiaomi) {
      dependencies.push(
        `// 小米厂商`,
        `implementation 'cn.jiguang.sdk.plugin:xiaomi:5.7.0'`
      );
    }

    // OPPO 推送
    if (vendorChannels.oppo) {
      dependencies.push(
        `// OPPO 厂商`,
        `implementation 'cn.jiguang.sdk.plugin:oppo:5.7.0'`,
        `// 需要单独引入 OPPO 厂商 aar: com.heytap.msp_3.5.3.aar 到 android/app/libs`,
        `implementation(name: 'com.heytap.msp_3.5.3', ext: 'aar')`,
        `// OPPO 3.1.0 aar 依赖`,
        `implementation 'com.google.code.gson:gson:2.10.1'`,
        `implementation 'commons-codec:commons-codec:1.6'`,
        `implementation 'androidx.annotation:annotation:1.1.0'`
      );
    }

    // 荣耀推送
    if (vendorChannels.honor) {
      dependencies.push(
        `// 荣耀厂商`,
        `implementation 'cn.jiguang.sdk.plugin:honor:5.7.0'`,
        `// 需要单独引入荣耀厂商 aar: HiPushSDK-8.0.12.307.aar 到 android/app/libs`,
        `implementation(name: 'HiPushSDK-8.0.12.307', ext: 'aar')`
      );
    }

    // 蔚来推送
    if (vendorChannels.nio) {
      dependencies.push(
        `// 蔚来厂商`,
        `implementation 'cn.jiguang.sdk.plugin:nio:5.7.0'`,
        `// 需要单独引入蔚来厂商 aar: niopush-sdk-v1.0.aar 到 android/app/libs`,
        `implementation(name: 'niopush-sdk-v1.0', ext: 'aar')`
      );
    }
  }

  return dependencies.join('\n    ');
};

/**
 * 生成 apply plugin 语句
 */
const getApplyPlugins = (): string => {
  const vendorChannels = getVendorChannels();
  const plugins: string[] = [];

  if (vendorChannels?.fcm) {
    plugins.push(`apply plugin: 'com.google.gms.google-services'`);
  }

  if (vendorChannels?.huawei) {
    plugins.push(`apply plugin: 'com.huawei.agconnect'`);
  }

  return plugins.length > 0 ? plugins.join('\n') : '';
};

/**
 * 配置 Android build.gradle
 */
export const withAndroidAppBuildGradle: ConfigPlugin = (config) =>
  withAppBuildGradle(config, (config) => {
    const validator = new Validator(config.modResults.contents);

    // 1. 添加 NDK abiFilters 配置
    validator.register('abiFilters', (src) => {
      console.log('\n[MX_JPush_Expo] 配置 build.gradle NDK abiFilters ...');
      
      return mergeContents({
        src,
        newSrc: getNdkConfig(),
        tag: 'jpush-ndk-config',
        anchor: /versionName\s+["'][\d.]+["']/,  // 匹配 versionName "1.0"
        offset: 1,  // 在 versionName 的下一行插入
        comment: '//',
      });
    });

    // 2. 添加 manifestPlaceholders
    validator.register('JPUSH_APPKEY', (src) => {
      console.log('\n[MX_JPush_Expo] 配置 build.gradle manifestPlaceholders ...');
      
      return mergeContents({
        src,
        newSrc: getManifestPlaceholders(),
        tag: 'jpush-manifest-placeholders',
        anchor: /ndk\s*\{/,  // 在 NDK 配置后插入
        offset: 1,
        comment: '//',
      });
    });

    // 3. 添加 JPush 依赖
    validator.register("implementation project(':jpush-react-native')", (src) => {
      console.log('\n[MX_JPush_Expo] 配置 build.gradle dependencies ...');
      
      return mergeContents({
        src,
        newSrc: getJPushDependencies(),
        tag: 'jpush-dependencies',
        anchor: /dependencies \{/,
        offset: 1,  // 在 dependencies { 的下一行插入
        comment: '//',
      });
    });

    config.modResults.contents = validator.invoke();
    return config;
  });
