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
- React Native: 0.79.5+
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
在`app.config.js`的`plugin`中注册插件

#### 基础配置
```js
{
  "expo": {
    // ...
    "plugins": [
      [
        // ...
        "mx-jpush-expo",
        {
          "appKey": "你的极光推送AppKey",
          "channel": "你的极光推送Channel",
          "packageName": "com.your.app",
          // iOS 推送环境配置（可选，默认为 false）
          // false: 开发环境，用于开发和测试（默认）
          // true: 生产环境，用于 App Store 发布的应用
          "apsForProduction": false
        }
      ]
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.your.app",
      "infoPlist": {
        // ...
      }
    },
    "android": {
      "package": "com.your.app"
    }
  }
}
```

**配置参数说明**：
- `appKey`（必填）：在极光推送控制台创建应用后获得的 AppKey
- `channel`（必填）：渠道标识，用于统计不同渠道的推送效果，可自定义（如 "developer-default"、"App Store" 等）
- `packageName`（必填）：Android 应用包名，需要与极光推送控制台注册的包名完全一致
- `apsForProduction`（可选，默认 `false`）：iOS 推送环境配置
  - `false`（默认）：开发环境，用于开发调试，需要使用开发证书
  - `true`：生产环境，用于通过 App Store 或 TestFlight 分发的正式版本

#### 厂商通道配置（可选）
如果需要集成厂商通道（华为、FCM、小米、OPPO、VIVO、魅族、荣耀、蔚来），可以添加 `vendorChannels` 配置：

```js
{
  "expo": {
    "plugins": [
      [
        "mx-jpush-expo",
        {
          "appKey": "你的极光推送AppKey",
          "channel": "你的极光推送Channel",
          "packageName": "com.your.app",
          "vendorChannels": {
            // 华为推送（可选）
            "huawei": {
              "enabled": true
            },
            // FCM 推送（可选）
            "fcm": {
              "enabled": true
            },
            // 小米推送（可选）
            "xiaomi": {
              "appId": "小米的APPID",
              "appKey": "小米的APPKEY"
            },
            // OPPO 推送（可选）
            "oppo": {
              "appKey": "OP-oppo的APPKEY",
              "appId": "OP-oppo的APPID",
              "appSecret": "OP-oppo的APPSECRET"
            },
            // VIVO 推送（可选）
            "vivo": {
              "appKey": "vivo的APPKEY",
              "appId": "vivo的APPID"
            },
            // 魅族推送（可选）
            "meizu": {
              "appKey": "MZ-魅族的APPKEY",
              "appId": "MZ-魅族的APPID"
            },
            // 荣耀推送（可选）
            "honor": {
              "appId": "Honor的APP ID"
            },
            // 蔚来推送（可选）
            "nio": {
              "appId": "蔚来的APP ID"
            }
          }
        }
      ]
    ]
  }
}
```

**注意**：
- 厂商通道配置是可选的，只需配置你实际使用的厂商
- 如果不配置某个厂商，对应的 SDK 依赖和配置不会被添加
- 所有厂商通道的 AppKey/AppId 需要在对应厂商的推送平台申请
- 厂商通道插件版本：**5.9.0**（与 JPush SDK 版本保持一致）
- **SDK 依赖已自动配置**，无需手动下载 aar 文件

**厂商通道额外配置**：

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
#### 厂商通道详细配置

各厂商通道的详细配置步骤（包括参数获取、签名配置等），请参考极光官方文档：

📖 **[极光推送 - Android 厂商通道参数获取](https://docs.jiguang.cn/jpush/client/Android/android_3rd_param)**

**快速说明**：

| 厂商 | 配置文件 | 签名要求 | 说明 |
|------|---------|---------|------|
| **华为** | `agconnect-services.json` | ✅ 必需 | [华为参数获取](https://docs.jiguang.cn/jpush/client/Android/android_3rd_param#%E5%8D%8E%E4%B8%BA%E5%8F%82%E6%95%B0%E8%8E%B7%E5%8F%96) |
| **FCM** | `google-services.json` | ❌ | [FCM 参数获取](https://docs.jiguang.cn/jpush/client/Android/android_3rd_param#%E5%88%9B%E5%BB%BA%E5%BA%94%E7%94%A8-4) |
| **荣耀** | - | ✅ 必需 | [荣耀参数获取](https://docs.jiguang.cn/jpush/client/Android/android_3rd_param#%E8%8D%A3%E8%80%80%E5%8F%82%E6%95%B0%E8%8E%B7%E5%8F%96) |
| **蔚来** | - | ✅ 必需 |  |
| **小米** | - | ❌ | [小米参数获取](https://docs.jiguang.cn/jpush/client/Android/android_3rd_param#%E5%B0%8F%E7%B1%B3%E5%8F%82%E6%95%B0%E8%8E%B7%E5%8F%96) |
| **OPPO** | - | ❌ | [OPPO 参数获取](https://docs.jiguang.cn/jpush/client/Android/android_3rd_param#oppo-%E5%8F%82%E6%95%B0%E8%8E%B7%E5%8F%96) |
| **VIVO** | - | ❌ | [VIVO 参数获取](https://docs.jiguang.cn/jpush/client/Android/android_3rd_param#vivo-%E5%8F%82%E6%95%B0%E8%8E%B7%E5%8F%96) |
| **魅族** | - | ❌ | [魅族参数获取](https://docs.jiguang.cn/jpush/client/Android/android_3rd_param#%E9%AD%85%E6%97%8F%E5%8F%82%E6%95%B0%E8%8E%B7%E5%8F%96) |

**配置文件位置**：
- 将 `agconnect-services.json`（华为）或 `google-services.json`（FCM）放到 `android/app/` 目录

## 3.`prebuild`
```bash
expo prebuild
```
这将生成`android`与`ios`文件夹

## 4.检验
- `ios`可以参考：
  - [JPush 集成 Expo](https://juejin.cn/post/7423235127716659239)
  - [Expo SDK 53+ iOS Swift 版本](https://juejin.cn/post/7554288083597885467)
- `android`在`android studio`运行`prebuild`完的文件即可

## 更新日志

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
- **iOS 推送证书问题**：检查证书是否过期，环境是否匹配（开发/生产）
- **注册 ID 获取失败**：检查网络连接、AppKey 配置、推送权限
- **冷启动通知丢失**：确保按正确顺序初始化（先设置监听器，再初始化 JPush）

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
