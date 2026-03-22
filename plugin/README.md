# Plugin 开发说明

`plugin/` 目录承载了 `mx-jpush-expo` 的 TypeScript 实现、原生 fixture 测试和编译产物，是贡献者理解插件行为的第一入口。

相关文档：

- 接入与使用说明：[`README.md`](../README.md)
- 开发流程与发布说明：[`DEVELOPMENT.md`](../DEVELOPMENT.md)
- 历史版本更新：[`CHANGELOG.md`](../CHANGELOG.md)

## 目录概览

```text
plugin/
├── src/                         # TypeScript 源码
│   ├── index.ts                # 主入口文件
│   ├── types.ts                # 类型定义和参数验证
│   ├── utils/
│   │   ├── config.ts           # 全局配置管理
│   │   ├── codeValidator.ts    # 注入结果校验
│   │   └── generateCode.ts     # 原生代码注入工具
│   ├── ios/                    # iOS 平台配置
│   │   ├── index.ts            # iOS 配置集成入口
│   │   ├── infoPlist.ts        # Info.plist 配置
│   │   ├── appDelegate.ts      # AppDelegate 实现配置
│   │   └── bridgingHeader.ts   # Swift/OC 桥接头文件配置
│   └── android/                # Android 平台配置
│       ├── index.ts            # Android 配置集成入口
│       ├── androidManifest.ts  # AndroidManifest.xml 配置
│       ├── appBuildGradle.ts   # app/build.gradle 配置
│       ├── projectBuildGradle.ts # project/build.gradle 配置
│       ├── settingsGradle.ts   # settings.gradle 配置
│       └── gradleProperties.ts # gradle.properties 配置
├── __tests__/                  # 测试目录
│   ├── fixtures/
│   │   └── ios-project/        # iOS 原生 fixture
│   ├── iosFixture.ts           # iOS fixture helper
│   └── *.test.ts               # Jest 用例
├── build/                      # 编译后的 JavaScript 文件（npm 发布）
├── tsconfig.json               # TypeScript 配置
└── jest.config.js              # Jest 测试配置
```

## 模块职责

| 模块 | 职责 |
| --- | --- |
| `src/index.ts` | 插件入口，负责参数校验、配置初始化和平台分发 |
| `src/types.ts` | 类型定义与参数校验 |
| `src/ios/*` | iOS 原生输出注入 |
| `src/android/*` | Android 原生输出注入 |
| `src/utils/config.ts` | 当前主线的共享配置流转 |
| `src/utils/*` | 代码注入与校验工具 |
| `__tests__/fixtures/*` | 最小原生模板，用于回归测试 |
| `iosFixture.ts` | iOS fixture 生命周期、复制、编译与读取 helper |

## 当前实现约束

### 配置流转

- 对外入口仍然使用 `JPushPluginProps`
- 插件入口会先做参数校验，再通过 `setConfig/get*` 在模块间共享配置
- 当前主线仍依赖模块级配置流转；如果后续继续重构，可再收敛到显式传参

### iOS

- `infoPlist.ts` 负责 `JPUSH_*` 键和 `UIBackgroundModes`
- `appDelegate.ts` 负责 Swift 注入
- `bridgingHeader.ts` 负责复用或创建桥接头文件，并设置 `SWIFT_OBJC_BRIDGING_HEADER`

### Android

- `androidManifest.ts` 负责 `JPUSH_APPKEY` / `JPUSH_CHANNEL` meta-data
- `appBuildGradle.ts` 负责依赖、`manifestPlaceholders`、`abiFilters` 与 `apply plugin`
- `projectBuildGradle.ts` 负责 Maven 仓库与 classpath
- `settingsGradle.ts` 负责 `jpush-react-native` / `jcore-react-native` 模块注入
- `gradleProperties.ts` 负责华为 AGC 兼容性属性

## 测试策略

当前主线使用 fixture-based 回归测试，而不只做参数校验。

| 测试文件 | 覆盖内容 |
| --- | --- |
| `withJPush.test.ts` | 参数校验与插件入口基础行为 |
| `nativeIosSmoke.test.ts` | iOS 主流程 smoke |
| `nativeIosMods.test.ts` | `Info.plist`、Bridging Header |

### 为什么使用 fixture

- 直接验证 `compileModsAsync` 的真实输出
- 能覆盖正则锚点、幂等性和模板兼容性
- 比只断言 helper 返回值更接近业务项目里的 `expo prebuild`
- Android 与 `AppDelegate` 的细粒度 fixture 覆盖可以继续在后续 PR 中补齐

## 本地开发

在仓库根目录执行：

```bash
npm run build
npm run test -- --runInBand
npm run lint
```

## 贡献建议

- 改动原生输出逻辑时，优先补 fixture 回归测试
- 尽量保持每个模块只处理一个原生文件或一个原生职责
- 如果新增平台配置，先决定它属于 `Info.plist`、Gradle、Manifest 还是 `AppDelegate` 哪一层，再落实现
- 如果 README 需要新增接入说明，优先更新根目录 `README.md`；这里更适合写贡献者视角的信息
