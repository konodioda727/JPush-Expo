# MX-JPush-Expo

<p align="center">
  一个面向 <strong>Expo prebuild / Dev Client</strong> 的 JPush Config Plugin。<br />
  自动注入 iOS / Android 原生配置，并支持主流 Android 厂商通道。
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/mx-jpush-expo"><img alt="npm version" src="https://img.shields.io/npm/v/mx-jpush-expo?logo=npm&label=npm"></a>
  <a href="https://github.com/konodioda727/JPush-Expo/actions/workflows/ci.yml"><img alt="CI status" src="https://img.shields.io/github/actions/workflow/status/konodioda727/JPush-Expo/ci.yml?branch=main&logo=githubactions&label=CI"></a>
  <a href="https://github.com/konodioda727/JPush-Expo/blob/main/LICENSE"><img alt="license" src="https://img.shields.io/github/license/konodioda727/JPush-Expo"></a>
  <img alt="Expo SDK 53+" src="https://img.shields.io/badge/Expo%20SDK-53%2B-000020?logo=expo">
  <img alt="Node >=18.18" src="https://img.shields.io/badge/Node-%3E%3D18.18-339933?logo=node.js&logoColor=white">
</p>

> [!IMPORTANT]
> JPush 不支持 Expo Go。本项目面向 `expo prebuild` 后的原生工程，适用于 Dev Client 或原生构建流程。

