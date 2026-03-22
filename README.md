# MX-JPUSH-Expo
expo接入JPUSH脚本

> 📚 **本项目基于以下掘金文章开发和更新：**
> - [JPush 集成 Expo](https://juejin.cn/post/7423235127716659239) - 基础集成方案
> - [Expo SDK 53+ 集成极光推送 iOS Swift](https://juejin.cn/post/7554288083597885467) - 最新 Swift 版本实现
> - [JPush-expo-config-plugin](https://github.com/RunoMeow/jpush-expo-config-plugin) - 参考实现

## 工作原理
由于极光推送不支持`expo`模式，因此采用如下方式：
```text
`prebuild`为裸工作流 -> 代码注入
```

## 版本要求
- Expo SDK: 53+
- 仓库开发基线: Expo SDK 53
- React Native: 0.76.9（Expo SDK 53 基线版本，由 Expo 锁定）
- Node.js: 18.18+（仓库开发环境）
- jpush-react-native: 3.1.9
- jcore-react-native: 2.3.0

## 使用方式

### 1.下载
- 插件下载：
```bash
npm i mx-jpush-expo
```
- `jpush`依赖包 `jpush-react-native` 和 `jcore-react-native` 下载（推荐使用指定版本）
```bash
npm install jpush-react-native@3.1.9 jcore-react-native@^2.3.0 --save
# 或使用 pnpm
pnpm add jpush-react-native@3.1.9 jcore-react-native@^2.3.0
```

### 2.集成
推荐使用 `app.config.ts`，并把 Android 端的敏感值交给环境变量或 `gradle.properties`。这样 `expo prebuild` 生成的 `android/app/build.gradle` 不会再写入明文。

#### 推荐配置
```ts
import type { ConfigContext, ExpoConfig } from 'expo/config';
import 'dotenv/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const isProduction = process.env.EXPO_PUBLIC_ENV === 'production';

  return {
    ...config,
    plugins: (config.plugins || []).map(plugin => {
      const [name, configurations] = plugin as [string, Record<string, any>];

      if (name === 'mx-jpush-expo') {
        return [
          name,
          {
            ...configurations,
            apsForProduction: isProduction,
            appKey: process.env.JPUSH_APP_KEY ?? '',
            channel: process.env.JPUSH_CHANNEL ?? configurations?.channel ?? '',
            packageName:
              process.env.JPUSH_PKGNAME ??
              configurations?.packageName ??
              config.android?.package ??
              '',
            vendorChannels: {
              xiaomi: {
                appId: process.env.JPUSH_XIAOMI_APP_ID,
                appKey: process.env.JPUSH_XIAOMI_APP_KEY,
              },
              oppo: {
                appKey: process.env.JPUSH_OPPO_APP_KEY,
                appId: process.env.JPUSH_OPPO_APP_ID,
                appSecret: process.env.JPUSH_OPPO_APP_SECRET,
              },
              vivo: {
                appKey: process.env.JPUSH_VIVO_APP_KEY,
                appId: process.env.JPUSH_VIVO_APP_ID,
              },
              meizu: {
                appKey: process.env.JPUSH_MEIZU_APP_KEY,
                appId: process.env.JPUSH_MEIZU_APP_ID,
              },
              honor: {
                appId: process.env.JPUSH_HONOR_APP_ID,
              },
              nio: {
                appId: process.env.JPUSH_NIO_APP_ID,
              },
              huawei: {
                enabled: true,
              },
              fcm: {
                enabled: true,
              },
            },
          },
        ];
      }

      return plugin;
    }),
  };
};
```

#### Android 端环境变量
Android `manifestPlaceholders` 现在按下面的优先级取值：

1. `System.getenv("...")`
2. `project.findProperty("...")`
3. 插件收到的默认值（仅 `JPUSH_PKGNAME`）
4. 空字符串（其余字段）

可用环境变量名：

- `JPUSH_APP_KEY`
- `JPUSH_CHANNEL`
- `JPUSH_PKGNAME`
- `JPUSH_XIAOMI_APP_ID`
- `JPUSH_XIAOMI_APP_KEY`
- `JPUSH_OPPO_APP_ID`
- `JPUSH_OPPO_APP_KEY`
- `JPUSH_OPPO_APP_SECRET`
- `JPUSH_VIVO_APP_ID`
- `JPUSH_VIVO_APP_KEY`
- `JPUSH_MEIZU_APP_ID`
- `JPUSH_MEIZU_APP_KEY`
- `JPUSH_HONOR_APP_ID`
- `JPUSH_NIO_APP_ID`

示例 `.env`：

```bash
JPUSH_APP_KEY=your-jpush-app-key
JPUSH_CHANNEL=developer-default
JPUSH_PKGNAME=com.your.app
JPUSH_XIAOMI_APP_ID=your-xiaomi-app-id
JPUSH_XIAOMI_APP_KEY=your-xiaomi-app-key
```

也可以把这些值写到 `android/gradle.properties`，构建时会通过 `project.findProperty(...)` 读取。

#### 配置说明
- `appKey`、`channel`、`packageName` 仍然是插件必填项，因为 iOS 注入代码和参数校验发生在 Expo 配置阶段。
- iOS 现在改为从 `Info.plist` 读取 `JPUSH_APPKEY`、`JPUSH_CHANNEL` 和 `JPUSH_APS_FOR_PRODUCTION`，不再把这些值直接拼进 `AppDelegate.swift`。
- 这能避免源码层的明文注入，但不能把它们变成客户端不可见的“秘密”，因为 JPush 初始化参数最终仍会出现在打包产物里。
- Android 侧生成的 `manifestPlaceholders` 不再把这些值写死到 `build.gradle` 中。
- `JPUSH_PKGNAME` 现在按 `System.getenv("JPUSH_PKGNAME") -> project.findProperty("JPUSH_PKGNAME") -> 插件收到的 packageName` 回退，不再依赖 `applicationId` 的声明顺序。
- `vendorChannels` 的作用是决定要注入哪些厂商 SDK 和哪些占位符；真正的厂商密钥建议通过环境变量或 `gradle.properties` 提供。
- 厂商通道配置是可选的，只需配置你实际使用的厂商。
- 厂商通道插件版本：**5.9.0**。

#### 厂商通道额外配置

| 厂商 | 配置文件 | 应用签名 | 说明 |
|------|---------|---------|------|
| **华为** | `agconnect-services.json` | ✅ **必需** | 需在华为开发者联盟申请，配置 SHA256 指纹 |
| **FCM** | `google-services.json` | ❌ | 需在 Firebase 控制台申请 |
| **荣耀** | - | ✅ **必需** | 需在荣耀开发者平台配置 SHA256 指纹 |
| **蔚来** | - | ✅ **必需** | 需在蔚来开发者平台配置应用签名 |
| **小米** | - | ❌ | 仅需 AppId 和 AppKey |
| **OPPO** | - | ❌ | 仅需 AppKey、AppId 和 AppSecret |
| **VIVO** | - | ❌ | 仅需 AppKey 和 AppId |
| **魅族** | - | ❌ | 仅需 AppKey 和 AppId |

各厂商通道的详细配置步骤请参考极光官方文档：

📖 **[极光推送 - Android 厂商通道参数获取](https://docs.jiguang.cn/jpush/client/Android/android_3rd_param)**

**配置文件位置**：
- 将 `agconnect-services.json`（华为）或 `google-services.json`（FCM）放到 `android/app/` 目录

## 3.`prebuild`
```bash
npx expo prebuild -p android
```

如果同时需要刷新 iOS 工程，可以使用：

```bash
npx expo prebuild
```

## 4.检验
重新生成后，检查 `android/app/build.gradle` 中的 `manifestPlaceholders`，应当是下面这种形式，而不是明文：

```gradle
manifestPlaceholders = [
    JPUSH_PKGNAME: System.getenv("JPUSH_PKGNAME") ?: (project.findProperty("JPUSH_PKGNAME") ?: "com.your.app"),
    JPUSH_APPKEY: System.getenv("JPUSH_APP_KEY") ?: (project.findProperty("JPUSH_APP_KEY") ?: ""),
    JPUSH_CHANNEL: System.getenv("JPUSH_CHANNEL") ?: (project.findProperty("JPUSH_CHANNEL") ?: "")
]
```

如果你是在业务项目里临时直接改 `node_modules/mx-jpush-expo`，重装依赖后修改会丢失，正式建议使用 `pnpm patch mx-jpush-expo` 固化。

## 更新日志

### v1.2.2 (2026-03-08)

- 修复 `JPUSH_PKGNAME` 依赖 `applicationId` 声明顺序的问题
- `JPUSH_PKGNAME` 改为按 `环境变量 -> gradle.properties -> 插件 packageName` 回退

### v1.2.1 (2026-03-08)

- Android `manifestPlaceholders` 改为在 Gradle 构建时读取环境变量或 `gradle.properties`
- 不再把 `JPUSH_APPKEY`、`JPUSH_CHANNEL` 和厂商密钥明文写入 `android/app/build.gradle`
- iOS 改为从 `Info.plist` 读取 JPush 初始化参数，不再把这些值直接注入 `AppDelegate.swift`
- README 更新为 `app.config.ts + 环境变量` 的推荐用法

### v1.1.0 (2025-12-17)

**🎉 完整支持 Android 厂商通道**

- ✨ 新增完整的 Android 厂商通道支持（华为、FCM、小米、OPPO、VIVO、魅族、荣耀、蔚来）
- ✨ 自动配置厂商通道 SDK 依赖（JPush 5.9.0）
- ✨ 自动配置 `manifestPlaceholders`（包括 `JPUSH_PKGNAME`）
- ✨ 自动配置 NDK `abiFilters`
- ✨ 自动配置华为和 FCM 的 `apply plugin` 语句
- ✨ 自动配置 project/build.gradle（Maven 仓库和 classpath）
- ✨ 新增 `packageName` 必填配置项
- � 完善厂商文通道配置文档，添加极光官方文档链接
- 📝 添加应用签名配置说明（华为、荣耀、蔚来必需）
- 🔧 优化代码结构，移除手动下载 aar 的要求

### v1.0.2 (2024-09-27)
> 📖 **参考文章**：[Expo SDK 53+ 集成极光推送 iOS Swift](https://juejin.cn/post/7554288083597885467)

- ✨ 支持 Expo SDK 53+ 和 React Native 0.79.5+
- ✨ 添加 iOS Swift/OC 混编支持（Bridging Header 配置）
- ✨ 更新依赖版本：jpush-react-native@3.1.9, jcore-react-native@2.3.0
- ✨ 添加推送权限说明配置（NSUserTrackingUsageDescription, NSMicrophoneUsageDescription）
- 🐛 修复 iOS 新架构下的兼容性问题
- 📝 更新文档，添加最新集成指南

### v1.0.1
> 📖 **参考文章**：[JPush 集成 Expo](https://juejin.cn/post/7423235127716659239)

- 初始版本发布
- 支持基础的 iOS 和 Android 集成

## 注意事项

### iOS 配置
1. 确保在 Xcode 中开启 Push Notifications 能力
2. 在极光推送控制台上传正确的推送证书（Development/Production）
3. 验证 Bundle ID 与极光控制台完全匹配
4. 如果使用 Swift，插件会自动配置 Bridging Header

### Android 配置
1. 确保在 AndroidManifest.xml 中已声明必要的权限
2. 检查 Gradle 配置是否正确
3. **签名配置（重要）**：华为、荣耀等厂商通道需要应用签名才能正常工作
   - 将签名文件（如 `release.keystore`）放到 `android/app/` 目录
   - 在 `android/app/build.gradle` 中配置签名：
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
   - **安全提示**：不要将密码直接写在代码中，建议使用环境变量或 `gradle.properties`：
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

### 常见问题

#### iOS 相关
- **推送证书问题**：检查证书是否过期，环境是否匹配（开发/生产）
- **注册 ID 获取失败**：检查网络连接、AppKey 配置、推送权限
- **冷启动通知丢失**：确保按正确顺序初始化（先设置监听器，再初始化 JPush）

#### Android 相关
- **Gradle 版本错误**：如果遇到 `com.android.tools.build:gradle is no set in the build.gradle file` 错误，需要在项目根目录的 `android/build.gradle` 中给 Gradle 插件添加版本号：
  ```gradle
  buildscript {
      dependencies {
          // 修改前
          classpath('com.android.tools.build:gradle')
          
          // 修改后（添加版本号）
          classpath('com.android.tools.build:gradle:8.6.3')
      }
  }
  ```
  版本号应与你的项目 Gradle 版本匹配，常见版本：
  - Expo SDK 51+: `8.6.3` 或更高
  - Expo SDK 50: `8.3.0`

- **厂商通道推送失败**：
  - 华为/荣耀/蔚来：检查是否配置了正确的 SHA256 签名指纹
  - 所有厂商：确认 AppId/AppKey 配置正确
  - 检查是否下载了必需的配置文件（华为的 `agconnect-services.json`、FCM 的 `google-services.json`）

更多问题排查请参考：[Expo SDK 53+ 集成极光推送 iOS Swift - 常见问题与故障排查](https://juejin.cn/post/7554288083597885467)

## 项目结构

```
mx-jpush-expo/
├── app.plugin.js              # 主入口文件
├── plugin/                    # 插件源码和构建
│   ├── src/                  # TypeScript 源码
│   │   ├── index.ts          # 插件主入口
│   │   ├── types.ts          # 类型定义
│   │   ├── utils/            # 工具模块
│   │   │   └── config.ts     # 全局配置管理
│   │   ├── ios/              # iOS 平台配置
│   │   │   ├── index.ts      # iOS 配置集成
│   │   │   ├── infoPlist.ts  # Info.plist 配置
│   │   │   ├── appDelegateInterface.ts  # AppDelegate 接口
│   │   │   ├── appDelegate.ts    # AppDelegate 实现
│   │   │   ├── bridgingHeader.ts # Swift/OC 桥接头文件
│   │   │   └── podfile.ts    # Podfile 配置
│   │   └── android/          # Android 平台配置
│   │       ├── index.ts      # Android 配置集成
│   │       ├── androidManifest.ts # AndroidManifest 配置
│   │       ├── appBuildGradle.ts # build.gradle 配置
│   │       └── settingsGradle.ts # settings.gradle 配置
│   ├── build/                # 编译后的 JS 文件（发布到 npm）
│   ├── __tests__/            # 单元测试
│   ├── tsconfig.json         # TypeScript 配置
│   └── jest.config.js        # Jest 测试配置
├── package.json
├── README.md
└── MIGRATION.md              # TypeScript 迁移指南
```

详细的模块说明请查看 [plugin/README.md](./plugin/README.md)

## 开发

### 构建插件

```bash
npm run build
```

### 运行测试

```bash
npm run test
```

### 清理构建文件

```bash
npm run clean
```

## 致谢

感谢以下掘金文章作者的技术分享：
- [@折七](https://juejin.cn/user/7423235127716659239) - JPush 集成 Expo 基础方案

## License

MIT
