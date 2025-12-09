# 开发指南

本文档说明如何开发和维护 mx-jpush-expo 插件。

## 环境要求

- Node.js >= 16
- npm >= 7
- TypeScript >= 5.0

## 安装依赖

```bash
npm install
```

## 项目结构

插件采用 TypeScript 开发，遵循 Expo 官方最佳实践：

- **源码目录**: `plugin/src/` - TypeScript 源文件
- **构建目录**: `plugin/build/` - 编译后的 JavaScript 文件
- **测试目录**: `plugin/__tests__/` - Jest 单元测试

## 开发流程

### 1. 修改源码

所有源码位于 `plugin/src/` 目录：

```
plugin/src/
├── index.ts           # 主入口
├── types.ts           # 类型定义
├── utils/             # 工具函数
├── ios/               # iOS 配置
└── android/           # Android 配置
```

### 2. 构建

```bash
npm run build
```

这会：
- 编译 TypeScript 到 JavaScript
- 生成类型声明文件 (.d.ts)
- 输出到 `plugin/build/` 目录

### 3. 测试

```bash
# 运行所有测试
npm test

# 监听模式
npm test -- --watch

# 生成覆盖率报告
npm test -- --coverage
```

### 4. 清理

```bash
npm run clean
```

## 编码规范

### 命名约定

根据 [Expo 官方文档](https://docs.expo.dev/config-plugins/development-for-libraries/)：

1. **Config Plugin 函数**：使用 `with` 前缀
   - 全平台：`withFeatureName`
   - iOS 特定：`withIosFeatureName`
   - Android 特定：`withAndroidFeatureName`

2. **示例**：
   ```typescript
   // ✅ 好的命名
   export const withIosInfoPlist: ConfigPlugin = (config) => { ... }
   export const withAndroidManifest: ConfigPlugin = (config) => { ... }
   
   // ❌ 避免的命名
   export const setInfoPlist = (config) => { ... }
   export const configureAndroid = (config) => { ... }
   ```

### 类型安全

1. **使用 ConfigPlugin 类型**：
   ```typescript
   import { ConfigPlugin } from 'expo/config-plugins';
   
   export const withMyFeature: ConfigPlugin = (config) => {
     // ...
     return config;
   };
   ```

2. **定义 Props 接口**：
   ```typescript
   export interface MyPluginProps {
     requiredProp: string;
     optionalProp?: boolean;
   }
   
   export const withMyPlugin: ConfigPlugin<MyPluginProps> = (config, props) => {
     // ...
   };
   ```

3. **参数验证**：
   ```typescript
   function validateProps(props: MyPluginProps): void {
     if (!props.requiredProp) {
       throw new Error('requiredProp is required');
     }
   }
   ```

### 错误处理

```typescript
const withMyPlugin: ConfigPlugin<MyPluginProps> = (config, props) => {
  try {
    // 早期验证
    validateProps(props);
    
    // 应用配置
    config = applyConfiguration(config, props);
    
    return config;
  } catch (error) {
    // 提供清晰的错误信息
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`[PluginName] Configuration failed: ${message}`);
  }
};
```

## 测试策略

### 单元测试

测试配置转换逻辑：

```typescript
import { ExpoConfig } from 'expo/config';
import withMyPlugin from '../src';

describe('withMyPlugin', () => {
  const mockConfig: ExpoConfig = {
    name: 'test-app',
    slug: 'test-app',
    version: '1.0.0',
  };

  it('should apply configuration correctly', () => {
    const result = withMyPlugin(mockConfig, {
      requiredProp: 'value',
    });

    expect(result).toBeDefined();
    // 验证配置变更
  });

  it('should throw error for invalid props', () => {
    expect(() => {
      withMyPlugin(mockConfig, {} as any);
    }).toThrow('requiredProp is required');
  });
});
```

### 集成测试

在实际项目中测试：

1. 创建测试项目：
   ```bash
   npx create-expo-app test-app
   cd test-app
   ```

2. 链接本地插件：
   ```bash
   npm link /path/to/mx-jpush-expo
   ```

3. 配置 app.json：
   ```json
   {
     "expo": {
       "plugins": [
         [
           "mx-jpush-expo",
           {
             "appKey": "test-key",
             "channel": "test-channel"
           }
         ]
       ]
     }
   }
   ```

4. 运行 prebuild：
   ```bash
   npx expo prebuild --clean
   ```

5. 验证生成的原生代码

## 发布流程

### 1. 更新版本

```bash
npm version patch  # 1.0.2 -> 1.0.3
npm version minor  # 1.0.2 -> 1.1.0
npm version major  # 1.0.2 -> 2.0.0
```

### 2. 构建

```bash
npm run build
```

### 3. 测试

```bash
npm test
```

### 4. 发布

```bash
npm publish
```

## 常见问题

### Q: 为什么使用 TypeScript？

A: TypeScript 提供：
- 类型安全
- 更好的 IDE 支持
- 自动文档化
- 符合 Expo 最佳实践

### Q: 如何调试插件？

A: 使用 `EXPO_DEBUG=1` 环境变量：

```bash
EXPO_DEBUG=1 npx expo prebuild --clean
```

### Q: 插件不生效怎么办？

A: 检查：
1. `app.plugin.js` 是否正确导出
2. `plugin/build/` 目录是否存在
3. 运行 `npm run build` 重新构建
4. 使用 `--clean` 标志重新 prebuild

## 参考资源

- [Expo Config Plugins 官方文档](https://docs.expo.dev/config-plugins/introduction/)
- [Plugin 开发最佳实践](https://docs.expo.dev/config-plugins/development-for-libraries/)
- [极光推送官方文档](https://docs.jiguang.cn/)
- [掘金参考文章](https://juejin.cn/post/7554288083597885467)
