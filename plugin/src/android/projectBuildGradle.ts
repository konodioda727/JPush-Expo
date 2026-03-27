/**
 * Android project/build.gradle 配置
 * 添加厂商通道所需的 classpath 依赖
 */

import { ConfigPlugin, withProjectBuildGradle } from 'expo/config-plugins';
import {
  removeGeneratedContents,
  syncGeneratedContentsAtLine,
} from '../utils/generateCode';
import {
  ensureNestedBlock,
  ensureTopLevelBlock,
  findNestedBlockRange,
} from '../utils/sourceCode';
import { getVendorChannels } from '../utils/config';

type ProjectVendorFlags = {
  fcm: boolean;
  honor: boolean;
  huawei: boolean;
};

const LEGACY_PROJECT_BUILD_TAGS = [
  'jpush-huawei-maven-buildscript',
  'jpush-honor-maven-buildscript',
  'jpush-vendor-classpaths',
  'jpush-huawei-maven-allprojects',
  'jpush-honor-maven-allprojects',
];

function getProjectVendorFlags(): ProjectVendorFlags {
  const vendorChannels = getVendorChannels();

  return {
    fcm: !!vendorChannels?.fcm?.enabled,
    honor: !!vendorChannels?.honor,
    huawei: !!vendorChannels?.huawei?.enabled,
  };
}

/**
 * 生成 buildscript repositories 仓库依赖
 */
const getBuildscriptRepositories = (): string => {
  const vendorFlags = getProjectVendorFlags();
  const repositories: string[] = [];

  if (vendorFlags.huawei) {
    repositories.push(`maven { url 'https://developer.huawei.com/repo/' }`);
  }

  if (vendorFlags.honor) {
    repositories.push(`maven { url 'https://developer.hihonor.com/repo' }`);
  }

  return repositories.join('\n        ');
};

/**
 * 生成厂商通道 classpath 依赖
 */
const getVendorClasspaths = (): string => {
  const vendorFlags = getProjectVendorFlags();
  const classpaths: string[] = [];

  if (vendorFlags.fcm) {
    classpaths.push(`// Google Services for FCM`);
    classpaths.push(`classpath 'com.google.gms:google-services:4.4.0'`);
  }

  if (vendorFlags.huawei) {
    classpaths.push(`// Huawei AGConnect`);
    classpaths.push(`classpath 'com.huawei.agconnect:agcp:1.9.3.302'`);
  }

  return classpaths.join('\n        ');
};

/**
 * 生成 allprojects repositories 仓库依赖
 */
const getAllprojectsRepositories = (): string => {
  const vendorFlags = getProjectVendorFlags();
  const repositories: string[] = [];

  if (vendorFlags.huawei) {
    repositories.push(`maven { url 'https://developer.huawei.com/repo/' }`);
  }

  if (vendorFlags.honor) {
    repositories.push(`maven { url 'https://developer.hihonor.com/repo' }`);
  }

  return repositories.join('\n        ');
};

function ensureProjectBuildscriptBlock(src: string): string {
  let nextContents = ensureTopLevelBlock(src, 'buildscript');
  nextContents = ensureNestedBlock(nextContents, /^\s*buildscript\s*\{/, 'repositories');
  nextContents = ensureNestedBlock(nextContents, /^\s*buildscript\s*\{/, 'dependencies');
  return nextContents;
}

function ensureProjectAllprojectsBlock(src: string): string {
  let nextContents = ensureTopLevelBlock(src, 'allprojects');
  nextContents = ensureNestedBlock(nextContents, /^\s*allprojects\s*\{/, 'repositories');
  return nextContents;
}

function removeLegacyGeneratedSections(contents: string): string {
  return LEGACY_PROJECT_BUILD_TAGS.reduce((currentContents, tag) => {
    return removeGeneratedContents(currentContents, tag) ?? currentContents;
  }, contents);
}

export function applyAndroidProjectBuildGradle(contents: string): string {
  let nextContents = removeLegacyGeneratedSections(contents);

  const buildscriptRepositories = getBuildscriptRepositories();
  const buildscriptClasspaths = getVendorClasspaths();
  if (buildscriptRepositories || buildscriptClasspaths) {
    nextContents = ensureProjectBuildscriptBlock(nextContents);
  }

  const allprojectsRepositories = getAllprojectsRepositories();
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

/**
 * 配置 Android project/build.gradle
 */
export const withAndroidProjectBuildGradle: ConfigPlugin = (config) =>
  withProjectBuildGradle(config, (config) => {
    console.log('\n[MX_JPush_Expo] 配置 Android project/build.gradle ...');
    config.modResults.contents = applyAndroidProjectBuildGradle(config.modResults.contents);
    return config;
  });
