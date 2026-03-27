# Plugin 目录结构

本目录包含 JPush Expo Config Plugin 的 TypeScript 实现与测试。

## 目录结构

```text
plugin/
├── src/                        # TypeScript 源码
│   ├── index.ts               # 主入口文件
│   ├── types.ts               # 类型定义和参数验证
│   ├── android/               # Android 平台配置
│   │   ├── androidManifest.ts
│   │   ├── appBuildGradle.ts
│   │   ├── gradleProperties.ts
│   │   ├── index.ts
│   │   ├── projectBuildGradle.ts
│   │   └── settingsGradle.ts
│   ├── ios/                   # iOS 平台配置
│   │   ├── appDelegate.ts
│   │   ├── bridgingHeader.ts
│   │   ├── index.ts
│   │   └── infoPlist.ts
│   └── utils/                 # 通用注入与源码定位工具
├── __tests__/                 # 单元测试与 fixture 测试
├── build/                     # 编译产物（npm 发布内容）
├── jest.config.js             # Jest 测试配置
└── tsconfig.json              # TypeScript 配置
```

## 模块说明

### 主入口
- `src/index.ts` 负责参数验证、全局配置初始化，以及串联 iOS/Android 配置。

### Android 模块
- `androidManifest.ts` 处理 `JPUSH_APPKEY` / `JPUSH_CHANNEL` meta-data。
- `appBuildGradle.ts` 处理 `defaultConfig`、依赖和可回收的 `apply plugin` 注入。
- `projectBuildGradle.ts` 处理 `buildscript` / `allprojects` 仓库与 classpath。
- `gradleProperties.ts` 处理华为 AGC 的兼容性属性。
- `settingsGradle.ts` 注入 `jpush-react-native` / `jcore-react-native` 模块。

### iOS 模块
- `infoPlist.ts` 合并 `UIBackgroundModes` 并写入 JPush 配置。
- `appDelegate.ts` 向 Swift `AppDelegate` 注入初始化、通知方法与 delegate extension。
- `bridgingHeader.ts` 仅对 application target 配置 Bridging Header，并自动创建/补全头文件。

### 通用工具
- `utils/generateCode.ts` 负责带 tag 的生成区段插入、更新和删除。
- `utils/sourceCode.ts` 提供 import、代码块与行号定位 helper。
- `utils/config.ts` 维护运行期共享的插件配置。

## 开发流程

```bash
pnpm install
npm run build
npm test -- --coverage
npm run lint
```

## 设计原则

1. 幂等：重复执行 `expo prebuild` 不重复注入。
2. 可回收：配置关闭后移除旧的生成内容，不保留历史残留。
3. 类型安全：使用 TypeScript 与显式 helper 提升可维护性。
4. 可测试：平台注入逻辑优先拆成可直接单测的纯转换函数。
