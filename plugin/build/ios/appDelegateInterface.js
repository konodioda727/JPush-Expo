"use strict";
/**
 * iOS AppDelegate Interface 配置
 * 添加 JPUSHRegisterDelegate 协议
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.withIosAppDelegateInterface = void 0;
const config_plugins_1 = require("expo/config-plugins");
/**
 * 配置 AppDelegate Interface
 * 添加 JPUSHRegisterDelegate 协议声明
 */
const withIosAppDelegateInterface = (config) => {
    return (0, config_plugins_1.withAppDelegate)(config, (config) => {
        const implementationIndex = config.modResults.contents.indexOf('@implementation AppDelegate');
        if (implementationIndex === -1) {
            console.error('[MX_JPush_Expo] 未找到 @implementation AppDelegate');
            return config;
        }
        // 检查是否已经添加了 JPUSHRegisterDelegate
        if (config.modResults.contents.indexOf('@interface AppDelegate ()<JPUSHRegisterDelegate>') !== -1) {
            return config;
        }
        console.log('\n[MX_JPush_Expo] 配置 AppDelegate interface ...');
        const injectionCode = `
@interface AppDelegate () <JPUSHRegisterDelegate>
@end
`;
        // 在 @implementation AppDelegate 前插入代码
        config.modResults.contents =
            config.modResults.contents.slice(0, implementationIndex) +
                injectionCode +
                config.modResults.contents.slice(implementationIndex);
        return config;
    });
};
exports.withIosAppDelegateInterface = withIosAppDelegateInterface;
//# sourceMappingURL=appDelegateInterface.js.map