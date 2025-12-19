/**
 * Android 配置集成
 */

import { ConfigPlugin } from 'expo/config-plugins';
import { withAndroidManifestConfig } from './androidManifest';
import { withAndroidAppBuildGradle } from './appBuildGradle';
import { withAndroidProjectBuildGradle } from './projectBuildGradle';
import { withAndroidSettingsGradle } from './settingsGradle';
import { withAndroidGradleProperties } from './gradleProperties';

/**
 * 应用所有 Android 配置
 * @param config - Expo config
 * @returns Modified config
 */
export const withAndroidConfig: ConfigPlugin = (config) => {
  config = withAndroidManifestConfig(config);
  config = withAndroidProjectBuildGradle(config);
  config = withAndroidAppBuildGradle(config);
  config = withAndroidSettingsGradle(config);
  config = withAndroidGradleProperties(config);

  return config;
};
