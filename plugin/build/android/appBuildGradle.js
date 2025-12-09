"use strict";
/**
 * Android app/build.gradle 配置
 * 添加 JPush 依赖和 manifestPlaceholders
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.withAndroidAppBuildGradle = void 0;
const config_plugins_1 = require("expo/config-plugins");
const config_1 = require("../utils/config");
/**
 * 添加 manifestPlaceholders
 */
const addManifestPlaceholders = (contents) => {
    const defaultConfig = contents.match(/defaultConfig([\s\S]*)versionName(.*)\n/);
    if (!defaultConfig) {
        throw new Error('[MX_JPush_Expo] 无法完成 build.gradle - defaultConfig 配置');
    }
    const [startString] = defaultConfig;
    const startStringLength = startString.length;
    const startStringIndex = contents.indexOf(startString) + startStringLength;
    console.log('\n[MX_JPush_Expo] 配置 build.gradle appKey & channel ...');
    if (contents.indexOf('JPUSH_APPKEY') === -1) {
        // 添加新的 manifestPlaceholders
        return (contents.slice(0, startStringIndex) +
            `        manifestPlaceholders = [
            JPUSH_APPKEY: "${(0, config_1.getAppKey)()}",
            JPUSH_CHANNEL: "${(0, config_1.getChannel)()}"
        ]\n` +
            contents.slice(startStringIndex));
    }
    else {
        // 更新现有的 manifestPlaceholders
        return contents.replace(/manifestPlaceholders([\s\S]*)JPUSH_APPKEY([\s\S]*)JPUSH_CHANNEL(.*)"\n(.*)\]\n/, `manifestPlaceholders = [
            JPUSH_APPKEY: "${(0, config_1.getAppKey)()}",
            JPUSH_CHANNEL: "${(0, config_1.getChannel)()}"
        ]\n`);
    }
};
/**
 * 添加 JPush 依赖
 */
const addJPushDependencies = (contents) => {
    const dependencies = contents.match(/dependencies {\n/);
    if (!dependencies) {
        throw new Error('[MX_JPush_Expo] 无法完成 build.gradle dependencies 配置');
    }
    const [startString] = dependencies;
    const startStringLength = startString.length;
    const startStringIndex = contents.indexOf(startString) + startStringLength;
    let modifiedContents = contents;
    // 添加 jpush-react-native
    if (!modifiedContents.includes(`implementation project(':jpush-react-native')`)) {
        console.log('\n[MX_JPush_Expo] 配置 build.gradle dependencies jpush-react-native ...');
        modifiedContents =
            modifiedContents.slice(0, startStringIndex) +
                `    implementation project(':jpush-react-native')\n` +
                modifiedContents.slice(startStringIndex);
    }
    // 添加 jcore-react-native
    if (!modifiedContents.includes(`implementation project(':jcore-react-native')`)) {
        console.log('\n[MX_JPush_Expo] 配置 build.gradle dependencies jcore-react-native ...');
        const newStartStringIndex = modifiedContents.indexOf(startString) + startStringLength;
        modifiedContents =
            modifiedContents.slice(0, newStartStringIndex) +
                `    implementation project(':jcore-react-native')\n` +
                modifiedContents.slice(newStartStringIndex);
    }
    return modifiedContents;
};
/**
 * 配置 Android build.gradle
 */
const withAndroidAppBuildGradle = (config) => (0, config_plugins_1.withAppBuildGradle)(config, (config) => {
    let contents = config.modResults.contents;
    // 1. 添加 manifestPlaceholders
    contents = addManifestPlaceholders(contents);
    // 2. 添加依赖
    contents = addJPushDependencies(contents);
    config.modResults.contents = contents;
    return config;
});
exports.withAndroidAppBuildGradle = withAndroidAppBuildGradle;
//# sourceMappingURL=appBuildGradle.js.map