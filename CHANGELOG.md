# Changelog

历史版本更新从 README 中拆出，便于首页专注接入说明与使用导航。

## v1.2.5 (2026-04-15)

- Android `manifestPlaceholders` 改为在宿主现有配置后追加，保留非冲突的已有键
- Android `app/build.gradle` 注入不再依赖 `versionName` 文本锚点
- iOS `AppDelegate.swift` 中的 JPush 调试日志仅在 `DEBUG` 构建启用
- 移除插件内部的历史全局配置 helper，并对齐 `createRunOncePlugin` 版本元数据
- 更新 prebuild、测试与本地发布流程文档

## v1.2.4 (2026-03-27)

- 修复 `app.config.js` 配置不生效的问题
- 
## v1.2.3-beta.0 (2026-03-27)

- 基于当前 `1.2.2` 代码的测试发布/重发，用于验证发布与安装流程，无新增功能变更

## v1.2.2 (2026-03-08)

- 修复 `JPUSH_PKGNAME` 依赖 `applicationId` 声明顺序的问题
- `JPUSH_PKGNAME` 改为按 `环境变量 -> gradle.properties -> 插件 packageName` 回退

## v1.2.1 (2026-03-08)

- Android `manifestPlaceholders` 改为在 Gradle 构建时读取环境变量或 `gradle.properties`
- 不再把 `JPUSH_APPKEY`、`JPUSH_CHANNEL` 和厂商密钥明文写入 `android/app/build.gradle`
- iOS 改为从 `Info.plist` 读取 JPush 初始化参数，不再把这些值直接注入 `AppDelegate.swift`
- README 更新为 `app.config.ts + 环境变量` 的推荐用法

## v1.2.0 (2025-12-19)

- 升级华为 AGConnect 依赖
- 新增 HMS Push 支持

## v1.1.0 (2025-12-17)

**🎉 完整支持 Android 厂商通道**

- ✨ 新增完整的 Android 厂商通道支持（华为、FCM、小米、OPPO、VIVO、魅族、荣耀、蔚来）
- ✨ 自动配置厂商通道 SDK 依赖（JPush 5.9.0）
- ✨ 自动配置 `manifestPlaceholders`（包括 `JPUSH_PKGNAME`）
- ✨ 自动配置 NDK `abiFilters`
- ✨ 自动配置华为和 FCM 的 `apply plugin` 语句
- ✨ 自动配置 project/build.gradle（Maven 仓库和 classpath）
- ✨ 新增 `packageName` 必填配置项
- 📝 完善厂商通道配置文档，添加极光官方文档链接
- 📝 添加应用签名配置说明（华为、荣耀、蔚来必需）
- 🔧 优化代码结构，移除手动下载 aar 的要求

## v1.0.2 (2025-12-09)

> 📖 **参考文章**：[Expo SDK 53+ 集成极光推送 iOS Swift](https://juejin.cn/post/7554288083597885467)

- ✨ 支持 Expo SDK 53+ 和 React Native 0.79.5+
- ✨ 添加 iOS Swift/OC 混编支持（Bridging Header 配置）
- ✨ 更新依赖版本：jpush-react-native@3.1.9, jcore-react-native@2.3.0
- ✨ 添加推送权限说明配置（NSUserTrackingUsageDescription, NSMicrophoneUsageDescription）
- 🐛 修复 iOS 新架构下的兼容性问题
- 📝 更新文档，添加最新集成指南

## v1.0.1 (2024-11-19)

> 📖 **参考文章**：[JPush 集成 Expo](https://juejin.cn/post/7423235127716659239)

- 初始版本发布
- 支持基础的 iOS 和 Android 集成
