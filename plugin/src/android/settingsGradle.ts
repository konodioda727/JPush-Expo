/**
 * Android settings.gradle 配置
 * 添加 JPush 模块引用
 */

import * as fs from 'fs';
import * as path from 'path';
import { ConfigPlugin, withSettingsGradle } from 'expo/config-plugins';
import {
  removeGeneratedContents,
  syncGeneratedContents,
} from '../utils/generateCode';

const JPUSH_GRADLE_PACKAGES = ['jpush-react-native', 'jcore-react-native'];
const JPUSH_MODULES_TAG = 'jpush-modules';

/**
 * 从 app 根目录逐级向上查找依赖的 android 工程目录。
 *
 * 不能假设依赖位于 `<app>/node_modules`:pnpm `node-linker=hoisted` 与
 * yarn / npm workspace 都会把依赖提升到 monorepo 根,硬编码相对路径
 * `../node_modules/<pkg>/android` 在这类布局下不存在,Gradle 配置阶段会报
 * `Configuring project ':<pkg>' without an existing directory is not allowed`。
 * 这里按 Node 模块解析的查找顺序自 app 根向上逐级探测,返回真实路径。
 *
 * @param projectRoot - app 项目根目录(prebuild 的 projectRoot)
 * @param packageName - 依赖名
 * @returns 依赖 android 工程目录的绝对路径
 */
export function resolveAndroidProjectDir(
  projectRoot: string,
  packageName: string
): string {
  const startDir = path.resolve(projectRoot);
  let current = startDir;
  while (true) {
    const androidDir = path.join(current, 'node_modules', packageName, 'android');
    if (fs.existsSync(androidDir)) {
      return androidDir;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  throw new Error(
    `[MX_JPush_Expo] 未找到 ${packageName} 的 android 目录:已从 ${startDir} 逐级向上查找 node_modules 均未命中。` +
      '请先安装 jpush-react-native 与 jcore-react-native(npm / pnpm / yarn install),再重新执行 expo prebuild。'
  );
}

/**
 * 生成 JPush 模块配置
 */
const getJPushModules = (projectRoot: string): string => {
  const androidRoot = path.join(projectRoot, 'android');

  const moduleEntry = (packageName: string): string => {
    const androidDir = resolveAndroidProjectDir(projectRoot, packageName);
    // rootProject.projectDir 即 <app>/android,projectDir 相对它表达,
    // 生成文件不落盘绝对路径。Windows 上 path.relative 会产出 '\' 分隔符,
    // 这里统一转成 '/',保证生成的 Gradle 文件跨平台一致
    const relativeDir = path
      .relative(androidRoot, androidDir)
      .split(path.sep)
      .join('/');

    return `include ':${packageName}'
project(':${packageName}').projectDir = new File(rootProject.projectDir, '${relativeDir}')`;
  };

  return JPUSH_GRADLE_PACKAGES.map(moduleEntry).join('\n\n');
};

export function applyAndroidSettingsGradle(
  contents: string,
  projectRoot: string
): string {
  let jpushModules: string;
  try {
    jpushModules = getJPushModules(projectRoot);
  } catch (error) {
    // 依赖尚未安装(如 fresh clone 后 expo prebuild --no-install、CI 缓存未命中):
    // settings.gradle 已有 generated 块时保持 no-op 并提示,避免把本可跳过的
    // prebuild 变成硬失败;块不存在时仍快速失败并给出安装指引
    if (removeGeneratedContents(contents, JPUSH_MODULES_TAG) !== null) {
      console.warn(
        '\n[MX_JPush_Expo] 未找到 jpush-react-native / jcore-react-native 的 android 目录,' +
          '保留 settings.gradle 中已有的 JPush 模块配置不做重算。' +
          '请在安装依赖(npm / pnpm / yarn install)后重新执行 expo prebuild 以刷新模块路径。'
      );
      return contents;
    }
    throw error;
  }

  return syncGeneratedContents({
    src: contents,
    newSrc: jpushModules,
    tag: JPUSH_MODULES_TAG,
    anchor: /include\s+['"]?:app['"]?/,
    offset: -1,
    comment: '//',
  }).contents;
}

/**
 * 配置 Android settings.gradle
 * 添加 jpush-react-native 和 jcore-react-native 模块
 */
export const withAndroidSettingsGradle: ConfigPlugin = (config) =>
  withSettingsGradle(config, (config) => {
    console.log('\n[MX_JPush_Expo] 配置 Android settings.gradle ...');
    config.modResults.contents = applyAndroidSettingsGradle(
      config.modResults.contents,
      config.modRequest.projectRoot
    );
    return config;
  });
