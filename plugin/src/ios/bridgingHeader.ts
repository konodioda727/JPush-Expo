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
  buildSettings?: Record<string, string>;
};

type XcodeConfigurationListLike = {
  buildConfigurations?: Array<{ value: string }>;
};

type ApplicationTargetInfo = {
  buildConfigurationIds: string[];
  targetName: string;
};

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

export function getBridgingHeaderFilePath(projectRoot: string, targetName: string): string {
  return path.join(projectRoot, 'ios', targetName, `${targetName}-Bridging-Header.h`);
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
    const applicationTarget = getApplicationTargetInfo(xcodeProject);
    const bridgingHeaderPath = `"${applicationTarget.targetName}/${applicationTarget.targetName}-Bridging-Header.h"`;
    const targetName = applyBridgingHeaderBuildSettings(xcodeProject, bridgingHeaderPath);

    const bridgingHeaderFilePath = getBridgingHeaderFilePath(
      config.modRequest.projectRoot,
      targetName
    );

    syncBridgingHeaderFile(bridgingHeaderFilePath);

    return config;
  });
