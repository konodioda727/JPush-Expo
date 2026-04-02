/**
 * Android project/build.gradle 配置
 * 添加厂商通道所需的 classpath 依赖
 */

import { ExpoConfig } from 'expo/config';
import { withProjectBuildGradle } from 'expo/config-plugins';
import { ResolvedJPushPluginProps, VendorChannelConfig } from '../types';
import { mergeContents, removeGeneratedContents, syncGeneratedContentsAtLine } from '../utils/generateCode';
import { ensureTopLevelBlock, ensureNestedBlock, findNestedBlockRange } from '../utils/sourceCode';
import { getVendorChannels, getProjectVendorFlags, LEGACY_PROJECT_BUILD_TAGS, getBuildscriptRepositories } from '../utils/vendorChannels';
import { Validator } from '../utils/codeValidator';

/**
 * 获取厂商通道开启标记
 */
const getVendorClasspaths = (vendorChannels?: VendorChannelConfig): string => {
  const isHuaweiEnabled = vendorChannels?.huawei?.enabled === true;
  const isFcmEnabled = vendorChannels?.fcm?.enabled === true;
  const classpaths: string[] = [];

  if (isFcmEnabled) {
    classpaths.push(`// Google Services for FCM`);
    classpaths.push(`classpath 'com.google.gms:google-services:4.4.0'`);
  }

  if (isHuaweiEnabled) {
    classpaths.push(`// Huawei AGConnect`);
    classpaths.push(`classpath 'com.huawei.agconnect:agcp:1.9.3.302'`);
  }

  return classpaths.join('\n        ');
};

/**
 * 生成 allprojects repositories 仓库依赖
 */
const getAllprojectsRepositories = (vendorChannels?: VendorChannelConfig): string => {
  const flags = getProjectVendorFlags(vendorChannels);
  const repositories: string[] = [];

  if (flags.huawei) {
    repositories.push(`maven { url 'https://developer.huawei.com/repo/' }`);
  }

  if (flags.honor) {
    repositories.push(`maven { url 'https://developer.hihonor.com/repo' }`);
  }

  return repositories.join('\n        ');
};

function ensureProjectBuildscriptBlock(src: string): string {
  try {
    let nextContents = ensureTopLevelBlock(src, 'buildscript');
    nextContents = ensureNestedBlock(nextContents, /^\s*buildscript\s*\{/, 'repositories');
    nextContents = ensureNestedBlock(nextContents, /^\s*buildscript\s*\{/, 'dependencies');
    return nextContents;
  } catch (error) {
    console.warn('[MX_JPush_Expo] 无法确保 buildscript 块结构:', error);
    return src;
  }
}

function ensureProjectAllprojectsBlock(src: string): string {
  try {
    let nextContents = ensureTopLevelBlock(src, 'allprojects');
    nextContents = ensureNestedBlock(nextContents, /^\s*allprojects\s*\{/, 'repositories');
    return nextContents;
  } catch (error) {
    console.warn('[MX_JPush_Expo] 无法确保 allprojects 块结构:', error);
    return src;
  }
}

function removeLegacyGeneratedSections(contents: string): string {
  return LEGACY_PROJECT_BUILD_TAGS.reduce((currentContents, tag) => {
    return removeGeneratedContents(currentContents, tag) ?? currentContents;
  }, contents);
}

export function applyAndroidProjectBuildGradle(
  contents: string,
  vendorChannels?: VendorChannelConfig
): string {
  let nextContents = removeLegacyGeneratedSections(contents);

  const buildscriptRepositories = getBuildscriptRepositories(vendorChannels);
  const buildscriptClasspaths = getVendorClasspaths(vendorChannels);
  
  if (buildscriptRepositories || buildscriptClasspaths) {
    nextContents = ensureProjectBuildscriptBlock(nextContents);
  }

  const allprojectsRepositories = getAllprojectsRepositories(vendorChannels);
  if (allprojectsRepositories) {
    nextContents = ensureProjectAllprojectsBlock(nextContents);
  }

  const buildscriptRepositoriesRange = findNestedBlockRange(
    nextContents,
    /^\s*buildscript\s*\{/,
    /^\s*repositories\s*\{/
  );
  if (buildscriptRepositoriesRange) {
    nextContents = syncGeneratedContentsAtLine({
      src: nextContents,
      newSrc: buildscriptRepositories,
      tag: 'jpush-buildscript-repositories',
      lineIndex: buildscriptRepositoriesRange.startLine,
      offset: 1,
      comment: '//',
    }).contents;
  }

  const buildscriptDependenciesRange = findNestedBlockRange(
    nextContents,
    /^\s*buildscript\s*\{/,
    /^\s*dependencies\s*\{/
  );
  if (buildscriptDependenciesRange) {
    nextContents = syncGeneratedContentsAtLine({
      src: nextContents,
      newSrc: buildscriptClasspaths,
      tag: 'jpush-buildscript-classpaths',
      lineIndex: buildscriptDependenciesRange.startLine,
      offset: 1,
      comment: '//',
    }).contents;
  }

  const allprojectsRepositoriesRange = findNestedBlockRange(
    nextContents,
    /^\s*allprojects\s*\{/,
    /^\s*repositories\s*\{/
  );
  if (allprojectsRepositoriesRange) {
    nextContents = syncGeneratedContentsAtLine({
      src: nextContents,
      newSrc: allprojectsRepositories,
      tag: 'jpush-allprojects-repositories',
      lineIndex: allprojectsRepositoriesRange.startLine,
      offset: 1,
      comment: '//',
    }).contents;
  }

  return nextContents;
}

export function withAndroidProjectBuildGradle(
  config: ExpoConfig,
  props: { vendorChannels?: any }
): ExpoConfig {
  return withProjectBuildGradle(config, (config) => {
    const { vendorChannels } = props;
    config.modResults.contents = applyAndroidProjectBuildGradle(
      config.modResults.contents,
      vendorChannels
    );
    return config;
  });
}