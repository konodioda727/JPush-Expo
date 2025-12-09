"use strict";
/**
 * Android 配置集成
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.withAndroidConfig = void 0;
const androidManifest_1 = require("./androidManifest");
const appBuildGradle_1 = require("./appBuildGradle");
const settingsGradle_1 = require("./settingsGradle");
/**
 * 应用所有 Android 配置
 * @param config - Expo config
 * @returns Modified config
 */
const withAndroidConfig = (config) => {
    config = (0, androidManifest_1.withAndroidManifestConfig)(config);
    config = (0, appBuildGradle_1.withAndroidAppBuildGradle)(config);
    config = (0, settingsGradle_1.withAndroidSettingsGradle)(config);
    return config;
};
exports.withAndroidConfig = withAndroidConfig;
//# sourceMappingURL=index.js.map