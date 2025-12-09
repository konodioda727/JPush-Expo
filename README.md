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
          "channel": "你的极光推送Channel"
        }
      ]
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.your.app",
      "infoPlist": {
        // 推送相关权限说明（可选，插件会自动添加默认值）
        "NSUserTrackingUsageDescription": "需要相机权限用于视频通话",
        "NSMicrophoneUsageDescription": "需要麦克风权限用于语音通话"
      }
    }
  }
}
```

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

### v1.0.2 (2025-09-27)
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
- [@折七](https://juejin.cn/user/7554288083597885467) - Expo SDK 53+ iOS Swift 实现方案

## License

MIT
