/**
 * Android app/build.gradle 配置
 * 添加 JPush 依赖和 manifestPlaceholders
 */

import { ConfigPlugin, withAppBuildGradle } from "expo/config-plugins";
import {
	getAppKey,
	getChannel,
	getPackageName,
	getVendorChannels,
} from "../utils/config";
import { mergeContents } from "../utils/generateCode";
import { Validator } from "../utils/codeValidator";

/**
 * 生成 NDK abiFilters 配置
 */
const getNdkConfig = (): string => {
	return `ndk {
                //选择要添加的对应 cpu 类型的 .so 库。
                abiFilters 'arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64'
            }`;
};

/**
 * 生成 manifestPlaceholders 代码
 */
const getManifestPlaceholders = (): string => {
	const vendorChannels = getVendorChannels();
	const placeholders: string[] = [
		`JPUSH_PKGNAME: "${getPackageName()}"`,
		`JPUSH_APPKEY: "${getAppKey()}"`,
		`JPUSH_CHANNEL: "${getChannel()}"`,
	];

	// 添加厂商通道配置
	if (vendorChannels?.meizu) {
		placeholders.push(`MEIZU_APPKEY: "${vendorChannels.meizu.appKey}"`);
		placeholders.push(`MEIZU_APPID: "${vendorChannels.meizu.appId}"`);
	}

	if (vendorChannels?.xiaomi) {
		placeholders.push(`XIAOMI_APPID: "${vendorChannels.xiaomi.appId}"`);
		placeholders.push(`XIAOMI_APPKEY: "${vendorChannels.xiaomi.appKey}"`);
	}

	if (vendorChannels?.oppo) {
		placeholders.push(`OPPO_APPKEY: "${vendorChannels.oppo.appKey}"`);
		placeholders.push(`OPPO_APPID: "${vendorChannels.oppo.appId}"`);
		placeholders.push(`OPPO_APPSECRET: "${vendorChannels.oppo.appSecret}"`);
	}

	if (vendorChannels?.vivo) {
		placeholders.push(`VIVO_APPKEY: "${vendorChannels.vivo.appKey}"`);
		placeholders.push(`VIVO_APPID: "${vendorChannels.vivo.appId}"`);
	}

	if (vendorChannels?.honor) {
		placeholders.push(`HONOR_APPID: "${vendorChannels.honor.appId}"`);
	}

	if (vendorChannels?.nio) {
		placeholders.push(`NIO_APPID: "${vendorChannels.nio.appId}"`);
	}

	return `manifestPlaceholders = [
                ${placeholders.join(",\n                ")}
            ]`;
};

/**
 * 生成 JPush SDK 依赖代码
 */
const getJPushDependencies = (): string => {
	const vendorChannels = getVendorChannels();
	const dependencies: string[] = [
		`// JPush React Native 桥接（已包含 JPush 核心 SDK）`,
		`implementation project(':jpush-react-native')`,
		`implementation project(':jcore-react-native')`,
	];

	// 添加厂商通道 SDK 依赖
	if (vendorChannels) {
		const hasVendorChannels = Object.keys(vendorChannels).length > 0;
		if (hasVendorChannels) {
			dependencies.push(``, `// 厂商通道 SDK（JPush 5.9.0）`);
		}

		// 华为推送
		if (vendorChannels.huawei) {
			dependencies.push(
				`// 华为厂商`,
				`implementation 'com.huawei.agconnect:agconnect-core:1.5.2.300'`,
				`implementation 'cn.jiguang.sdk.plugin:huawei:5.9.0'`,
			);
		}

		// FCM 推送
		if (vendorChannels.fcm) {
			dependencies.push(
				`// FCM 厂商`,
				`implementation 'com.google.firebase:firebase-messaging:24.1.0'`,
				`implementation 'cn.jiguang.sdk.plugin:fcm:5.9.0'`,
			);
		}

		// 魅族推送
		if (vendorChannels.meizu) {
			dependencies.push(
				`// 魅族厂商`,
				`implementation 'cn.jiguang.sdk.plugin:meizu:5.9.0'`,
			);
		}

		// VIVO 推送
		if (vendorChannels.vivo) {
			dependencies.push(
				`// VIVO 厂商`,
				`implementation 'cn.jiguang.sdk.plugin:vivo:5.9.0'`,
			);
		}

		// 小米推送
		if (vendorChannels.xiaomi) {
			dependencies.push(
				`// 小米厂商`,
				`implementation 'cn.jiguang.sdk.plugin:xiaomi:5.9.0'`,
			);
		}

		// OPPO 推送
		if (vendorChannels.oppo) {
			dependencies.push(
				`// OPPO 厂商`,
				`implementation 'cn.jiguang.sdk.plugin:oppo:5.9.0'`,
				`// OPPO 3.1.0 aar 及其以上版本需要添加以下依赖`,
				`implementation 'com.google.code.gson:gson:2.6.2'`,
				`implementation 'androidx.annotation:annotation:1.1.0'`,
			);
		}

		// 荣耀推送（需要配置应用签名 SHA256 指纹）
		if (vendorChannels.honor) {
			dependencies.push(
				`// 荣耀厂商`,
				`implementation 'cn.jiguang.sdk.plugin:honor:5.9.0'`,
			);
		}

		// 蔚来推送（需要配置应用签名）
		if (vendorChannels.nio) {
			dependencies.push(
				`// 蔚来厂商`,
				`implementation 'cn.jiguang.sdk.plugin:nio:5.9.0'`,
			);
		}
	}

	return dependencies.join("\n    ");
};

