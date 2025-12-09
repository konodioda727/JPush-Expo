# Plugin 目录结构

本目录包含了 JPush Expo Config Plugin 的 TypeScript 实现。

## 目录结构

```
plugin/
├── src/                       # TypeScript 源码
│   ├── index.ts              # 主入口文件
│   ├── types.ts              # 类型定义和参数验证
│   ├── utils/
│   │   └── config.ts         # 全局配置管理
│   ├── ios/                  # iOS 平台配置
│   │   ├── index.ts          # iOS 配置集成入口
│   │   ├── infoPlist.ts      # Info.plist 配置
│   │   ├── appDelegateInterface.ts # AppDelegate 接口配置
│   │   ├── appDelegate.ts    # AppDelegate 实现配置
│   │   ├── bridgingHeader.ts # Swift/OC 桥接头文件配置
│   │   └── podfile.ts        # Podfile 配置
│   └── android/              # Android 平台配置
│       ├── index.ts          # Android 配置集成入口
│       ├── androidManifest.ts # AndroidManifest.xml 配置
│       ├── appBuildGradle.ts # app/build.gradle 配置
│       └── settingsGradle.ts # settings.gradle 配置
├── build/                    # 编译后的 JavaScript 文件（npm 发布）
├── __tests__/                # 单元测试
│   └── withJPush.test.ts    # 主插件测试
├── tsconfig.json             # TypeScript 配置
└── jest.config.js            # Jest 测试配置
```

## 模块说明

### 主入口 (src/index.ts)
- 插件的主入口文件
- 使用 `createRunOncePlugin` 确保插件只运行一次
- 负责参数验证和配置初始化
- 调用 iOS 和 Android 配置模块

### 类型定义 (src/types.ts)
- `JPushPluginProps`: 插件配置参数接口
- `validateProps`: 参数验证函数

### 工具模块 (src/utils/)
- **config.ts**: 管理全局配置（AppKey、Channel、apsForProduction）

### iOS 模块 (src/ios/)
- **index.ts**: iOS 配置的集成入口
- **infoPlist.ts**: 配置 Info.plist，添加后台模式和权限说明
- **appDelegateInterface.ts**: 添加 JPUSHRegisterDelegate 协议
- **appDelegate.ts**: 注入 JPush 初始化和事件处理代码
- **bridgingHeader.ts**: 配置 Swift/OC 混编的桥接头文件
- **podfile.ts**: 配置 Podfile post_install 脚本

### Android 模块 (src/android/)
- **index.ts**: Android 配置的集成入口
- **androidManifest.ts**: 配置 AndroidManifest.xml meta-data
- **appBuildGradle.ts**: 配置 build.gradle 依赖和 manifestPlaceholders
- **settingsGradle.ts**: 配置 settings.gradle 模块引用

## 设计原则

1. **单一职责**: 每个文件只负责一个特定的配置任务
2. **模块化**: 按平台和功能拆分，便于维护和扩展
3. **类型安全**: 使用 TypeScript 提供编译时类型检查
4. **可测试性**: 每个模块都可以独立测试
5. **清晰的依赖**: 通过 utils/config.ts 管理共享状态
6. **符合官方规范**: 遵循 Expo Config Plugin 最佳实践

## 命名约定

根据 [Expo 官方文档](https://docs.expo.dev/config-plugins/development-for-libraries/)：

- 全平台函数：`withFeatureName`
- iOS 特定函数：`withIosFeatureName`
- Android 特定函数：`withAndroidFeatureName`

示例：
- `withIosInfoPlist` - iOS Info.plist 配置
- `withIosAppDelegate` - iOS AppDelegate 配置
- `withAndroidManifestConfig` - Android Manifest 配置

## 构建

```bash
# 从项目根目录运行
npm run build
```

这会将 TypeScript 源码编译到 `plugin/build/` 目录。

## 测试

```bash
# 从项目根目录运行
npm test
```

## 开发

修改源码后，需要重新构建：

```bash
npm run clean  # 清理旧的构建文件
npm run build  # 重新构建
```
