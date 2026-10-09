import fs from 'fs';
import os from 'os';
import path from 'path';
import { applyAndroidManifestMetaData } from '../src/android/androidManifest';
import { applyAndroidAppBuildGradle } from '../src/android/appBuildGradle';
import { applyAndroidGradleProperties } from '../src/android/gradleProperties';
import { applyAndroidProjectBuildGradle } from '../src/android/projectBuildGradle';
import { applyAndroidSettingsGradle } from '../src/android/settingsGradle';
import { mergeContents } from '../src/utils/generateCode';

const readFixture = (fixturePath: string): string =>
  fs.readFileSync(path.join(__dirname, 'fixtures', fixturePath), 'utf8');

const JPUSH_GRADLE_PACKAGES = ['jpush-react-native', 'jcore-react-native'];

const tempStubRoots: string[] = [];

const trackStubRoot = (root: string): string => {
  tempStubRoots.push(root);
  return root;
};

/** 模拟依赖安装在应用自身 node_modules 下的经典单应用布局 */
const createClassicAppStub = (): string => {
  const appRoot = trackStubRoot(
    fs.mkdtempSync(path.join(os.tmpdir(), 'mx-jpush-app-'))
  );

  fs.mkdirSync(path.join(appRoot, 'android'), { recursive: true });
  for (const packageName of JPUSH_GRADLE_PACKAGES) {
    fs.mkdirSync(path.join(appRoot, 'node_modules', packageName, 'android'), {
      recursive: true,
    });
  }

  return appRoot;
};

/** 模拟 pnpm node-linker=hoisted / yarn workspace:依赖提升到 monorepo 根 */
const createHoistedMonorepoStub = (): string => {
  const monorepoRoot = trackStubRoot(
    fs.mkdtempSync(path.join(os.tmpdir(), 'mx-jpush-monorepo-'))
  );
  const appRoot = path.join(monorepoRoot, 'packages', 'app');

  fs.mkdirSync(path.join(appRoot, 'android'), { recursive: true });
  for (const packageName of JPUSH_GRADLE_PACKAGES) {
    fs.mkdirSync(
      path.join(monorepoRoot, 'node_modules', packageName, 'android'),
      { recursive: true }
    );
  }

  return monorepoRoot;
};

/**
 * 模拟 npm workspaces 的就近命中:依赖同时存在于 apps 层与仓库根,
 * 应命中更近的一层(与 Node 模块解析的 nearest-wins 语义一致)
 */
const createNestedWorkspaceStub = (): string => {
  const workspaceRoot = trackStubRoot(
    fs.mkdtempSync(path.join(os.tmpdir(), 'mx-jpush-nested-'))
  );
  const appRoot = path.join(workspaceRoot, 'apps', 'mobile');

  fs.mkdirSync(path.join(appRoot, 'android'), { recursive: true });
  for (const packageName of JPUSH_GRADLE_PACKAGES) {
    fs.mkdirSync(
      path.join(workspaceRoot, 'apps', 'node_modules', packageName, 'android'),
      { recursive: true }
    );
    fs.mkdirSync(
      path.join(workspaceRoot, 'node_modules', packageName, 'android'),
      { recursive: true }
    );
  }

  return workspaceRoot;
};

afterEach(() => {
  while (tempStubRoots.length > 0) {
    const stubRoot = tempStubRoots.pop();
    if (stubRoot) {
      fs.rmSync(stubRoot, { recursive: true, force: true });
    }
  }
});

const TEST_APP_KEY = 'demo-app-key';
const TEST_CHANNEL = 'demo-channel';
const TEST_PACKAGE_NAME = 'com.demo.app';
const gradleStringLiteral = (value: string): string =>
  (JSON.stringify(value) ?? '""').replace(/\$/g, '\\$');
const TEST_ANDROID_BUILD_GRADLE_CONFIG = {
  appKey: TEST_APP_KEY,
  channel: TEST_CHANNEL,
  packageName: TEST_PACKAGE_NAME,
};

