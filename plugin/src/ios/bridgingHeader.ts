/**
 * iOS Bridging Header 配置
 * 支持 Swift/OC 混编
 * 参考: https://juejin.cn/post/7554288083597885467
 */

import { ConfigPlugin, withXcodeProject } from 'expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';
import { normalizeQuotedName } from '../utils/sourceCode';

const APPLICATION_PRODUCT_TYPE = 'com.apple.product-type.application';
const BRIDGING_HEADER_IMPORTS = [
  '#import <JPUSHService.h>',
  '#import <RCTJPushModule.h>',
  '#import <RCTJPushEventQueue.h>',
];

type XcodeProjectLike = {
  getTarget: (productType: string) => { uuid: string; target: XcodeTargetLike } | null;
  pbxXCBuildConfigurationSection: () => Record<string, XcodeBuildConfigurationLike>;
  pbxXCConfigurationList: () => Record<string, XcodeConfigurationListLike>;
};

type XcodeTargetLike = {
  name?: string;
  buildConfigurationList?: string;
};

type XcodeBuildConfigurationLike = {
  buildSettings?: Record<string, string | string[] | undefined>;
};

type XcodeConfigurationListLike = {
  buildConfigurations?: Array<{ value: string }>;
};

type ApplicationTargetInfo = {
  buildConfigurationIds: string[];
  targetName: string;
};

const BRIDGING_HEADER_BUILD_SETTING = 'SWIFT_OBJC_BRIDGING_HEADER';
const BRIDGING_HEADER_FILE_SUFFIX = '-Bridging-Header.h';

function getApplicationTargetInfo(xcodeProject: XcodeProjectLike): ApplicationTargetInfo {
  const applicationTarget = xcodeProject.getTarget(APPLICATION_PRODUCT_TYPE);
  if (!applicationTarget) {
    throw new Error('[MX_JPush_Expo] 未找到 iOS application target');
  }

  const targetName = normalizeQuotedName(applicationTarget.target.name);
  if (!targetName) {
    throw new Error('[MX_JPush_Expo] 未找到 iOS application target 名称');
  }

  const buildConfigurationListId = applicationTarget.target.buildConfigurationList;
  if (!buildConfigurationListId) {
    throw new Error('[MX_JPush_Expo] 未找到 application target 的 buildConfigurationList');
  }

  const configurationList = xcodeProject.pbxXCConfigurationList()[buildConfigurationListId];
  const buildConfigurationIds =
    configurationList?.buildConfigurations?.map((configuration) => configuration.value) ?? [];

  if (buildConfigurationIds.length === 0) {
    throw new Error('[MX_JPush_Expo] application target 未关联任何 build configuration');
  }

  return {
    buildConfigurationIds,
    targetName,
  };
}

function getDefaultRelativeHeaderPath(targetName: string): string {
  return `${targetName}/${targetName}${BRIDGING_HEADER_FILE_SUFFIX}`;
}

function getExistingBridgingHeaderPath(
  xcodeProject: XcodeProjectLike,
  buildConfigurationIds: string[]
): string | undefined {
  const configurations = xcodeProject.pbxXCBuildConfigurationSection();

  for (const configurationId of buildConfigurationIds) {
    const currentValue =
      configurations[configurationId]?.buildSettings?.[BRIDGING_HEADER_BUILD_SETTING];

    if (typeof currentValue === 'string' && currentValue.trim()) {
      return currentValue;
    }

    if (Array.isArray(currentValue)) {
      const firstValue = currentValue.find(
        (value): value is string => typeof value === 'string' && value.trim().length > 0
      );
      if (firstValue) {
        return firstValue;
      }
    }
  }

  return undefined;
}

function normalizeRelativeHeaderPath(
  existingPath: string | undefined,
  targetName: string
): string {
  const defaultRelativePath = getDefaultRelativeHeaderPath(targetName);

  if (!existingPath) {
    return defaultRelativePath;
  }

  const normalizedPath = path.posix
    .normalize(
      existingPath
        .replace(/^"(.*)"$/, '$1')
        .replace(/^\$\(SRCROOT\)\//, '')
        .replace(/\$\(TARGET_NAME\)/g, targetName)
        .replace(/\\/g, '/')
        .trim()
    )
    .replace(/^\.\//, '');

  const isEscapingProjectRoot =
    !normalizedPath ||
    normalizedPath === '.' ||
    normalizedPath === '..' ||
    normalizedPath.startsWith('../');
  const isAbsolutePath =
    path.posix.isAbsolute(normalizedPath) || /^[A-Za-z]:\//.test(normalizedPath);

  if (isEscapingProjectRoot || isAbsolutePath) {
    return defaultRelativePath;
  }

  return normalizedPath;
}

function resolveBridgingHeaderRelativePath(xcodeProject: XcodeProjectLike): string {
  const applicationTarget = getApplicationTargetInfo(xcodeProject);
  const existingPath = getExistingBridgingHeaderPath(
    xcodeProject,
    applicationTarget.buildConfigurationIds
  );

  return normalizeRelativeHeaderPath(existingPath, applicationTarget.targetName);
}

export function applyBridgingHeaderBuildSettings(
  xcodeProject: XcodeProjectLike,
  bridgingHeaderPath: string
): string {
  const applicationTarget = getApplicationTargetInfo(xcodeProject);
  const configurations = xcodeProject.pbxXCBuildConfigurationSection();

  for (const configurationId of applicationTarget.buildConfigurationIds) {
    const configuration = configurations[configurationId];
    if (!configuration) {
      continue;
    }

    configuration.buildSettings = configuration.buildSettings ?? {};
    configuration.buildSettings.SWIFT_OBJC_BRIDGING_HEADER = bridgingHeaderPath;
  }

  return applicationTarget.targetName;
}

export function getBridgingHeaderFilePath(
  projectRoot: string,
  relativeHeaderPath: string
): string {
  return path.join(projectRoot, 'ios', relativeHeaderPath);
}

export function upsertBridgingHeaderImports(content: string): string {
  const normalizedContent = content.trimEnd();
  const missingImports = BRIDGING_HEADER_IMPORTS.filter((importLine) => !content.includes(importLine));

  if (missingImports.length === 0) {
    return normalizedContent ? `${normalizedContent}\n` : '';
  }

  const additions = [
    content.includes('// JPush 相关导入') ? null : '// JPush 相关导入',
    ...missingImports,
  ].filter((line): line is string => !!line);

  const prefix = normalizedContent ? `${normalizedContent}\n` : '';
  return `${prefix}${additions.join('\n')}\n`;
}

export function syncBridgingHeaderFile(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const currentContent = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const nextContent = upsertBridgingHeaderImports(currentContent);

  if (currentContent !== nextContent) {
    fs.writeFileSync(filePath, nextContent);
  }
}

/**
 * 配置 iOS 桥接头文件
 * 支持 React Native 0.79.5+ 的 Swift 新架构
 */
export const withIosBridgingHeader: ConfigPlugin = (config) =>
  withXcodeProject(config, (config) => {
    console.log('\n[MX_JPush_Expo] 配置 Bridging Header ...');

    const xcodeProject = config.modResults as unknown as XcodeProjectLike;
    const relativeBridgingHeaderPath = resolveBridgingHeaderRelativePath(xcodeProject);
    applyBridgingHeaderBuildSettings(
      xcodeProject,
      `"${relativeBridgingHeaderPath}"`
    );

    const bridgingHeaderFilePath = getBridgingHeaderFilePath(
      config.modRequest.projectRoot,
      relativeBridgingHeaderPath
    );

    syncBridgingHeaderFile(bridgingHeaderFilePath);

    return config;
  });
