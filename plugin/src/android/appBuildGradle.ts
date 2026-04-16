/**
 * Android app/build.gradle 配置
 * 添加 JPush 依赖和 manifestPlaceholders
 */

import { ExpoConfig } from 'expo/config';
import { withAppBuildGradle } from 'expo/config-plugins';
import { ResolvedJPushPluginProps, VendorChannelConfig } from '../types';
import {
  removeGeneratedContents,
  replaceGeneratedContentsAtLine,
  syncGeneratedContentsAtEnd,
} from '../utils/generateCode';
import { getConfig } from '../utils/config';
import {
  ensureNestedBlock,
  ensureTopLevelBlock,
  findBlockRange,
  findLineIndex,
  findNestedBlockRange,
  getLineIndent,
} from '../utils/sourceCode';

const LEGACY_DEFAULT_CONFIG_TAGS = [
  'jpush-default-config',
  'jpush-ndk-config',
  'jpush-manifest-placeholders',
];
const LEGACY_DEPENDENCY_TAGS = ['jpush-libs-filetree'];

type ResolvedAndroidBuildGradleConfig = {
  appKey: string;
  channel: string;
  packageName: string;
  vendorChannels?: VendorChannelConfig;
};

type AndroidBuildGradleConfigInput = {
  packageName?: string;
  appKey?: string;
  channel?: string;
  vendorChannels?: VendorChannelConfig;
};

const gradleEnv = (key: string, fallback = '""'): string =>
  `System.getenv("${key}") ?: (project.findProperty("${key}") ?: ${fallback})`;

function removeLegacyGeneratedSections(contents: string, tags: string[]): string {
  return tags.reduce((currentContents, tag) => {
    return removeGeneratedContents(currentContents, tag) ?? currentContents;
  }, contents);
}

function getResolvedConfig({
  packageName,
  appKey,
  channel,
  vendorChannels,
}: AndroidBuildGradleConfigInput): ResolvedAndroidBuildGradleConfig {
  const fallbackConfig = getConfig();

  return {
    appKey: appKey ?? fallbackConfig?.appKey ?? '',
    channel: channel ?? fallbackConfig?.channel ?? '',
    packageName: packageName ?? fallbackConfig?.packageName ?? '',
    vendorChannels: vendorChannels ?? fallbackConfig?.vendorChannels,
  };
}

function getBlockRangeOrThrow(src: string, pattern: RegExp, errorMessage: string) {
  const range = findBlockRange(src, pattern);

  if (!range) {
    throw new Error(errorMessage);
  }

  return range;
}

