"use strict";
/**
 * Android AndroidManifest.xml 配置
 * 添加 JPush AppKey 和 Channel
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.withAndroidManifestConfig = void 0;
const config_plugins_1 = require("expo/config-plugins");
/**
 * 配置 Android AndroidManifest
 * 添加 JPUSH_APPKEY 和 JPUSH_CHANNEL meta-data
 */
const withAndroidManifestConfig = (config) => (0, config_plugins_1.withAndroidManifest)(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (!application) {
        throw new Error('[MX_JPush_Expo] 未找到 AndroidManifest application 节点');
    }
    // 添加 JPUSH_CHANNEL
    if (config_plugins_1.AndroidConfig.Manifest.findMetaDataItem(application, 'JPUSH_CHANNEL') ===
        -1) {
        console.log('\n[MX_JPush_Expo] 配置 AndroidManifest JPUSH_CHANNEL ...');
        config_plugins_1.AndroidConfig.Manifest.addMetaDataItemToMainApplication(application, 'JPUSH_CHANNEL', '${JPUSH_CHANNEL}');
    }
    // 添加 JPUSH_APPKEY
    if (config_plugins_1.AndroidConfig.Manifest.findMetaDataItem(application, 'JPUSH_APPKEY') ===
        -1) {
        console.log('\n[MX_JPush_Expo] 配置 AndroidManifest JPUSH_APPKEY ...');
        config_plugins_1.AndroidConfig.Manifest.addMetaDataItemToMainApplication(application, 'JPUSH_APPKEY', '${JPUSH_APPKEY}');
    }
    return config;
});
exports.withAndroidManifestConfig = withAndroidManifestConfig;
//# sourceMappingURL=androidManifest.js.map