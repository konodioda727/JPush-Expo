"use strict";
/**
 * iOS Podfile 配置
 * 添加 post_install 脚本
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.withIosPodfile = void 0;
const config_plugins_1 = require("expo/config-plugins");
/**
 * 配置 Podfile post_install
 * 排除 arm64 模拟器架构
 */
const withIosPodfile = (config) => (0, config_plugins_1.withPodfile)(config, (config) => {
    const postInstallScript = `
    installer.pods_project.build_configurations.each do |config|
      config.build_settings["EXCLUDED_ARCHS[sdk=iphonesimulator*]"] = "arm64"
    end
    `;
    const installScript = 'post_install do |installer|';
    const { contents } = config.modResults;
    const installIndex = contents.indexOf(installScript);
    // 检查是否已经存在 arm64 排除配置
    const hasArm64Exclusion = contents.indexOf('config.build_settings["EXCLUDED_ARCHS[sdk=iphonesimulator*]"] = "arm64"') !== -1;
    if (hasArm64Exclusion) {
        console.log('[MX_JPush_Expo] post_install 脚本已经存在，跳过添加.');
        return config;
    }
    if (installIndex === -1) {
        // 如果没有 post_install，则添加完整的 post_install 块
        config.modResults.contents += `
        ${installScript}
        ${postInstallScript}
        end
      `;
    }
    else {
        // 如果有 post_install，则在其后插入脚本
        config.modResults.contents =
            contents.slice(0, installIndex + installScript.length) +
                postInstallScript +
                contents.slice(installIndex + installScript.length);
    }
    return config;
});
exports.withIosPodfile = withIosPodfile;
//# sourceMappingURL=podfile.js.map