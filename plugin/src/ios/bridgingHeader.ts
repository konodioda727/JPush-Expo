/**
 * iOS Bridging Header 配置
 * 支持 Swift/OC 混编
 * 参考: https://juejin.cn/post/7554288083597885467
 */

import { ConfigPlugin, withXcodeProject } from 'expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

const BRIDGING_HEADER_BUILD_SETTING = 'SWIFT_OBJC_BRIDGING_HEADER';
const BRIDGING_HEADER_FILE_SUFFIX = '-Bridging-Header.h';
const J_PUSH_IMPORTS = [
  '#import <JPUSHService.h>',
  '#import <RCTJPushModule.h>',
  '#import <RCTJPushEventQueue.h>',
];

type XcodeBuildConfiguration = {
  buildSettings?: Record<string, string | string[] | undefined>;
};

type XcodeTarget = {
  name?: string;
  buildConfigurationList?: string;
};

const unquote = (value: string): string => value.replace(/^"(.*)"$/, '$1');
const getDefaultRelativeHeaderPath = (targetName: string): string =>
  `${targetName}/${targetName}${BRIDGING_HEADER_FILE_SUFFIX}`;

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
      unquote(existingPath)
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

function getTargetBuildConfigurations(
  xcodeProject: {
    pbxXCConfigurationList: () => Record<string, { buildConfigurations?: { value: string }[] }>;
    pbxXCBuildConfigurationSection: () => Record<string, XcodeBuildConfiguration>;
  },
  target: XcodeTarget
): XcodeBuildConfiguration[] {
  const configurationListId = target.buildConfigurationList;
  if (!configurationListId) {
    return [];
  }

  const configurationList = xcodeProject.pbxXCConfigurationList()[configurationListId];
  if (!configurationList?.buildConfigurations) {
    return [];
  }

  const buildConfigurations = xcodeProject.pbxXCBuildConfigurationSection();

  return configurationList.buildConfigurations
    .map(({ value }) => buildConfigurations[value])
    .filter(
      (configuration): configuration is XcodeBuildConfiguration =>
        Boolean(configuration)
    );
}

function getExistingBridgingHeaderPath(
  configurations: XcodeBuildConfiguration[]
): string | undefined {
  for (const configuration of configurations) {
    const currentValue = configuration.buildSettings?.[BRIDGING_HEADER_BUILD_SETTING];
    if (typeof currentValue === 'string' && currentValue.trim()) {
      return currentValue;
    }

    if (Array.isArray(currentValue)) {
      for (const value of currentValue) {
        if (typeof value === 'string' && value.trim()) {
          return value;
        }
      }
    }
  }

  return undefined;
}

function ensureFileContent(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const currentContent = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, 'utf8')
    : '';
  const currentLines = new Set(
    currentContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  );
  const missingImports = J_PUSH_IMPORTS.filter((line) => !currentLines.has(line));

  if (missingImports.length === 0 && fs.existsSync(filePath)) {
    return;
  }

  const trimmedContent = currentContent.trimEnd();
  const segments: string[] = [];

  if (trimmedContent) {
    segments.push(trimmedContent, '');
  }

  segments.push(...missingImports);

  const nextContent = [...segments, ''].join('\n');

  fs.writeFileSync(filePath, nextContent, 'utf8');
}

/**
 * 配置 iOS 桥接头文件
 * 支持 React Native 0.79.5+ 的 Swift 新架构
 */
export const withIosBridgingHeader: ConfigPlugin = (config) =>
  withXcodeProject(config, (config) => {
    console.log('\n[MX_JPush_Expo] 配置 Bridging Header ...');

    const xcodeProject = config.modResults;
    const appTarget = xcodeProject.getTarget('com.apple.product-type.application');
    const targetName =
      appTarget?.target?.name && typeof appTarget.target.name === 'string'
        ? unquote(appTarget.target.name)
        : config.modRequest.projectName;

    if (!appTarget || !targetName) {
      console.log('[MX_JPush_Expo] 未找到 iOS app target，跳过 Bridging Header 配置');
      return config;
    }

    const targetConfigurations = getTargetBuildConfigurations(
      xcodeProject,
      appTarget.target
    );
    const existingBridgingHeaderPath = getExistingBridgingHeaderPath(
      targetConfigurations
    );
    const relativeBridgingHeaderPath = normalizeRelativeHeaderPath(
      existingBridgingHeaderPath,
      targetName
    );
    const absoluteBridgingHeaderPath = path.join(
      config.modRequest.platformProjectRoot,
      relativeBridgingHeaderPath
    );

    xcodeProject.updateBuildProperty(
      BRIDGING_HEADER_BUILD_SETTING,
      `"${relativeBridgingHeaderPath}"`,
      undefined,
      targetName
    );

    ensureFileContent(absoluteBridgingHeaderPath);
    console.log(
      `[MX_JPush_Expo] 已确保 ${targetName} 的 Bridging Header: ${relativeBridgingHeaderPath}`
    );

    return config;
  });
