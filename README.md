<div align="center">

  <h1>MX-JPush-Expo</h1>

  <p>
    一个面向 <strong>Expo prebuild / Dev Client</strong> 的 JPush Config Plugin。<br />
    自动注入 iOS / Android 原生配置，完整支持主流 Android 厂商通道，保障推送送达率。
  </p>

  <p>
    <a href="https://www.npmjs.com/package/mx-jpush-expo"><img alt="npm version" src="https://img.shields.io/npm/v/mx-jpush-expo?logo=npm&label=npm"></a>
    <a href="https://github.com/konodioda727/JPush-Expo/actions/workflows/ci.yml"><img alt="CI status" src="https://img.shields.io/github/actions/workflow/status/konodioda727/JPush-Expo/ci.yml?branch=main&logo=githubactions&label=CI"></a>
    <a href="https://github.com/konodioda727/JPush-Expo/blob/main/LICENSE"><img alt="license" src="https://img.shields.io/github/license/konodioda727/JPush-Expo"></a>
    <img alt="Expo SDK 53+" src="https://img.shields.io/badge/Expo%20SDK-53%2B-000020?logo=expo">
    <a href="https://nodejs.org/"><img alt="Node.js >=18.18.0" src="https://img.shields.io/badge/Node.js-%3E%3D18.18.0-339933?logo=nodedotjs&logoColor=white"></a>
  </p>

</div>

> [!IMPORTANT]
> JPush 不支持 Expo Go。本项目面向 `expo prebuild` 后的原生工程，适用于 Dev Client 或原生构建流程。

> [!TIP]
> 本项目持续参考并吸收以下资料：<br>
> - [JPush 集成 Expo](https://juejin.cn/post/7423235127716659239)
> - [Expo SDK 53+ 集成极光推送 iOS Swift](https://juejin.cn/post/7554288083597885467)
> - [RunoMeow/jpush-expo-config-plugin](https://github.com/RunoMeow/jpush-expo-config-plugin)

## 最新特性

- ✅ **完整厂商通道支持**：覆盖华为、FCM、小米、OPPO、VIVO、魅族、荣耀、蔚来等主流厂商，自动配置SDK依赖与原生参数
- ✅ **安全密钥管理**：Android 敏感参数支持从环境变量/gradle.properties读取，不再明文写入构建脚本
- ✅ **iOS 安全优化**：JPush 初始化参数从 Info.plist 读取，不再直接注入 AppDelegate.swift 源码
- ✅ **多环境适配**：支持生产/开发环境自动切换 APNs 配置，适配 CI/CD 流水线
- ✅ **幂等注入机制**：Swift 桥接头文件、后台模式配置自动合并，不会覆盖宿主项目已有配置

## 目录

- [为什么使用它](#为什么使用它)
- [支持矩阵](#支持矩阵)
- [快速开始](#快速开始)
- [推荐配置](#推荐配置)
- [环境变量与厂商通道](#环境变量与厂商通道)
- [配置说明](#配置说明)
- [插件会修改哪些原生文件](#插件会修改哪些原生文件)
- [如何验证生成结果](#如何验证生成结果)
- [常见问题](#常见问题)
- [开发与测试](#开发与测试)
- [项目结构](#项目结构)
- [最近更新](#最近更新)
- [致谢与许可](#致谢与许可)

## 为什么使用它

`mx-jpush-expo` 把 Expo 项目接入 JPush 时最容易反复手改的原生步骤，收敛成一次 `expo prebuild`：

- 自动写入 iOS `Info.plist` 的 JPush 配置和后台模式
- 自动注入 iOS `AppDelegate.swift` 的 JPush 初始化与回调代码
- 自动复用或创建 Swift `Bridging Header`
- 自动修改 Android `AndroidManifest.xml`、`build.gradle`、`settings.gradle`
- 支持华为、FCM、小米、OPPO、VIVO、魅族、荣耀、蔚来等厂商通道注入
- 敏感参数支持环境变量注入，避免密钥明文提交到代码仓库

适合这些场景：

- 你使用 Expo，但需要 JPush 和厂商通道能力
- 你希望把原生改动交给 Config Plugin 管理，而不是手改生成代码
- 你需要在 CI / 团队协作里稳定复现 `prebuild` 输出
- 你需要严格的密钥安全管理，避免敏感信息泄露