describe('Android transforms', () => {
  it('should inject app/build.gradle for enabled vendors and remain idempotent', () => {
    const vendorChannels = {
      fcm: { enabled: true },
      huawei: { enabled: true },
      xiaomi: { appId: 'xiaomi-id', appKey: 'xiaomi-key' },
    };

    const fixture = readFixture('android/app-build.gradle.fixture');
    const transformed = applyAndroidAppBuildGradle(
      fixture,
      {
        ...TEST_ANDROID_BUILD_GRADLE_CONFIG,
        vendorChannels,
      }
    );
    const repeated = applyAndroidAppBuildGradle(
      transformed,
      {
        ...TEST_ANDROID_BUILD_GRADLE_CONFIG,
        vendorChannels,
      }
    );

    expect(transformed).toContain('defaultConfig {');
    expect(transformed).toContain('manifestPlaceholders += [');
    expect(transformed).toContain(`implementation 'cn.jiguang.sdk.plugin:huawei:5.9.0'`);
    expect(transformed).toContain(`implementation 'cn.jiguang.sdk.plugin:fcm:5.9.0'`);
    expect(transformed).toContain(`implementation 'cn.jiguang.sdk.plugin:xiaomi:5.9.0'`);
    expect(transformed).toContain(`apply plugin: 'com.google.gms.google-services'`);
    expect(transformed).toContain(`apply plugin: 'com.huawei.agconnect'`);
    expect(repeated).toBe(transformed);
  });

  it('should escape app/build.gradle JPush fallback string literals', () => {
    const fixture = readFixture('android/app-build.gradle.fixture');
    const packageName = 'com.demo."pkg\\${project.rootDir}';
    const appKey = 'demo" )\nprintln "PWNED"\n// \\ ${project.rootDir}';
    const channel = 'demo-channel"\\\n${project.rootDir}';

    const transformed = applyAndroidAppBuildGradle(fixture, {
      packageName,
      appKey,
      channel,
    });

    expect(transformed).toContain(
      `JPUSH_PKGNAME: System.getenv("JPUSH_PKGNAME") ?: (project.findProperty("JPUSH_PKGNAME") ?: ${gradleStringLiteral(packageName)})`
    );
    expect(transformed).toContain(
      `JPUSH_APPKEY: System.getenv("JPUSH_APP_KEY") ?: (project.findProperty("JPUSH_APP_KEY") ?: ${gradleStringLiteral(appKey)})`
    );
    expect(transformed).toContain(
      `JPUSH_CHANNEL: System.getenv("JPUSH_CHANNEL") ?: (project.findProperty("JPUSH_CHANNEL") ?: ${gradleStringLiteral(channel)})`
    );
    expect(transformed).not.toContain('\nprintln "PWNED"');
    expect(transformed.replace(/\\\$\{project\.rootDir\}/g, '')).not.toContain(
      '${project.rootDir}'
    );
  });

  it('should remove vendor-only app/build.gradle sections when vendors are disabled', () => {
    const fixture = readFixture('android/app-build.gradle.fixture');

    const vendorConfig = {
      fcm: { enabled: true },
      huawei: { enabled: true },
      oppo: { appId: 'oppo-id', appKey: 'oppo-key', appSecret: 'oppo-secret' },
    };
    const enabled = applyAndroidAppBuildGradle(
      fixture,
      {
        ...TEST_ANDROID_BUILD_GRADLE_CONFIG,
        vendorChannels: vendorConfig,
      }
    );

    const disabled = applyAndroidAppBuildGradle(
      enabled,
      TEST_ANDROID_BUILD_GRADLE_CONFIG
    );

    expect(disabled).toContain(`implementation project(':jpush-react-native')`);
    expect(disabled).not.toContain(`com.google.firebase:firebase-messaging`);
    expect(disabled).not.toContain(`cn.jiguang.sdk.plugin:huawei:5.9.0`);
    expect(disabled).not.toContain(`cn.jiguang.sdk.plugin:oppo:5.9.0`);
    expect(disabled).not.toContain(`apply plugin: 'com.google.gms.google-services'`);
    expect(disabled).not.toContain(`apply plugin: 'com.huawei.agconnect'`);
  });


  it('should remove legacy app/build.gradle generated sections during upgrade', () => {
    const legacyFixture = [
      'android {',
      '    namespace "com.example.app"',
      '    defaultConfig {',
      '        versionName "1.0"',
      '    }',
      '}',
      '',
      'dependencies {',
      '    implementation("com.facebook.react:react-android")',
      '}',
    ].join('\n');

    const withLegacyNdk = mergeContents({
      src: legacyFixture,
      newSrc: "ndk {\n            abiFilters 'arm64-v8a'\n        }",
      tag: 'jpush-ndk-config',
      anchor: /versionName\s+["'][0-9.]+["']/,
      offset: 1,
      comment: '//',
    }).contents;
    const withLegacyManifest = mergeContents({
      src: withLegacyNdk,
      newSrc: "manifestPlaceholders = [\n            JPUSH_APPKEY: 'legacy'\n        ]",
      tag: 'jpush-manifest-placeholders',
      anchor: /defaultConfig\s*\{/,
      offset: 1,
      comment: '//',
    }).contents;
    const withLegacyFileTree = mergeContents({
      src: withLegacyManifest,
      newSrc: "implementation fileTree(include: ['*.jar','*.aar'], dir: 'libs')",
      tag: 'jpush-libs-filetree',
      anchor: /dependencies\s*\{/,
      offset: 1,
      comment: '//',
    }).contents;

    const upgraded = applyAndroidAppBuildGradle(
      withLegacyFileTree,
      TEST_ANDROID_BUILD_GRADLE_CONFIG
    );

    expect(upgraded).not.toContain('@generated begin jpush-ndk-config');
    expect(upgraded).not.toContain('@generated begin jpush-libs-filetree');
    expect(upgraded).not.toContain(`JPUSH_APPKEY: 'legacy'`);
    expect(upgraded).toContain('manifestPlaceholders += [');
    const matches = upgraded.match(
      /implementation fileTree\(include: \['\*.jar','\*.aar'\], dir: 'libs'\)/g
    );
    expect(matches).toHaveLength(1);
  });

  it('should inject and remove project/build.gradle vendor sections', () => {
    const fixture = readFixture('android/project-build.gradle.fixture');

    const vendorChannels = {
      fcm: { enabled: true },
      huawei: { enabled: true },
      honor: { appId: 'honor-id' },
    };

    const enabled = applyAndroidProjectBuildGradle(fixture, vendorChannels);
    const repeated = applyAndroidProjectBuildGradle(enabled, vendorChannels);

    // 检查是否添加了正确的配置
    expect(enabled).toContain(`classpath 'com.google.gms:google-services:4.4.0'`);
    expect(enabled).toContain(`classpath 'com.huawei.agconnect:agcp:1.9.3.302'`);
    expect(enabled).toContain(`https://developer.huawei.com/repo/`);
    expect(enabled).toContain(`https://developer.hihonor.com/repo`);
    expect(repeated).toEqual(enabled);
    expect(enabled).toContain(`https://developer.hihonor.com/repo`);
    expect(repeated).toBe(enabled);

    const disabled = applyAndroidProjectBuildGradle(enabled);

    expect(disabled).not.toContain(`com.google.gms:google-services`);
    expect(disabled).not.toContain(`com.huawei.agconnect:agcp`);
    expect(disabled).not.toContain(`developer.huawei.com/repo`);
    expect(disabled).not.toContain(`developer.hihonor.com/repo`);
  });

  it('should remove legacy project/build.gradle generated sections during upgrade', () => {
    const vendorChannels = {
      fcm: { enabled: true },
      huawei: { enabled: true },
      honor: { appId: 'honor-id' },
    };
    const fixture = readFixture('android/project-build.gradle.fixture');
    const withLegacyBuildscriptHuawei = mergeContents({
      src: fixture,
      newSrc: `maven { url 'https://developer.huawei.com/repo/' }`,
      tag: 'jpush-huawei-maven-buildscript',
      anchor: /buildscript\s*\{/,
      offset: 2,
      comment: '//',
    }).contents;
    const withLegacyBuildscriptHonor = mergeContents({
      src: withLegacyBuildscriptHuawei,
      newSrc: `maven { url 'https://developer.hihonor.com/repo' }`,
      tag: 'jpush-honor-maven-buildscript',
      anchor: /buildscript\s*\{/,
      offset: 2,
      comment: '//',
    }).contents;
    const withLegacyClasspaths = mergeContents({
      src: withLegacyBuildscriptHonor,
      newSrc:
        "// Google Services for FCM\n        classpath 'com.google.gms:google-services:4.4.0'",
      tag: 'jpush-vendor-classpaths',
      anchor: /dependencies\s*\{/,
      offset: 1,
      comment: '//',
    }).contents;
    const withLegacyHuaweiAllprojects = mergeContents({
      src: withLegacyClasspaths,
      newSrc: `maven { url 'https://developer.huawei.com/repo/' }`,
      tag: 'jpush-huawei-maven-allprojects',
      anchor: /allprojects\s*\{/,
      offset: 2,
      comment: '//',
    }).contents;
    const withLegacyHonorAllprojects = mergeContents({
      src: withLegacyHuaweiAllprojects,
      newSrc: `maven { url 'https://developer.hihonor.com/repo' }`,
      tag: 'jpush-honor-maven-allprojects',
      anchor: /allprojects\s*\{/,
      offset: 2,
      comment: '//',
    }).contents;

    const upgraded = applyAndroidProjectBuildGradle(
      withLegacyHonorAllprojects,
      vendorChannels
    );

    expect(upgraded).not.toContain('@generated begin jpush-huawei-maven-buildscript');
    expect(upgraded).not.toContain('@generated begin jpush-honor-maven-buildscript');
    expect(upgraded).not.toContain('@generated begin jpush-vendor-classpaths');
    expect(upgraded).not.toContain('@generated begin jpush-huawei-maven-allprojects');
    expect(upgraded).not.toContain('@generated begin jpush-honor-maven-allprojects');
    expect(upgraded.match(/https:\/\/developer\.huawei\.com\/repo\//g)).toHaveLength(2);
    expect(upgraded.match(/https:\/\/developer\.hihonor\.com\/repo/g)).toHaveLength(2);
  });

  it('should inject settings.gradle modules only once', () => {
    const appRoot = createClassicAppStub();
    const fixture = readFixture('android/settings.gradle.fixture');
    const transformed = applyAndroidSettingsGradle(fixture, appRoot);
    const repeated = applyAndroidSettingsGradle(transformed, appRoot);

    expect(transformed).toContain(`include ':jpush-react-native'`);
    expect(transformed).toContain(`include ':jcore-react-native'`);
    expect(repeated.match(/include ':jpush-react-native'/g)).toHaveLength(1);
    expect(repeated).toBe(transformed);
  });

  it('should keep single-app layouts byte-identical to previous releases', () => {
    const appRoot = createClassicAppStub();
    const fixture = readFixture('android/settings.gradle.fixture');

    const transformed = applyAndroidSettingsGradle(fixture, appRoot);

    // 旧版 getJPushModules() 的完整字面量:整块比对,证明存量用户的
    // settings.gradle 不会因升级插件而出现无谓 diff
    const legacyModuleBlock = [
      "include ':jpush-react-native'",
      "project(':jpush-react-native').projectDir = new File(rootProject.projectDir, '../node_modules/jpush-react-native/android')",
      '',
      "include ':jcore-react-native'",
      "project(':jcore-react-native').projectDir = new File(rootProject.projectDir, '../node_modules/jcore-react-native/android')",
    ].join('\n');
    expect(transformed).toContain(legacyModuleBlock);
  });

  it('should resolve JPush modules from the hoisted monorepo root', () => {
    const monorepoRoot = createHoistedMonorepoStub();
    const appRoot = path.join(monorepoRoot, 'packages', 'app');
    const fixture = readFixture('android/settings.gradle.fixture');

    const transformed = applyAndroidSettingsGradle(fixture, appRoot);

    expect(transformed).toContain(`include ':jpush-react-native'`);
    expect(transformed).toContain(
      "project(':jpush-react-native').projectDir = new File(rootProject.projectDir, '../../../node_modules/jpush-react-native/android')"
    );
    expect(transformed).toContain(
      "project(':jcore-react-native').projectDir = new File(rootProject.projectDir, '../../../node_modules/jcore-react-native/android')"
    );
  });

  it('should re-resolve module paths when the project moves between layouts', () => {
    // 幂等不等于路径固化:同一份 settings.gradle 在 single-app 与 hoisted
    // 布局之间迁移时,旧的 generated 区段需要被替换为新路径,而不是原样保留
    const appRoot = createClassicAppStub();
    const monorepoRoot = createHoistedMonorepoStub();
    const hoistedAppRoot = path.join(monorepoRoot, 'packages', 'app');
    const fixture = readFixture('android/settings.gradle.fixture');

    const classic = applyAndroidSettingsGradle(fixture, appRoot);
    const migrated = applyAndroidSettingsGradle(classic, hoistedAppRoot);

    expect(migrated.match(/include ':jpush-react-native'/g)).toHaveLength(1);
    expect(migrated).toContain(
      "project(':jpush-react-native').projectDir = new File(rootProject.projectDir, '../../../node_modules/jpush-react-native/android')"
    );
  });

  it('should re-resolve module paths when moving from a hoisted monorepo back to a single app', () => {
    // 反向迁移:hoisted → single-app,同样要求旧块被替换而不是原样保留
    const appRoot = createClassicAppStub();
    const monorepoRoot = createHoistedMonorepoStub();
    const hoistedAppRoot = path.join(monorepoRoot, 'packages', 'app');
    const fixture = readFixture('android/settings.gradle.fixture');

    const hoisted = applyAndroidSettingsGradle(fixture, hoistedAppRoot);
    const migrated = applyAndroidSettingsGradle(hoisted, appRoot);

    expect(migrated.match(/include ':jpush-react-native'/g)).toHaveLength(1);
    expect(migrated).toContain(
      "project(':jpush-react-native').projectDir = new File(rootProject.projectDir, '../node_modules/jpush-react-native/android')"
    );
  });

  it('should resolve the nearest node_modules when dependencies exist at multiple levels', () => {
    // Node 解析是 nearest-wins:apps 层与仓库根都有依赖时,必须命中更近的一层,
    // 否则会与 Metro 在 JS 侧解析到的副本错位
    const workspaceRoot = createNestedWorkspaceStub();
    const appRoot = path.join(workspaceRoot, 'apps', 'mobile');
    const fixture = readFixture('android/settings.gradle.fixture');

    const transformed = applyAndroidSettingsGradle(fixture, appRoot);

    expect(transformed).toContain(
      "project(':jpush-react-native').projectDir = new File(rootProject.projectDir, '../../node_modules/jpush-react-native/android')"
    );
  });

  it('should keep the existing generated block when dependencies are missing', () => {
    // 依赖未安装时(如 fresh clone 后 expo prebuild --no-install、CI 缓存未命中),
    // settings.gradle 已有 generated 块的 prebuild 应保持 no-op,而不是硬失败;
    // 块不存在时仍应快速失败(由上一个用例覆盖)
    const appRoot = createClassicAppStub();
    const fixture = readFixture('android/settings.gradle.fixture');

    const generated = applyAndroidSettingsGradle(fixture, appRoot);
    fs.rmSync(path.join(appRoot, 'node_modules'), {
      recursive: true,
      force: true,
    });

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const preserved = applyAndroidSettingsGradle(generated, appRoot);
      expect(preserved).toBe(generated);
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('should fail with an actionable error when JPush dependencies are missing', () => {
    // 查找会自 app 根逐级走到文件系统根,本用例隐含假设 os.tmpdir() 的祖先链上
    // 恰好没有 node_modules/jpush-react-native(macOS /var/folders、Linux /tmp 均满足)
    const appRoot = trackStubRoot(
      fs.mkdtempSync(path.join(os.tmpdir(), 'mx-jpush-empty-'))
    );
    const fixture = readFixture('android/settings.gradle.fixture');

    expect(() => applyAndroidSettingsGradle(fixture, appRoot)).toThrow(
      /未找到 jpush-react-native 的 android 目录/
    );
  });

  it('should add AndroidManifest metadata and keep it idempotent', () => {
    const application = {
      $: {
        'android:name': '.MainApplication',
      },
      'meta-data': [],
    } as any;

    applyAndroidManifestMetaData(application);
    applyAndroidManifestMetaData(application);

    expect(application['meta-data']).toHaveLength(2);
    expect(application['meta-data'][0].$['android:name']).toBe('JPUSH_CHANNEL');
    expect(application['meta-data'][1].$['android:name']).toBe('JPUSH_APPKEY');
  });

  it('should add gradle.properties compatibility only for Huawei', () => {
    const withHuawei = applyAndroidGradleProperties([], {
      huawei: { enabled: true },
    });
    expect(withHuawei).toEqual([
      {
        type: 'property',
        key: 'apmsInstrumentationEnabled',
        value: 'false',
      },
    ]);

    const withoutHuawei = applyAndroidGradleProperties(withHuawei, undefined);
    expect(withoutHuawei).toBe(withHuawei);
  });
});