> [!TIP]
> 本项目持续参考并吸收以下资料：<br>
> [JPush 集成 Expo](https://juejin.cn/post/7423235127716659239) /<br>
> [Expo SDK 53+ 集成极光推送 iOS Swift](https://juejin.cn/post/7554288083597885467) /<br>
> [RunoMeow/jpush-expo-config-plugin](https://github.com/RunoMeow/jpush-expo-config-plugin)

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

适合这些场景：

- 你使用 Expo，但需要 JPush 和厂商通道能力
- 你希望把原生改动交给 Config Plugin 管理，而不是手改生成代码
- 你需要在 CI / 团队协作里稳定复现 `prebuild` 输出

## 支持矩阵

| 项目 | 版本 |
| --- | --- |
| Expo SDK | `53+` |
| 仓库开发基线 | `Expo SDK 53` |
| React Native | `0.76.9` |
| Node.js | `>= 18.18.0` |
| `jpush-react-native` | `3.1.9` |
| `jcore-react-native` | `2.3.0` |

## 快速开始

### 1. 安装依赖

```bash
npm install mx-jpush-expo
npm install jpush-react-native@3.1.9 jcore-react-native@^2.3.0
```

或使用 `pnpm`：

```bash
pnpm add mx-jpush-expo
pnpm add jpush-react-native@3.1.9 jcore-react-native@^2.3.0
```

### 2. 配置插件

推荐使用 `app.config.ts`，并把 Android 的敏感值交给环境变量或 `gradle.properties`。

### 3. 生成原生工程

```bash
npx expo prebuild
```

只刷新 Android：

```bash
npx expo prebuild -p android
```

## 推荐配置

```ts
import type { ConfigContext, ExpoConfig } from 'expo/config';
import 'dotenv/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const isProduction = process.env.EXPO_PUBLIC_ENV === 'production';

  return {
    ...config,
    plugins: [
      ...(config.plugins || []),
      [
        'mx-jpush-expo',
        {
          appKey: process.env.JPUSH_APP_KEY ?? '',
          channel: process.env.JPUSH_CHANNEL ?? 'developer-default',
          packageName:
            process.env.JPUSH_PKGNAME ?? config.android?.package ?? '',
          apsForProduction: isProduction,
          vendorChannels: {
            huawei: { enabled: true },
            fcm: { enabled: true },
            xiaomi: {
              appId: process.env.JPUSH_XIAOMI_APP_ID ?? '',
              appKey: process.env.JPUSH_XIAOMI_APP_KEY ?? '',
            },
            oppo: {
              appId: process.env.JPUSH_OPPO_APP_ID ?? '',
              appKey: process.env.JPUSH_OPPO_APP_KEY ?? '',
              appSecret: process.env.JPUSH_OPPO_APP_SECRET ?? '',
            },
            vivo: {
              appId: process.env.JPUSH_VIVO_APP_ID ?? '',
              appKey: process.env.JPUSH_VIVO_APP_KEY ?? '',
            },
            meizu: {
              appId: process.env.JPUSH_MEIZU_APP_ID ?? '',
              appKey: process.env.JPUSH_MEIZU_APP_KEY ?? '',
            },
            honor: {
              appId: process.env.JPUSH_HONOR_APP_ID ?? '',
            },
            nio: {
              appId: process.env.JPUSH_NIO_APP_ID ?? '',
            },
          },
        },
      ],
    ],
  };
};
```

### 配置要点

- `appKey`、`channel`、`packageName` 仍然是插件必填项
- iOS 初始化参数会写入 `Info.plist`，不再直接拼进 `AppDelegate.swift`
- Android `manifestPlaceholders` 优先读取环境变量或 `gradle.properties`
- `vendorChannels` 决定要注入哪些厂商 SDK 与占位符，厂商密钥本身建议交给环境变量

## 环境变量与厂商通道

Android 端的 `manifestPlaceholders` 读取优先级如下：

1. `System.getenv("...")`
2. `project.findProperty("...")`
3. 插件收到的默认值，仅 `JPUSH_PKGNAME`
4. 空字符串，其余字段

### 可用环境变量

| 变量名 | 说明 |
| --- | --- |
| `JPUSH_APP_KEY` | JPush AppKey |
| `JPUSH_CHANNEL` | JPush Channel |
| `JPUSH_PKGNAME` | Android 包名 |
| `JPUSH_XIAOMI_APP_ID` / `JPUSH_XIAOMI_APP_KEY` | 小米通道 |
| `JPUSH_OPPO_APP_ID` / `JPUSH_OPPO_APP_KEY` / `JPUSH_OPPO_APP_SECRET` | OPPO 通道 |
| `JPUSH_VIVO_APP_ID` / `JPUSH_VIVO_APP_KEY` | VIVO 通道 |
| `JPUSH_MEIZU_APP_ID` / `JPUSH_MEIZU_APP_KEY` | 魅族通道 |
| `JPUSH_HONOR_APP_ID` | 荣耀通道 |
| `JPUSH_NIO_APP_ID` | 蔚来通道 |

示例 `.env`：

```bash
JPUSH_APP_KEY=your-jpush-app-key
JPUSH_CHANNEL=developer-default
JPUSH_PKGNAME=com.your.app
JPUSH_XIAOMI_APP_ID=your-xiaomi-app-id
JPUSH_XIAOMI_APP_KEY=your-xiaomi-app-key
```

也可以把这些值写到 `android/gradle.properties`，构建时会通过 `project.findProperty(...)` 读取。

## 配置说明

- `appKey`、`channel`、`packageName` 仍然是插件必填项，因为 iOS 注入代码和参数校验发生在 Expo 配置阶段。
- iOS 现在改为从 `Info.plist` 读取 `JPUSH_APPKEY`、`JPUSH_CHANNEL` 和 `JPUSH_APS_FOR_PRODUCTION`，不再把这些值直接拼接进 `AppDelegate.swift`。
- 这能避免源码层的明文注入，但不能把它们变成客户端不可见的“秘密”，因为 JPush 初始化参数最终仍会出现在打包产物里。
- Android 侧生成的 `manifestPlaceholders` 不再把这些值写死到 `build.gradle` 中。
- `JPUSH_PKGNAME` 现在按 `System.getenv("JPUSH_PKGNAME") -> project.findProperty("JPUSH_PKGNAME") -> 插件收到的 packageName` 回退，不再依赖 `applicationId` 的声明顺序。
- `vendorChannels` 的作用是决定要注入哪些厂商 SDK 和哪些占位符；真正的厂商密钥建议通过环境变量或 `gradle.properties` 提供。
- 厂商通道配置是可选的，只需配置你实际使用的厂商。
- 厂商通道插件版本：**5.9.0**。

### 厂商通道额外要求

| 厂商 | 额外文件 | 签名要求 | 说明 |
| --- | --- | --- | --- |
| **华为** | `agconnect-services.json` | ✅ **必需** | 需在华为开发者联盟申请，配置 SHA256 指纹 |
| **FCM** | `google-services.json` | ❌ | 需在 Firebase 控制台申请 |
| **荣耀** | 无 | ✅ **必需** | 需在荣耀开发者平台配置 SHA256 指纹 |
| **蔚来** | 无 | ✅ **必需** | 需在蔚来开发者平台配置应用签名 |
| **小米** | 无 | ❌ | 仅需 AppId 和 AppKey |
| **OPPO** | 无 | ❌ | 仅需 AppKey、AppId 和 AppSecret |
| **VIVO** | 无 | ❌ | 仅需 AppKey 和 AppId |
| **魅族** | 无 | ❌ | 仅需 AppKey 和 AppId |

官方参数说明见：[极光推送 Android 厂商通道参数获取](https://docs.jiguang.cn/jpush/client/Android/android_3rd_param)

**配置文件位置**：

- 将 `agconnect-services.json`（华为）或 `google-services.json`（FCM）放到 `android/app/` 目录

### Android 签名配置示例

华为、荣耀、蔚来等厂商通道对应用签名更敏感，建议显式配置 release 签名，而不是只依赖默认 debug 签名。

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file("release.keystore")
            storePassword "your_store_password"
            keyAlias "your_key_alias"
            keyPassword "your_key_password"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            ...
        }
    }
}
```

建议把密码等字段放到 `gradle.properties`，不要直接提交到代码仓库：

```gradle
// 在 gradle.properties 中配置（不要提交到 Git）
RELEASE_STORE_PASSWORD=your_store_password
RELEASE_KEY_PASSWORD=your_key_password
RELEASE_KEY_ALIAS=your_key_alias

// 在 build.gradle 中读取
signingConfigs {
    release {
        storeFile file("release.keystore")
        storePassword project.hasProperty('RELEASE_STORE_PASSWORD') ? RELEASE_STORE_PASSWORD : ''
        keyAlias project.hasProperty('RELEASE_KEY_ALIAS') ? RELEASE_KEY_ALIAS : ''
        keyPassword project.hasProperty('RELEASE_KEY_PASSWORD') ? RELEASE_KEY_PASSWORD : ''
    }
}
```

## 插件会修改哪些原生文件

| 平台 | 文件 | 作用 |
| --- | --- | --- |
| iOS | `ios/<app>/Info.plist` | 写入 `JPUSH_*` 配置并合并 `UIBackgroundModes` |
| iOS | `ios/<app>/AppDelegate.swift` | 注入 JPush 初始化、APNs 回调和代理扩展 |
| iOS | `ios/<app>/<target>-Bridging-Header.h` | 复用或创建桥接头文件，保证 import 幂等 |
| Android | `android/app/src/main/AndroidManifest.xml` | 写入 `JPUSH_APPKEY` / `JPUSH_CHANNEL` meta-data |
| Android | `android/app/build.gradle` | 注入依赖、`manifestPlaceholders`、`abiFilters`、厂商插件 |
| Android | `android/build.gradle` | 注入厂商 Maven 仓库与 classpath |
| Android | `android/settings.gradle` | 注册 `jpush-react-native` / `jcore-react-native` 模块 |
| Android | `android/gradle.properties` | 写入华为 AGC 兼容性开关 |

## 如何验证生成结果

重新执行 `expo prebuild` 后，建议检查：

### iOS

- `Info.plist` 中存在：
  - `JPUSH_APPKEY`
  - `JPUSH_CHANNEL`
  - `JPUSH_APS_FOR_PRODUCTION`
- `UIBackgroundModes` 会保留宿主已有值，并补齐：
  - `fetch`
  - `remote-notification`
- `AppDelegate.swift` 中存在 `JPUSHService.setup`
- 如果项目使用 Swift，插件会优先复用已有 `SWIFT_OBJC_BRIDGING_HEADER`；未配置时会自动创建 `<target>-Bridging-Header.h`

### Android

`android/app/build.gradle` 中的 `manifestPlaceholders` 应保持“运行时读取”，而不是写死明文：

```gradle
manifestPlaceholders = [
    JPUSH_PKGNAME: System.getenv("JPUSH_PKGNAME") ?: (project.findProperty("JPUSH_PKGNAME") ?: "com.your.app"),
    JPUSH_APPKEY: System.getenv("JPUSH_APP_KEY") ?: (project.findProperty("JPUSH_APP_KEY") ?: ""),
    JPUSH_CHANNEL: System.getenv("JPUSH_CHANNEL") ?: (project.findProperty("JPUSH_CHANNEL") ?: "")
]
```

## 常见问题

### 是否支持 Expo Go？

不支持。JPush 需要原生工程和原生依赖，必须通过 `expo prebuild` 进入 Dev Client 或原生构建流程。

### 为什么 iOS 仍然要求在插件配置里填写 `appKey` / `channel`？

因为参数校验和 `Info.plist` 注入都发生在 Expo 配置阶段。它们不会再被直接拼进 `AppDelegate.swift`，但仍然需要在配置阶段提供。

### Android 遇到 Gradle 插件版本错误怎么办？

如果你遇到类似 `com.android.tools.build:gradle is no set in the build.gradle file` 的错误，需要检查业务项目自己的 `android/build.gradle` 与 Expo 版本是否匹配。这不是本插件主动引入的行为变更。

### iOS 推送证书或注册异常怎么排查？

- 检查推送证书是否过期，以及开发 / 生产环境是否匹配
- 检查 Bundle ID 是否与极光控制台配置完全一致
- 检查推送权限是否已正确申请
- 如果是冷启动通知异常，优先检查监听器与 JPush 初始化顺序

### 厂商通道推送失败怎么排查？

- 华为 / 荣耀 / 蔚来：先确认签名或 SHA256 指纹配置正确
- 所有厂商：确认 AppId / AppKey / AppSecret 是否填写正确
- 华为 / FCM：确认 `agconnect-services.json` / `google-services.json` 已放到 `android/app/`

### 直接改 `node_modules/mx-jpush-expo` 可以吗？

不建议。重装依赖后会丢失，正式方式建议使用 `pnpm patch mx-jpush-expo` 或维护自己的 fork。

## 开发与测试

```bash
npm run build
npm run test -- --runInBand
npm run lint
```

相关文档：

- 开发与维护流程见 [`DEVELOPMENT.md`](./DEVELOPMENT.md)
- 插件内部结构见 [`plugin/README.md`](./plugin/README.md)
- 历史版本更新见 [`CHANGELOG.md`](./CHANGELOG.md)

### 测试覆盖重点

- 参数校验与插件入口 smoke
- iOS `Info.plist` 合并与 Bridging Header 创建 / 幂等
- 当前主线以 iOS fixture-based 回归测试为主
- Android 原生输出和 `AppDelegate` 细粒度回归测试会在后续 PR 中继续补齐

## 项目结构

```text
mx-jpush-expo/
├── app.plugin.js                 # 主入口文件
├── plugin/                       # 插件源码和构建
│   ├── src/                      # TypeScript 源码
│   │   ├── index.ts              # 插件主入口
│   │   ├── types.ts              # 类型定义和参数校验
│   │   ├── utils/                # 工具模块
│   │   │   ├── config.ts         # 全局配置管理
│   │   │   ├── codeValidator.ts  # 注入结果校验
│   │   │   └── generateCode.ts   # 原生代码注入工具
│   │   ├── ios/                  # iOS 平台配置
│   │   │   ├── index.ts          # iOS 配置集成入口
│   │   │   ├── infoPlist.ts      # Info.plist 配置
│   │   │   ├── appDelegate.ts    # AppDelegate 实现配置
│   │   │   └── bridgingHeader.ts # Swift/OC 桥接头文件配置
│   │   └── android/              # Android 平台配置
│   │       ├── index.ts          # Android 配置集成入口
│   │       ├── androidManifest.ts # AndroidManifest.xml 配置
│   │       ├── appBuildGradle.ts # app/build.gradle 配置
│   │       ├── projectBuildGradle.ts # project/build.gradle 配置
│   │       ├── settingsGradle.ts # settings.gradle 配置
│   │       └── gradleProperties.ts # gradle.properties 配置
│   ├── build/                    # 编译后的 JavaScript 文件（npm 发布）
│   ├── __tests__/                # 测试目录
│   │   ├── fixtures/             # 原生工程 fixture
│   │   │   └── ios-project/
│   │   ├── iosFixture.ts         # iOS fixture helper
│   │   └── *.test.ts             # Jest 用例
│   ├── tsconfig.json             # TypeScript 配置
│   └── jest.config.js            # Jest 测试配置
├── .github/workflows/ci.yml      # CI 质量检查
├── CHANGELOG.md                  # 历史更新日志
└── README.md                     # 项目说明
```

插件内部说明见 [plugin/README.md](./plugin/README.md)。

## 最近更新

- iOS `UIBackgroundModes` 改为合并写入，不再覆盖宿主已有后台模式
- Swift `Bridging Header` 支持优先复用、缺失自动创建，并保持幂等
- 补齐 iOS fixture-based 原生回归测试
- 加入 ESLint 与 CI 质量闭环
- 对齐 Expo SDK 53 的版本声明与仓库开发基线
- 历史版本更新已整理到 [CHANGELOG.md](./CHANGELOG.md)

## 致谢与许可

感谢以下掘金文章作者的技术分享：

- [@折七](https://juejin.cn/user/7423235127716659239) - JPush 集成 Expo 基础方案

同时也感谢以下资料与实现思路的启发：

- [JPush 集成 Expo](https://juejin.cn/post/7423235127716659239)
- [Expo SDK 53+ 集成极光推送 iOS Swift](https://juejin.cn/post/7554288083597885467)
- [RunoMeow/jpush-expo-config-plugin](https://github.com/RunoMeow/jpush-expo-config-plugin)

本项目使用 [MIT License](./LICENSE)。
