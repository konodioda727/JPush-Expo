import fs from 'fs';
import path from 'path';
import { applyAndroidManifestMetaData } from '../src/android/androidManifest';
import { applyAndroidAppBuildGradle } from '../src/android/appBuildGradle';
import { applyAndroidGradleProperties } from '../src/android/gradleProperties';
import { applyAndroidProjectBuildGradle } from '../src/android/projectBuildGradle';
import { applyAndroidSettingsGradle } from '../src/android/settingsGradle';
import { mergeContents } from '../src/utils/generateCode';
import { setConfig } from '../src/utils/config';

const readFixture = (fixturePath: string): string =>
  fs.readFileSync(path.join(__dirname, 'fixtures', fixturePath), 'utf8');

describe('Android transforms', () => {
  beforeEach(() => {
    setConfig('demo-app-key', 'demo-channel', 'com.demo.app', false, undefined);
  });

  it('should inject app/build.gradle for enabled vendors and remain idempotent', () => {
    setConfig('demo-app-key', 'demo-channel', 'com.demo.app', false, {
      fcm: { enabled: true },
      huawei: { enabled: true },
      xiaomi: { appId: 'xiaomi-id', appKey: 'xiaomi-key' },
    });

    const fixture = readFixture('android/app-build.gradle.fixture');
    const transformed = applyAndroidAppBuildGradle(fixture);
    const repeated = applyAndroidAppBuildGradle(transformed);

    expect(transformed).toContain('defaultConfig {');
    expect(transformed).toContain('manifestPlaceholders = [');
    expect(transformed).toContain(`implementation 'cn.jiguang.sdk.plugin:huawei:5.9.0'`);
    expect(transformed).toContain(`implementation 'cn.jiguang.sdk.plugin:fcm:5.9.0'`);
    expect(transformed).toContain(`implementation 'cn.jiguang.sdk.plugin:xiaomi:5.9.0'`);
    expect(transformed).toContain(`apply plugin: 'com.google.gms.google-services'`);
    expect(transformed).toContain(`apply plugin: 'com.huawei.agconnect'`);
    expect(repeated).toBe(transformed);
  });

  it('should remove vendor-only app/build.gradle sections when vendors are disabled', () => {
    const fixture = readFixture('android/app-build.gradle.fixture');

    setConfig('demo-app-key', 'demo-channel', 'com.demo.app', false, {
      fcm: { enabled: true },
      huawei: { enabled: true },
      oppo: { appId: 'oppo-id', appKey: 'oppo-key', appSecret: 'oppo-secret' },
    });
    const enabled = applyAndroidAppBuildGradle(fixture);

    setConfig('demo-app-key', 'demo-channel', 'com.demo.app', false, undefined);
    const disabled = applyAndroidAppBuildGradle(enabled);

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
      anchor: /versionName\s+["'][\d.]+["']/,
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

    const upgraded = applyAndroidAppBuildGradle(withLegacyFileTree);

    expect(upgraded).not.toContain('@generated begin jpush-ndk-config');
    expect(upgraded).not.toContain('@generated begin jpush-manifest-placeholders');
    expect(upgraded).not.toContain('@generated begin jpush-libs-filetree');
    expect(
      upgraded.match(
        /implementation fileTree\(include: \['\*\.jar','\*\.aar'\], dir: 'libs'\)/g
      )
    ).toHaveLength(1);
  });

  it('should inject and remove project/build.gradle vendor sections', () => {
    const fixture = readFixture('android/project-build.gradle.fixture');

    setConfig('demo-app-key', 'demo-channel', 'com.demo.app', false, {
      fcm: { enabled: true },
      huawei: { enabled: true },
      honor: { appId: 'honor-id' },
    });
    const enabled = applyAndroidProjectBuildGradle(fixture);
    const repeated = applyAndroidProjectBuildGradle(enabled);

    expect(enabled).toContain(`classpath 'com.google.gms:google-services:4.4.0'`);
    expect(enabled).toContain(`classpath 'com.huawei.agconnect:agcp:1.9.3.302'`);
    expect(enabled).toContain(`https://developer.huawei.com/repo/`);
    expect(enabled).toContain(`https://developer.hihonor.com/repo`);
    expect(repeated).toBe(enabled);

    setConfig('demo-app-key', 'demo-channel', 'com.demo.app', false, undefined);
    const disabled = applyAndroidProjectBuildGradle(enabled);

    expect(disabled).not.toContain(`com.google.gms:google-services`);
    expect(disabled).not.toContain(`com.huawei.agconnect:agcp`);
    expect(disabled).not.toContain(`developer.huawei.com/repo`);
    expect(disabled).not.toContain(`developer.hihonor.com/repo`);
  });

  it('should remove legacy project/build.gradle generated sections during upgrade', () => {
    setConfig('demo-app-key', 'demo-channel', 'com.demo.app', false, {
      fcm: { enabled: true },
      huawei: { enabled: true },
      honor: { appId: 'honor-id' },
    });

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

    const upgraded = applyAndroidProjectBuildGradle(withLegacyHonorAllprojects);

    expect(upgraded).not.toContain('@generated begin jpush-huawei-maven-buildscript');
    expect(upgraded).not.toContain('@generated begin jpush-honor-maven-buildscript');
    expect(upgraded).not.toContain('@generated begin jpush-vendor-classpaths');
    expect(upgraded).not.toContain('@generated begin jpush-huawei-maven-allprojects');
    expect(upgraded).not.toContain('@generated begin jpush-honor-maven-allprojects');
    expect(upgraded.match(/https:\/\/developer\.huawei\.com\/repo\//g)).toHaveLength(2);
    expect(upgraded.match(/https:\/\/developer\.hihonor\.com\/repo/g)).toHaveLength(2);
  });

  it('should inject settings.gradle modules only once', () => {
    const fixture = readFixture('android/settings.gradle.fixture');
    const transformed = applyAndroidSettingsGradle(fixture);
    const repeated = applyAndroidSettingsGradle(transformed);

    expect(transformed).toContain(`include ':jpush-react-native'`);
    expect(transformed).toContain(`include ':jcore-react-native'`);
    expect(repeated.match(/include ':jpush-react-native'/g)).toHaveLength(1);
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
    setConfig('demo-app-key', 'demo-channel', 'com.demo.app', false, {
      huawei: { enabled: true },
    });

    const withHuawei = applyAndroidGradleProperties([]);
    expect(withHuawei).toEqual([
      {
        type: 'property',
        key: 'apmsInstrumentationEnabled',
        value: 'false',
      },
    ]);

    setConfig('demo-app-key', 'demo-channel', 'com.demo.app', false, undefined);
    const withoutHuawei = applyAndroidGradleProperties(withHuawei);
    expect(withoutHuawei).toBe(withHuawei);
  });
});
