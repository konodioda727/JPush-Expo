/**
 * Android app/build.gradle 配置
 * 添加 JPush 依赖和 manifestPlaceholders
 */

import { ConfigPlugin, withAppBuildGradle } from 'expo/config-plugins';
import {
  removeGeneratedContents,
  syncGeneratedContentsAtEnd,
  syncGeneratedContentsAtLine,
} from '../utils/generateCode';
import { ensureNestedBlock, ensureTopLevelBlock, findLineIndex } from '../utils/sourceCode';
import { getPackageName, getVendorChannels } from '../utils/config';

type VendorFlags = {
  fcm: boolean;
  huawei: boolean;
  honor: boolean;
  meizu: boolean;
  nio: boolean;
  oppo: boolean;
  vivo: boolean;
  xiaomi: boolean;
};

const LEGACY_DEFAULT_CONFIG_TAGS = [
  'jpush-ndk-config',
  'jpush-manifest-placeholders',
];
const LEGACY_DEPENDENCY_TAGS = ['jpush-libs-filetree'];

/**
 * 生成 defaultConfig 中的 JPush 配置
 */
const gradleEnv = (key: string, fallback = '""'): string =>
  `System.getenv("${key}") ?: (project.findProperty("${key}") ?: ${fallback})`;

function getVendorFlags(): VendorFlags {
  const vendorChannels = getVendorChannels();

  return {
    fcm: !!vendorChannels?.fcm?.enabled,
    huawei: !!vendorChannels?.huawei?.enabled,
    honor: !!vendorChannels?.honor,
    meizu: !!vendorChannels?.meizu,
    nio: !!vendorChannels?.nio,
    oppo: !!vendorChannels?.oppo,
    vivo: !!vendorChannels?.vivo,
    xiaomi: !!vendorChannels?.xiaomi,
  };
}

const getDefaultConfigSnippet = (): string => {
  const vendorFlags = getVendorFlags();
  const placeholders: string[] = [
    `JPUSH_PKGNAME: ${gradleEnv('JPUSH_PKGNAME', `"${getPackageName()}"`)}`,
    `JPUSH_APPKEY: ${gradleEnv('JPUSH_APP_KEY')}`,
    `JPUSH_CHANNEL: ${gradleEnv('JPUSH_CHANNEL')}`,
  ];

  if (vendorFlags.meizu) {
    placeholders.push(`MEIZU_APPKEY: ${gradleEnv('JPUSH_MEIZU_APP_KEY')}`);
    placeholders.push(`MEIZU_APPID: ${gradleEnv('JPUSH_MEIZU_APP_ID')}`);
  }

  if (vendorFlags.xiaomi) {
    placeholders.push(`XIAOMI_APPID: ${gradleEnv('JPUSH_XIAOMI_APP_ID')}`);
    placeholders.push(`XIAOMI_APPKEY: ${gradleEnv('JPUSH_XIAOMI_APP_KEY')}`);
  }

  if (vendorFlags.oppo) {
    placeholders.push(`OPPO_APPKEY: ${gradleEnv('JPUSH_OPPO_APP_KEY')}`);
    placeholders.push(`OPPO_APPID: ${gradleEnv('JPUSH_OPPO_APP_ID')}`);
    placeholders.push(`OPPO_APPSECRET: ${gradleEnv('JPUSH_OPPO_APP_SECRET')}`);
  }

  if (vendorFlags.vivo) {
    placeholders.push(`VIVO_APPKEY: ${gradleEnv('JPUSH_VIVO_APP_KEY')}`);
    placeholders.push(`VIVO_APPID: ${gradleEnv('JPUSH_VIVO_APP_ID')}`);
  }

  if (vendorFlags.honor) {
    placeholders.push(`HONOR_APPID: ${gradleEnv('JPUSH_HONOR_APP_ID')}`);
  }

  if (vendorFlags.nio) {
    placeholders.push(`NIO_APPID: ${gradleEnv('JPUSH_NIO_APP_ID')}`);
  }

  return `ndk {
                // 选择要添加的对应 cpu 类型的 .so 库。
                abiFilters 'arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64'
            }
            manifestPlaceholders = [
                ${placeholders.join(',\n                ')}
            ]`;
};

/**
 * 生成 JPush SDK 依赖代码
 */
