import fs from 'fs';
import { compileModsAsync } from 'expo/config-plugins';
import withJPush from '../src';
import {
  ANDROID_MANIFEST_PATH,
  APP_BUILD_GRADLE_PATH,
  GRADLE_PROPERTIES_PATH,
  PROJECT_BUILD_GRADLE_PATH,
  SETTINGS_GRADLE_PATH,
  compileAndroidMods,
  createProjectRoot,
  getFixturePath,
  readFixtureFile,
  registerAndroidFixtureLifecycleHooks,
} from './androidFixture';
import { createExpoConfig, createPluginProps } from './testProps';

registerAndroidFixtureLifecycleHooks();

const countOccurrences = (source: string, needle: string): number =>
  source.split(needle).length - 1;

describe('native Android config mods', () => {
  it('applies the baseline Android plugin flow to the fixture project', async () => {
    const projectRoot = createProjectRoot();

    await compileAndroidMods(projectRoot);

    const androidManifest = readFixtureFile(projectRoot, ANDROID_MANIFEST_PATH);
    const appBuildGradle = readFixtureFile(projectRoot, APP_BUILD_GRADLE_PATH);
    const settingsGradle = readFixtureFile(projectRoot, SETTINGS_GRADLE_PATH);
    const projectBuildGradle = readFixtureFile(
      projectRoot,
      PROJECT_BUILD_GRADLE_PATH
    );
    const gradleProperties = readFixtureFile(
      projectRoot,
      GRADLE_PROPERTIES_PATH
    );

    expect(androidManifest).toContain('android:name="JPUSH_CHANNEL"');
    expect(androidManifest).toContain('android:value="${JPUSH_CHANNEL}"');
    expect(androidManifest).toContain('android:name="JPUSH_APPKEY"');
    expect(androidManifest).toContain('android:value="${JPUSH_APPKEY}"');

    expect(settingsGradle).toContain("include ':jpush-react-native'");
    expect(settingsGradle).toContain("include ':jcore-react-native'");

    // 检查是否添加了正确的依赖
    expect(appBuildGradle).toContain("implementation project(':jpush-react-native')");
    expect(appBuildGradle).toContain("implementation project(':jcore-react-native')");
    // expect(appBuildGradle).toContain(
    //   "implementation fileTree(include: ['*.jar','*.aar'], dir: 'libs')"
    // );
    expect(appBuildGradle).toContain(
      'JPUSH_PKGNAME: System.getenv("JPUSH_PKGNAME") ?: (project.findProperty("JPUSH_PKGNAME") ?: "com.example.test")'
    );
    expect(appBuildGradle).toContain(
      'JPUSH_APPKEY: System.getenv("JPUSH_APP_KEY") ?: (project.findProperty("JPUSH_APP_KEY") ?: "tp-key")'
    );
    expect(appBuildGradle).toContain(
      'JPUSH_CHANNEL: System.getenv("JPUSH_CHANNEL") ?: (project.findProperty("JPUSH_CHANNEL") ?: "tp-chan")'
    );
    expect(appBuildGradle).not.toContain(
      "implementation 'com.google.firebase:firebase-messaging:24.1.0'"
    );
    expect(appBuildGradle).not.toContain(
      "apply plugin: 'com.google.gms.google-services'"
    );
    expect(projectBuildGradle).not.toContain(
      "classpath 'com.google.gms:google-services:4.4.0'"
    );
    expect(gradleProperties).not.toContain('apmsInstrumentationEnabled=false');
  });

  it('adds vendor-specific Android integrations and keeps them idempotent', async () => {
    const projectRoot = createProjectRoot();
    const vendorChannels = {
      huawei: { enabled: true },
      fcm: { enabled: true },
      meizu: { appId: 'mz-id', appKey: 'mz-key' },
      xiaomi: { appId: 'xm-id', appKey: 'xm-key' },
      oppo: {
        appId: 'op-id',
        appKey: 'op-key',
        appSecret: 'op-sec',
      },
      vivo: { appId: 'vv-id', appKey: 'vv-key' },
      honor: { appId: 'hr-id' },
      nio: { appId: 'nio-id' },
    };

    await compileAndroidMods(projectRoot, { vendorChannels });

    const onceAppBuildGradle = readFixtureFile(projectRoot, APP_BUILD_GRADLE_PATH);
    const onceProjectBuildGradle = readFixtureFile(
      projectRoot,
      PROJECT_BUILD_GRADLE_PATH
    );
    const onceSettingsGradle = readFixtureFile(projectRoot, SETTINGS_GRADLE_PATH);
    const onceGradleProperties = readFixtureFile(
      projectRoot,
      GRADLE_PROPERTIES_PATH
    );

    await compileAndroidMods(projectRoot, { vendorChannels });

    const twiceAppBuildGradle = readFixtureFile(
      projectRoot,
      APP_BUILD_GRADLE_PATH
    );
    const twiceProjectBuildGradle = readFixtureFile(
      projectRoot,
      PROJECT_BUILD_GRADLE_PATH
    );
    const twiceSettingsGradle = readFixtureFile(
      projectRoot,
      SETTINGS_GRADLE_PATH
    );
    const twiceGradleProperties = readFixtureFile(
      projectRoot,
      GRADLE_PROPERTIES_PATH
    );

    expect(twiceAppBuildGradle).toBe(onceAppBuildGradle);
    expect(twiceProjectBuildGradle).toBe(onceProjectBuildGradle);
    expect(twiceSettingsGradle).toBe(onceSettingsGradle);
    expect(twiceGradleProperties).toBe(onceGradleProperties);

    expect(twiceProjectBuildGradle).toContain(
      "maven { url 'https://developer.huawei.com/repo/' }"
    );
    expect(twiceProjectBuildGradle).toContain(
      "maven { url 'https://developer.hihonor.com/repo' }"
    );
    expect(twiceProjectBuildGradle).toContain(
      "classpath 'com.google.gms:google-services:4.4.0'"
    );
    expect(twiceProjectBuildGradle).toContain(
      "classpath 'com.huawei.agconnect:agcp:1.9.3.302'"
    );

    expect(twiceAppBuildGradle).toContain(
      "apply plugin: 'com.google.gms.google-services'"
    );
    expect(twiceAppBuildGradle).toContain(
      "apply plugin: 'com.huawei.agconnect'"
    );
    expect(twiceAppBuildGradle).toContain(
      "implementation 'com.huawei.hms:push:6.13.0.300'"
    );
    expect(twiceAppBuildGradle).toContain(
      "implementation 'com.google.firebase:firebase-messaging:24.1.0'"
    );
    expect(twiceAppBuildGradle).toContain(
      "implementation 'cn.jiguang.sdk.plugin:meizu:5.9.0'"
    );
    expect(twiceAppBuildGradle).toContain(
      "implementation 'cn.jiguang.sdk.plugin:xiaomi:5.9.0'"
    );
    expect(twiceAppBuildGradle).toContain(
      "implementation 'cn.jiguang.sdk.plugin:oppo:5.9.0'"
    );
    expect(twiceAppBuildGradle).toContain(
      "implementation 'cn.jiguang.sdk.plugin:vivo:5.9.0'"
    );
    expect(twiceAppBuildGradle).toContain(
      "implementation 'cn.jiguang.sdk.plugin:honor:5.9.0'"
    );
    expect(twiceAppBuildGradle).toContain(
      "implementation 'cn.jiguang.sdk.plugin:nio:5.9.0'"
    );
    expect(twiceAppBuildGradle).toContain(
      'MEIZU_APPKEY: System.getenv("JPUSH_MEIZU_APP_KEY") ?: (project.findProperty("JPUSH_MEIZU_APP_KEY") ?: "")'
    );
    expect(twiceAppBuildGradle).toContain(
      'XIAOMI_APPKEY: System.getenv("JPUSH_XIAOMI_APP_KEY") ?: (project.findProperty("JPUSH_XIAOMI_APP_KEY") ?: "")'
    );
    expect(twiceAppBuildGradle).toContain('OPPO_APPSECRET:');
    expect(twiceAppBuildGradle).toContain('JPUSH_OPPO_APP_SECRET');
    expect(twiceAppBuildGradle).toContain(
      'VIVO_APPID: System.getenv("JPUSH_VIVO_APP_ID") ?: (project.findProperty("JPUSH_VIVO_APP_ID") ?: "")'
    );
    expect(twiceAppBuildGradle).toContain(
      'HONOR_APPID: System.getenv("JPUSH_HONOR_APP_ID") ?: (project.findProperty("JPUSH_HONOR_APP_ID") ?: "")'
    );
    expect(twiceAppBuildGradle).toContain(
      'NIO_APPID: System.getenv("JPUSH_NIO_APP_ID") ?: (project.findProperty("JPUSH_NIO_APP_ID") ?: "")'
    );

    expect(twiceGradleProperties).toContain('apmsInstrumentationEnabled=false');

    expect(
      countOccurrences(twiceSettingsGradle, "include ':jpush-react-native'")
    ).toBe(1);
    expect(
      countOccurrences(
        twiceProjectBuildGradle,
        "classpath 'com.google.gms:google-services:4.4.0'"
      )
    ).toBe(1);
    expect(
      countOccurrences(
        twiceAppBuildGradle,
        "apply plugin: 'com.huawei.agconnect'"
      )
    ).toBe(1);
  });

  it('keeps Android config values isolated across independently configured plugin instances', async () => {
    const projectRootA = createProjectRoot();
    const projectRootB = createProjectRoot();
    const configA = withJPush(
      createExpoConfig(),
      createPluginProps({ packageName: 'com.example.alpha' })
    );
    const configB = withJPush(
      createExpoConfig(),
      createPluginProps({
        packageName: 'com.example.beta',
        vendorChannels: { huawei: { enabled: true } },
      })
    );

    await compileModsAsync(configA, {
      projectRoot: projectRootA,
      platforms: ['android'],
    });
    await compileModsAsync(configB, {
      projectRoot: projectRootB,
      platforms: ['android'],
    });

    const appBuildGradleA = readFixtureFile(projectRootA, APP_BUILD_GRADLE_PATH);
    const appBuildGradleB = readFixtureFile(projectRootB, APP_BUILD_GRADLE_PATH);
    const gradlePropertiesA = readFixtureFile(
      projectRootA,
      GRADLE_PROPERTIES_PATH
    );
    const gradlePropertiesB = readFixtureFile(
      projectRootB,
      GRADLE_PROPERTIES_PATH
    );

    expect(appBuildGradleA).toContain('"com.example.alpha"');
    expect(appBuildGradleA).not.toContain(
      "implementation 'com.huawei.hms:push:6.13.0.300'"
    );
    expect(gradlePropertiesA).not.toContain('apmsInstrumentationEnabled=false');

    expect(appBuildGradleB).toContain('"com.example.beta"');
    expect(appBuildGradleB).toContain(
      "implementation 'com.huawei.hms:push:6.13.0.300'"
    );
    expect(gradlePropertiesB).toContain('apmsInstrumentationEnabled=false');
  });

  it('persists JPush defaults into Android manifestPlaceholders for non-EAS builds', async () => {
    const projectRoot = createProjectRoot();

    await compileAndroidMods(projectRoot, {
      appKey: 'non-eas-app-key',
      channel: 'non-eas-channel',
      packageName: 'com.example.non.eas',
    });

    const appBuildGradle = readFixtureFile(projectRoot, APP_BUILD_GRADLE_PATH);

    expect(appBuildGradle).toContain(
      'JPUSH_PKGNAME: System.getenv("JPUSH_PKGNAME") ?: (project.findProperty("JPUSH_PKGNAME") ?: "com.example.non.eas")'
    );
    expect(appBuildGradle).toContain(
      'JPUSH_APPKEY: System.getenv("JPUSH_APP_KEY") ?: (project.findProperty("JPUSH_APP_KEY") ?: "non-eas-app-key")'
    );
    expect(appBuildGradle).toContain(
      'JPUSH_CHANNEL: System.getenv("JPUSH_CHANNEL") ?: (project.findProperty("JPUSH_CHANNEL") ?: "non-eas-channel")'
    );
  });

  it('merges JPush manifestPlaceholders after existing host placeholders', async () => {
    const projectRoot = createProjectRoot();
    const buildGradlePath = getFixturePath(projectRoot, APP_BUILD_GRADLE_PATH);
    const hostBuildGradle = fs.readFileSync(buildGradlePath, 'utf8').replace(
      'versionName "1.0.0"',
      'versionName "1.0.0"\n        manifestPlaceholders = [existingKey: "existing", JPUSH_CHANNEL: "host-channel"]'
    );

    fs.writeFileSync(buildGradlePath, hostBuildGradle);

    await compileAndroidMods(projectRoot, {
      appKey: 'merged-app-key',
      channel: 'merged-channel',
      packageName: 'com.example.merged',
    });

    const appBuildGradle = readFixtureFile(projectRoot, APP_BUILD_GRADLE_PATH);

    expect(appBuildGradle).toContain(
      'manifestPlaceholders = [existingKey: "existing", JPUSH_CHANNEL: "host-channel"]'
    );
    expect(appBuildGradle).toContain('manifestPlaceholders += [');
    expect(appBuildGradle).toContain(
      'JPUSH_CHANNEL: System.getenv("JPUSH_CHANNEL") ?: (project.findProperty("JPUSH_CHANNEL") ?: "merged-channel")'
    );
    expect(countOccurrences(appBuildGradle, 'manifestPlaceholders = [')).toBe(1);
  });

  it.each([
    {
      name: 'without versionName',
      transform: (contents: string) =>
        contents.replace(/\n\s*versionName\s+"1\.0\.0"/, ''),
    },
    {
      name: 'with a non-literal versionName',
      transform: (contents: string) =>
        contents.replace(
          'versionName "1.0.0"',
          'def appVersionName = providers.gradleProperty("appVersionName").orElse("1.0.0").get()\n        versionName appVersionName'
        ),
    },
  ])('prebuilds app/build.gradle %s', async ({ transform }) => {
    const projectRoot = createProjectRoot();
    const buildGradlePath = getFixturePath(projectRoot, APP_BUILD_GRADLE_PATH);
    const hostBuildGradle = transform(fs.readFileSync(buildGradlePath, 'utf8'));

    fs.writeFileSync(buildGradlePath, hostBuildGradle);

    await expect(
      compileAndroidMods(projectRoot, {
        appKey: 'edge-app-key',
        channel: 'edge-channel',
        packageName: 'com.example.edge',
      })
    ).resolves.toBeUndefined();

    const appBuildGradle = readFixtureFile(projectRoot, APP_BUILD_GRADLE_PATH);

    expect(appBuildGradle).toContain('manifestPlaceholders += [');
    expect(appBuildGradle).toContain(
      'JPUSH_APPKEY: System.getenv("JPUSH_APP_KEY") ?: (project.findProperty("JPUSH_APP_KEY") ?: "edge-app-key")'
    );
  });

  it('does not inject Huawei or FCM integrations when their enabled flags are false', async () => {
    const projectRoot = createProjectRoot();

    await compileAndroidMods(projectRoot, {
      vendorChannels: {
        huawei: { enabled: false },
        fcm: { enabled: false },
      },
    });

    const appBuildGradle = readFixtureFile(projectRoot, APP_BUILD_GRADLE_PATH);
    const projectBuildGradle = readFixtureFile(
      projectRoot,
      PROJECT_BUILD_GRADLE_PATH
    );
    const gradleProperties = readFixtureFile(
      projectRoot,
      GRADLE_PROPERTIES_PATH
    );

    expect(appBuildGradle).not.toContain(
      "implementation 'com.huawei.hms:push:6.13.0.300'"
    );
    expect(appBuildGradle).not.toContain(
      "implementation 'com.google.firebase:firebase-messaging:24.1.0'"
    );
    expect(appBuildGradle).not.toContain(
      "apply plugin: 'com.google.gms.google-services'"
    );
    expect(appBuildGradle).not.toContain(
      "apply plugin: 'com.huawei.agconnect'"
    );
    expect(projectBuildGradle).not.toContain(
      "classpath 'com.google.gms:google-services:4.4.0'"
    );
    expect(projectBuildGradle).not.toContain(
      "classpath 'com.huawei.agconnect:agcp:1.9.3.302'"
    );
    expect(projectBuildGradle).not.toContain(
      "maven { url 'https://developer.huawei.com/repo/' }"
    );
    expect(gradleProperties).not.toContain('apmsInstrumentationEnabled=false');
  });
});
