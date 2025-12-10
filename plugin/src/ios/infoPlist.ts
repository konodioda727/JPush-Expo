/**
 * iOS Info.plist 配置
 * 参考: https://juejin.cn/post/7554288083597885467
 */

import { ConfigPlugin, withInfoPlist } from "expo/config-plugins";

/**
 * 配置 iOS Info.plist
 * 添加推送通知所需的后台模式
 */
export const withIosInfoPlist: ConfigPlugin = (config) =>
	withInfoPlist(config, (config) => {
		// 添加后台模式支持（推送通知必需）
		config.modResults.UIBackgroundModes = ["fetch", "remote-notification"];

		return config;
	});
