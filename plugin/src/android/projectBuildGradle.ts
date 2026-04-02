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

  return classpaths.join('\\n        ');
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

  return repositories.join('\\n        ');
};

function ensureProjectBuildscriptBlock(src: string): string {
  let nextContents = ensureTopLevelBlock(src, 'buildscript');
  nextContents = ensureNestedBlock(nextContents, /^\\s*buildscript\\s*\\{/, 'repositories');
  nextContents = ensureNestedBlock(nextContents, /^\\s*buildscript\\s*\\{/, 'dependencies');
  return nextContents;
}

function ensureProjectAllprojectsBlock(src: string): string {
  let nextContents = ensureTopLevelBlock(src, 'allprojects');
  nextContents = ensureNestedBlock(nextContents, /^\\s*allprojects\\s*\\{/, 'repositories');
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
    /^\\s*buildscript\\s*\\{/,
    /^\\s*repositories\\s*\\{/
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
    /^\\s*buildscript\\s*\\{/,
    /^\\s*dependencies\\s*\\{/
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
    /^\\s*allprojects\\s*\\{/,
    /^\\s*repositories\\s*\\{/
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
export function withAndroidProjectBuildGradle(
  config: ExpoConfig,
  props: Pick<ResolvedJPushPluginProps, 'vendorChannels'>
): ExpoConfig {
  return withProjectBuildGradle(config, (nextConfig) => {
    const { vendorChannels } = props;
    const isHuaweiEnabled = vendorChannels?.huawei?.enabled === true;
    const validator = new Validator(nextConfig.modResults.contents);

    if (isHuaweiEnabled) {
      validator.register('jpush-huawei-maven-buildscript', (src: string) => {
        console.log(
          '\\n[MX_JPush_Expo] 配置 buildscript repositories 华为 Maven 仓库 ...'
        );

        return mergeContents({
          src,
          newSrc: `maven { url 'https://developer.huawei.com/repo/' }`,
          tag: 'jpush-huawei-maven-buildscript',
          anchor: /buildscript\\s*\\{/,
          offset: 2,
          comment: '//',
        });
      });
    }

    if (vendorChannels?.honor) {
      validator.register('jpush-honor-maven-buildscript', (src: string) => {
        console.log(
          '\\n[MX_JPush_Expo] 配置 buildscript repositories 荣耀 Maven 仓库 ...'
        );

        return mergeContents({
          src,
          newSrc: `maven { url 'https://developer.hihonor.com/repo' }`,
          tag: 'jpush-honor-maven-buildscript',
          anchor: /buildscript\\s*\\{/,
          offset: 2,
          comment: '//',
        });
      });
    }

    const classpaths = getVendorClasspaths(vendorChannels);
    if (classpaths) {
      validator.register('classpath', (src: string) => {
        console.log(
          '\\n[MX_JPush_Expo] 配置 buildscript dependencies classpath ...'
        );

        return mergeContents({
          src,
          newSrc: classpaths,
          tag: 'jpush-vendor-classpaths',
          anchor: /dependencies\\s*\\{/,
          offset: 1,
          comment: '//',
        });
      });
    }

    if (isHuaweiEnabled) {
      validator.register('jpush-huawei-maven-allprojects', (src: string) => {
        console.log(
          '\\n[MX_JPush_Expo] 配置 allprojects repositories 华为 Maven 仓库 ...'
        );

        if (!/allprojects\\s*\\{/.test(src)) {
          return { contents: src, didMerge: false, didClear: false };
        }

        const hasRepositories = /allprojects\\s*\\{[^}]*repositories\\s*\\{/.test(src);

        if (hasRepositories) {
          return mergeContents({
            src,
            newSrc: `maven { url 'https://developer.huawei.com/repo/' }`,
            tag: 'jpush-huawei-maven-allprojects',
            anchor: /allprojects\\s*\\{/,
            offset: 2,
            comment: '//',
          });
        }

        return mergeContents({
          src,
          newSrc: `repositories {
        maven { url 'https://developer.huawei.com/repo/' }
    }`,
          tag: 'jpush-huawei-maven-allprojects',
          anchor: /allprojects\\s*\\{/,
          offset: 1,
          comment: '//',
        });
      });
    }

    if (vendorChannels?.honor) {
      validator.register('jpush-honor-maven-allprojects', (src) => {
        console.log(
          '\\n[MX_JPush_Expo] 配置 allprojects repositories 荣耀 Maven 仓库 ...'
        );

        if (!/allprojects\\s*\\{/.test(src)) {
          return { contents: src, didMerge: false, didClear: false };
        }

        const hasRepositories = /allprojects\\s*\\{[^}]*repositories\\s*\\{/.test(src);

        if (hasRepositories) {
          return mergeContents({
            src,
            newSrc: `maven { url 'https://developer.hihonor.com/repo' }`,
            tag: 'jpush-honor-maven-allprojects',
            anchor: /allprojects\\s*\\{/,
            offset: 2,
            comment: '//',
          });
        }

        return mergeContents({
          src,
          newSrc: `repositories {
        maven { url 'https://developer.hihonor.com/repo' }
    }`,
          tag: 'jpush-honor-maven-allprojects',
          anchor: /allprojects\\s*\\{/,
          offset: 1,
          comment: '//',
        });
      });
    }

    nextConfig.modResults.contents = validator.invoke();
    return nextConfig;
  });
}