function getDefaultConfigRange(src: string) {
  return getBlockRangeOrThrow(
    src,
    /^\s*defaultConfig\s*\{/,
    '[MX_JPush_Expo] 未找到 defaultConfig 配置块'
  );
}

function getDependenciesLine(src: string): number {
  const lineIndex = findLineIndex(src, /^\s*dependencies\s*\{/);

  if (lineIndex < 0) {
    throw new Error('[MX_JPush_Expo] 未找到 dependencies 配置块');
  }

  return lineIndex;
}

function getNdkRange(src: string) {
  const range = findNestedBlockRange(
    src,
    /^\s*defaultConfig\s*\{/,
    /^\s*ndk\s*\{/
  );

  if (!range) {
    throw new Error('[MX_JPush_Expo] 未找到 defaultConfig.ndk 配置块');
  }

  return range;
}

function getChildIndent(src: string, pattern: RegExp, errorMessage: string): string {
  const range = getBlockRangeOrThrow(src, pattern, errorMessage);
  const lines = src.split('\n');

  return `${getLineIndent(lines[range.startLine])}    `;
}

function getManifestPlaceholders(
  packageName: string,
  appKey: string,
  channel: string,
  vendorChannels: VendorChannelConfig | undefined,
  indent: string
): string {
  const placeholders: string[] = [
    `JPUSH_PKGNAME: ${gradleEnv('JPUSH_PKGNAME', `"${packageName}"`)}`,
    `JPUSH_APPKEY: ${gradleEnv('JPUSH_APP_KEY', `"${appKey}"`)}`,
    `JPUSH_CHANNEL: ${gradleEnv('JPUSH_CHANNEL', `"${channel}"`)}`,
  ];

  if (vendorChannels?.meizu) {
    placeholders.push(`MEIZU_APPKEY: ${gradleEnv('JPUSH_MEIZU_APP_KEY')}`);
    placeholders.push(`MEIZU_APPID: ${gradleEnv('JPUSH_MEIZU_APP_ID')}`);
  }

  if (vendorChannels?.xiaomi) {
    placeholders.push(`XIAOMI_APPID: ${gradleEnv('JPUSH_XIAOMI_APP_ID')}`);
    placeholders.push(`XIAOMI_APPKEY: ${gradleEnv('JPUSH_XIAOMI_APP_KEY')}`);
  }

  if (vendorChannels?.oppo) {
    placeholders.push(`OPPO_APPKEY: ${gradleEnv('JPUSH_OPPO_APP_KEY')}`);
    placeholders.push(`OPPO_APPID: ${gradleEnv('JPUSH_OPPO_APP_ID')}`);
    placeholders.push(`OPPO_APPSECRET: ${gradleEnv('JPUSH_OPPO_APP_SECRET')}`);
  }

  if (vendorChannels?.vivo) {
    placeholders.push(`VIVO_APPKEY: ${gradleEnv('JPUSH_VIVO_APP_KEY')}`);
    placeholders.push(`VIVO_APPID: ${gradleEnv('JPUSH_VIVO_APP_ID')}`);
  }

  if (vendorChannels?.honor) {
    placeholders.push(`HONOR_APPID: ${gradleEnv('JPUSH_HONOR_APP_ID')}`);
  }

  if (vendorChannels?.nio) {
    placeholders.push(`NIO_APPID: ${gradleEnv('JPUSH_NIO_APP_ID')}`);
  }

  const valueIndent = `${indent}    `;

  return [
    // Append after any host map so unrelated placeholders stay intact while
    // JPUSH_* defaults can still take precedence when the same key is reused.
    `${indent}manifestPlaceholders += [`,
    placeholders
      .map((placeholder, index) => {
        const separator = index === placeholders.length - 1 ? '' : ',';
        return `${valueIndent}${placeholder}${separator}`;
      })
      .join('\n'),
    `${indent}]`,
  ].join('\n');
}

function getNdkAbiFilters(indent: string): string {
  return [
    `${indent}// 选择要添加的对应 cpu 类型的 .so 库。`,
    `${indent}abiFilters 'arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64'`,
  ].join('\n');
}

function getJPushDependencies(
  vendorChannels: VendorChannelConfig | undefined,
  indent: string
): string {
  const isHuaweiEnabled = vendorChannels?.huawei?.enabled === true;
  const isFcmEnabled = vendorChannels?.fcm?.enabled === true;
  const dependencies: string[] = [
    `implementation fileTree(include: ['*.jar','*.aar'], dir: 'libs')`,
    ``,
    `// JPush React Native 桥接（已包含 JPush 核心 SDK）`,
    `implementation project(':jpush-react-native')`,
    `implementation project(':jcore-react-native')`,
  ];

  if (vendorChannels) {
    const hasVendorChannels =
      isHuaweiEnabled ||
      isFcmEnabled ||
      Boolean(
        vendorChannels.meizu ||
          vendorChannels.vivo ||
          vendorChannels.xiaomi ||
          vendorChannels.oppo ||
          vendorChannels.honor ||
          vendorChannels.nio
      );

    if (hasVendorChannels) {
      dependencies.push('', `// 厂商通道 SDK（JPush 5.9.0）`);
    }

    if (isHuaweiEnabled) {
      dependencies.push(
        `// 华为厂商`,
        `implementation 'com.huawei.hms:push:6.13.0.300'`,
        `implementation 'com.huawei.agconnect:agconnect-core:1.9.3.302'`,
        `implementation 'cn.jiguang.sdk.plugin:huawei:5.9.0'`
      );
    }

    if (isFcmEnabled) {
      dependencies.push(
        `// FCM 厂商`,
        `implementation 'com.google.firebase:firebase-messaging:24.1.0'`,
        `implementation 'cn.jiguang.sdk.plugin:fcm:5.9.0'`
      );
    }

    if (vendorChannels.meizu) {
      dependencies.push(`// 魅族厂商`, `implementation 'cn.jiguang.sdk.plugin:meizu:5.9.0'`);
    }

    if (vendorChannels.vivo) {
      dependencies.push(`// VIVO 厂商`, `implementation 'cn.jiguang.sdk.plugin:vivo:5.9.0'`);
    }

    if (vendorChannels.xiaomi) {
      dependencies.push(`// 小米厂商`, `implementation 'cn.jiguang.sdk.plugin:xiaomi:5.9.0'`);
    }

    if (vendorChannels.oppo) {
      dependencies.push(
        `// OPPO 厂商`,
        `implementation 'cn.jiguang.sdk.plugin:oppo:5.9.0'`,
        `// OPPO 3.1.0 aar 及其以上版本需要添加以下依赖`,
        `implementation 'com.google.code.gson:gson:2.6.2'`,
        `implementation 'androidx.annotation:annotation:1.1.0'`
      );
    }

    if (vendorChannels.honor) {
      dependencies.push(`// 荣耀厂商`, `implementation 'cn.jiguang.sdk.plugin:honor:5.9.0'`);
    }

    if (vendorChannels.nio) {
      dependencies.push(`// 蔚来厂商`, `implementation 'cn.jiguang.sdk.plugin:nio:5.9.0'`);
    }
  }

  return dependencies
    .map((dependency) => (dependency ? `${indent}${dependency}` : dependency))
    .join('\n');
}

function getApplyPlugins(vendorChannels?: VendorChannelConfig): string {
  const isHuaweiEnabled = vendorChannels?.huawei?.enabled === true;
  const isFcmEnabled = vendorChannels?.fcm?.enabled === true;
  const plugins: string[] = [];

  if (isFcmEnabled) {
    plugins.push(`apply plugin: 'com.google.gms.google-services'`);
  }

  if (isHuaweiEnabled) {
    plugins.push(`apply plugin: 'com.huawei.agconnect'`);
  }

  return plugins.join('\n');
}

export function applyAndroidAppBuildGradle(
  contents: string,
  vendorChannels?: VendorChannelConfig,
  packageName?: string,
  appKey?: string,
  channel?: string
): string {
  const resolvedConfig = getResolvedConfig({
    packageName,
    appKey,
    channel,
    vendorChannels,
  });

  let nextContents = removeLegacyGeneratedSections(contents, LEGACY_DEFAULT_CONFIG_TAGS);
  nextContents = ensureNestedBlock(nextContents, /^\s*android\s*\{/, 'defaultConfig');
  nextContents = ensureNestedBlock(nextContents, /^\s*defaultConfig\s*\{/, 'ndk');
  nextContents = ensureTopLevelBlock(nextContents, 'dependencies');
  nextContents = removeLegacyGeneratedSections(nextContents, LEGACY_DEPENDENCY_TAGS);

  const ndkIndent = getChildIndent(
    nextContents,
    /^\s*ndk\s*\{/,
    '[MX_JPush_Expo] 未找到 defaultConfig.ndk 配置块'
  );
  nextContents = replaceGeneratedContentsAtLine({
    src: nextContents,
    newSrc: getNdkAbiFilters(ndkIndent),
    tag: 'jpush-ndk-abi-filters',
    getLineIndex: (src) => getNdkRange(src).endLine,
    offset: 0,
    comment: '//',
  }).contents;

  const defaultConfigIndent = getChildIndent(
    nextContents,
    /^\s*defaultConfig\s*\{/,
    '[MX_JPush_Expo] 未找到 defaultConfig 配置块'
  );
  nextContents = replaceGeneratedContentsAtLine({
    src: nextContents,
    newSrc: getManifestPlaceholders(
      resolvedConfig.packageName,
      resolvedConfig.appKey,
      resolvedConfig.channel,
      resolvedConfig.vendorChannels,
      defaultConfigIndent
    ),
    tag: 'jpush-manifest-placeholders',
    getLineIndex: (src) => getDefaultConfigRange(src).endLine,
    offset: 0,
    comment: '//',
  }).contents;

  const dependenciesIndent = `${getLineIndent(
    nextContents.split('\n')[getDependenciesLine(nextContents)]
  )}    `;
  nextContents = replaceGeneratedContentsAtLine({
    src: nextContents,
    newSrc: getJPushDependencies(resolvedConfig.vendorChannels, dependenciesIndent),
    tag: 'jpush-dependencies',
    getLineIndex: getDependenciesLine,
    offset: 1,
    comment: '//',
  }).contents;

  nextContents = syncGeneratedContentsAtEnd({
    src: nextContents,
    newSrc: getApplyPlugins(resolvedConfig.vendorChannels),
    tag: 'jpush-apply-plugins',
    comment: '//',
  }).contents;

  return nextContents;
}

/**
 * 配置 Android build.gradle
 */
export function withAndroidAppBuildGradle(
  config: ExpoConfig,
  props: Pick<
    ResolvedJPushPluginProps,
    'packageName' | 'appKey' | 'channel' | 'vendorChannels'
  >
): ExpoConfig {
  return withAppBuildGradle(config, (nextConfig) => {
    console.log('\n[MX_JPush_Expo] 配置 Android app/build.gradle ...');
    nextConfig.modResults.contents = applyAndroidAppBuildGradle(
      nextConfig.modResults.contents,
      props.vendorChannels,
      props.packageName,
      props.appKey,
      props.channel
    );

    return nextConfig;
  });
}
