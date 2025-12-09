"use strict";
/**
 * iOS Bridging Header 配置
 * 支持 Swift/OC 混编
 * 参考: https://juejin.cn/post/7554288083597885467
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.withIosBridgingHeader = void 0;
const config_plugins_1 = require("expo/config-plugins");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * 配置 iOS 桥接头文件
 * 支持 React Native 0.79.5+ 的 Swift 新架构
 */
const withIosBridgingHeader = (config) => (0, config_plugins_1.withXcodeProject)(config, (config) => {
    console.log('\n[MX_JPush_Expo] 配置 Bridging Header ...');
    const xcodeProject = config.modResults;
    // 设置桥接头文件路径
    const bridgingHeaderPath = '"$(SRCROOT)/$(TARGET_NAME)/$(TARGET_NAME)-Bridging-Header.h"';
    xcodeProject.addBuildProperty('SWIFT_OBJC_BRIDGING_HEADER', bridgingHeaderPath);
    // 实际创建/修改桥接头文件内容
    const iosDir = path.join(config._internal.projectRoot, 'ios');
    // 尝试查找桥接头文件
    const possiblePaths = [
        path.join(iosDir, 'app', 'app-Bridging-Header.h'),
        path.join(iosDir, config.modRequest.projectName || '', `${config.modRequest.projectName}-Bridging-Header.h`),
    ];
    const bridgingHeaderFile = possiblePaths.find((p) => fs.existsSync(p));
    if (bridgingHeaderFile) {
        let bridgingContent = fs.readFileSync(bridgingHeaderFile, 'utf8');
        // 添加 JPush 相关导入（支持 jpush-react-native@3.1.9）
        const jpushImports = `
// JPush 相关导入
#import <JPUSHService.h>
#import <RCTJPushModule.h>
#import <RCTJPushEventQueue.h>
`;
        if (!bridgingContent.includes('JPUSHService.h')) {
            bridgingContent = bridgingContent.trim() + jpushImports;
            fs.writeFileSync(bridgingHeaderFile, bridgingContent);
            console.log('[MX_JPush_Expo] 已更新 Bridging Header 文件');
        }
        else {
            console.log('[MX_JPush_Expo] Bridging Header 已包含 JPush 导入，跳过');
        }
    }
    else {
        console.log('[MX_JPush_Expo] 未找到 Bridging Header 文件，将在 prebuild 后自动创建');
    }
    return config;
});
exports.withIosBridgingHeader = withIosBridgingHeader;
//# sourceMappingURL=bridgingHeader.js.map