/**
 * 生成 apply plugin 语句
 */
const getApplyPlugins = (): string => {
	const vendorChannels = getVendorChannels();
	const plugins: string[] = [];

	if (vendorChannels?.fcm) {
		plugins.push(`apply plugin: 'com.google.gms.google-services'`);
	}

	return plugins.length > 0 ? plugins.join("\n") : "";
};

/**
 * 配置 Android build.gradle
 */
export const withAndroidAppBuildGradle: ConfigPlugin = (config) =>
	withAppBuildGradle(config, (config) => {
		const validator = new Validator(config.modResults.contents);

		// 1. 添加 NDK abiFilters 配置
		validator.register("abiFilters", (src) => {
			console.log("\n[MX_JPush_Expo] 配置 build.gradle NDK abiFilters ...");

			return mergeContents({
				src,
				newSrc: getNdkConfig(),
				tag: "jpush-ndk-config",
				anchor: /versionName\s+["'][\d.]+["']/, // 匹配 versionName "1.0"
				offset: 1, // 在 versionName 的下一行插入
				comment: "//",
			});
		});

		// 2. 添加 manifestPlaceholders
		validator.register("JPUSH_APPKEY", (src) => {
			console.log(
				"\n[MX_JPush_Expo] 配置 build.gradle manifestPlaceholders ...",
			);

			return mergeContents({
				src,
				newSrc: getManifestPlaceholders(),
				tag: "jpush-manifest-placeholders",
				anchor: /defaultConfig\s*\{/, // 在 defaultConfig 块内插入
				offset: 1, // 在 defaultConfig { 的下一行插入
				comment: "//",
			});
		});

		// 3. 添加通用 libs 目录依赖（用于厂商通道的 jar/aar 文件）
		validator.register("fileTree", (src) => {
			console.log("\n[MX_JPush_Expo] 配置 build.gradle libs 目录依赖 ...");

			return mergeContents({
				src,
				newSrc: `implementation fileTree(include: ['*.jar','*.aar'], dir: 'libs')`,
				tag: "jpush-libs-filetree",
				anchor: /dependencies \{/,
				offset: 1, // 在 dependencies { 的下一行插入
				comment: "//",
			});
		});

		// 4. 添加 JPush 依赖
		validator.register(
			"implementation project(':jpush-react-native')",
			(src) => {
				console.log("\n[MX_JPush_Expo] 配置 build.gradle dependencies ...");

				return mergeContents({
					src,
					newSrc: getJPushDependencies(),
					tag: "jpush-dependencies",
					anchor: /dependencies \{/,
					offset: 1, // 在 dependencies { 的下一行插入
					comment: "//",
				});
			},
		);

		// 5. 添加 apply plugin 语句（在文件末尾）
		const applyPlugins = getApplyPlugins();
		if (applyPlugins) {
			validator.register("apply plugin:", (src) => {
				console.log("\n[MX_JPush_Expo] 配置 build.gradle apply plugins ...");

				// 检查是否已经存在标记
				if (src.includes("// @generated begin jpush-apply-plugins")) {
					return { contents: src, didMerge: false, didClear: false };
				}

				// 直接在文件末尾追加
				const newContents =
					src +
					"\n\n// @generated begin jpush-apply-plugins - expo prebuild (DO NOT MODIFY)\n" +
					applyPlugins +
					"\n// @generated end jpush-apply-plugins\n";

				return { contents: newContents, didMerge: true, didClear: false };
			});
		}

		config.modResults.contents = validator.invoke();
		return config;
	});