const getJPushDependencies = (): string => {
  const vendorFlags = getVendorFlags();
  const dependencies: string[] = [
    `implementation fileTree(include: ['*.jar','*.aar'], dir: 'libs')`,
    ``,
    `// JPush React Native 桥接（已包含 JPush 核心 SDK）`,
    `implementation project(':jpush-react-native')`,
    `implementation project(':jcore-react-native')`,
  ];

  if (Object.values(vendorFlags).some(Boolean)) {
    dependencies.push('', `// 厂商通道 SDK（JPush 5.9.0）`);
  }

  if (vendorFlags.huawei) {
    dependencies.push(
      `// 华为厂商`,
      `implementation 'com.huawei.hms:push:6.13.0.300'`,
      `implementation 'com.huawei.agconnect:agconnect-core:1.9.3.302'`,
      `implementation 'cn.jiguang.sdk.plugin:huawei:5.9.0'`
    );
  }

  if (vendorFlags.fcm) {
    dependencies.push(
      `// FCM 厂商`,
      `implementation 'com.google.firebase:firebase-messaging:24.1.0'`,
      `implementation 'cn.jiguang.sdk.plugin:fcm:5.9.0'`
    );
  }

  if (vendorFlags.meizu) {
    dependencies.push(`// 魅族厂商`, `implementation 'cn.jiguang.sdk.plugin:meizu:5.9.0'`);
  }

  if (vendorFlags.vivo) {
    dependencies.push(`// VIVO 厂商`, `implementation 'cn.jiguang.sdk.plugin:vivo:5.9.0'`);
  }

  if (vendorFlags.xiaomi) {
    dependencies.push(`// 小米厂商`, `implementation 'cn.jiguang.sdk.plugin:xiaomi:5.9.0'`);
  }

  if (vendorFlags.oppo) {
    dependencies.push(
      `// OPPO 厂商`,
      `implementation 'cn.jiguang.sdk.plugin:oppo:5.9.0'`,
      `// OPPO 3.1.0 aar 及其以上版本需要添加以下依赖`,
      `implementation 'com.google.code.gson:gson:2.6.2'`,
      `implementation 'androidx.annotation:annotation:1.1.0'`
    );
  }

  if (vendorFlags.honor) {
    dependencies.push(`// 荣耀厂商`, `implementation 'cn.jiguang.sdk.plugin:honor:5.9.0'`);
  }

  if (vendorFlags.nio) {
    dependencies.push(`// 蔚来厂商`, `implementation 'cn.jiguang.sdk.plugin:nio:5.9.0'`);
  }

  return dependencies.join('\n    ');
};

/**
 * 生成 apply plugin 语句
 */
const getApplyPlugins = (): string => {
  const vendorFlags = getVendorFlags();
  const plugins: string[] = [];

  if (vendorFlags.fcm) {
    plugins.push(`apply plugin: 'com.google.gms.google-services'`);
  }

  if (vendorFlags.huawei) {
    plugins.push(`apply plugin: 'com.huawei.agconnect'`);
  }

  return plugins.join('\n');
};

function removeLegacyGeneratedSections(contents: string, tags: string[]): string {
  return tags.reduce((currentContents, tag) => {
    return removeGeneratedContents(currentContents, tag) ?? currentContents;
  }, contents);
}

export function applyAndroidAppBuildGradle(contents: string): string {
  let nextContents = removeLegacyGeneratedSections(contents, LEGACY_DEFAULT_CONFIG_TAGS);
  nextContents = ensureNestedBlock(nextContents, /^\s*android\s*\{/, 'defaultConfig');
  nextContents = ensureTopLevelBlock(nextContents, 'dependencies');

  const defaultConfigLine = findLineIndex(nextContents, /^\s*defaultConfig\s*\{/);
  if (defaultConfigLine < 0) {
    throw new Error('[MX_JPush_Expo] 未找到 defaultConfig 配置块');
  }

  nextContents = syncGeneratedContentsAtLine({
    src: nextContents,
    newSrc: getDefaultConfigSnippet(),
    tag: 'jpush-default-config',
    lineIndex: defaultConfigLine,
    offset: 1,
    comment: '//',
  }).contents;

  const dependenciesLine = findLineIndex(nextContents, /^\s*dependencies\s*\{/);
  if (dependenciesLine < 0) {
    throw new Error('[MX_JPush_Expo] 未找到 dependencies 配置块');
  }

  nextContents = removeLegacyGeneratedSections(nextContents, LEGACY_DEPENDENCY_TAGS);
  nextContents = syncGeneratedContentsAtLine({
    src: nextContents,
    newSrc: getJPushDependencies(),
    tag: 'jpush-dependencies',
    lineIndex: dependenciesLine,
    offset: 1,
    comment: '//',
  }).contents;

  nextContents = syncGeneratedContentsAtEnd({
    src: nextContents,
    newSrc: getApplyPlugins(),
    tag: 'jpush-apply-plugins',
    comment: '//',
  }).contents;

  return nextContents;
}

/**
 * 配置 Android build.gradle
 */
export const withAndroidAppBuildGradle: ConfigPlugin = (config) =>
  withAppBuildGradle(config, (config) => {
    console.log('\n[MX_JPush_Expo] 配置 Android app/build.gradle ...');
    config.modResults.contents = applyAndroidAppBuildGradle(config.modResults.contents);
    return config;
  });
