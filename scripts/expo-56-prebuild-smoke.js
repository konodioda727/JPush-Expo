#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mx-jpush-expo56-'));
const appRoot = path.join(tmpRoot, 'app');
let tarballPath;

function run(command, args, options = {}) {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  execFileSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      CI: process.env.CI ?? '1',
      EXPO_NO_TELEMETRY: '1',
      npm_config_yes: 'true',
    },
  });
}

function read(relativePath) {
  return fs.readFileSync(path.join(appRoot, relativePath), 'utf8');
}

function assertContains(haystack, needle, label) {
  if (!haystack.includes(needle)) {
    throw new Error(`${label} is missing expected content: ${needle}`);
  }
}

function assertFile(relativePath) {
  const filePath = path.join(appRoot, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Expected file to exist: ${relativePath}`);
  }
  return filePath;
}

try {
  run('npm', ['run', 'build']);

  const packOutput = execFileSync('npm', ['pack', '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  const [{ filename }] = JSON.parse(packOutput);
  tarballPath = path.join(repoRoot, filename);

  fs.mkdirSync(appRoot, { recursive: true });
  fs.writeFileSync(
    path.join(appRoot, 'package.json'),
    `${JSON.stringify(
      {
        name: 'mx-jpush-expo56-smoke',
        version: '1.0.0',
        private: true,
        scripts: {
          prebuild: 'expo prebuild',
        },
        dependencies: {
          '@expo/dom-webview': '56.0.5',
          expo: '56.0.11',
          react: '19.2.3',
          'react-native': '0.85.2',
          'jpush-react-native': '3.1.9',
          'jcore-react-native': '2.3.0',
          'mx-jpush-expo': `file:${tarballPath}`,
        },
        devDependencies: {},
      },
      null,
      2
    )}\n`
  );
  fs.writeFileSync(
    path.join(appRoot, 'app.json'),
    `${JSON.stringify(
      {
        expo: {
          name: 'JPush Expo 56 Smoke',
          slug: 'jpush-expo-56-smoke',
          version: '1.0.0',
          ios: {
            bundleIdentifier: 'com.example.jpushexpo56',
          },
          android: {
            package: 'com.example.jpushexpo56',
          },
          plugins: [
            [
              'mx-jpush-expo',
              {
                appKey: 'smoke-app-key',
                apsForProduction: false,
                vendorChannels: {
                  huawei: {
                    enabled: true,
                  },
                  fcm: {
                    enabled: true,
                  },
                  xiaomi: {
                    appId: 'smoke-xiaomi-id',
                    appKey: 'smoke-xiaomi-key',
                  },
                },
              },
            ],
          ],
        },
      },
      null,
      2
    )}\n`
  );
  fs.writeFileSync(
    path.join(appRoot, 'App.tsx'),
    [
      "import { Text, View } from 'react-native';",
      '',
      'export default function App() {',
      "  return <View><Text>JPush Expo 56 Smoke</Text></View>;",
      '}',
      '',
    ].join('\n')
  );

  run('npm', ['install', '--no-audit', '--no-fund'], { cwd: appRoot });
  run('npx', ['expo', 'prebuild', '--clean', '--no-install'], { cwd: appRoot });

  const appBuildGradle = read('android/app/build.gradle');
  assertContains(appBuildGradle, 'manifestPlaceholders += [', 'android/app/build.gradle');
  assertContains(appBuildGradle, 'JPUSH_APPKEY', 'android/app/build.gradle');
  assertContains(appBuildGradle, 'JPUSH_CHANNEL', 'android/app/build.gradle');
  assertContains(appBuildGradle, 'developer-default', 'android/app/build.gradle');
  assertContains(appBuildGradle, 'JPUSH_PKGNAME', 'android/app/build.gradle');
  assertContains(appBuildGradle, 'com.example.jpushexpo56', 'android/app/build.gradle');
  assertContains(appBuildGradle, "implementation project(':jpush-react-native')", 'android/app/build.gradle');
  assertContains(appBuildGradle, "implementation 'cn.jiguang.sdk.plugin:huawei:5.9.0'", 'android/app/build.gradle');
  assertContains(appBuildGradle, "implementation 'cn.jiguang.sdk.plugin:fcm:5.9.0'", 'android/app/build.gradle');
  assertContains(appBuildGradle, "implementation 'cn.jiguang.sdk.plugin:xiaomi:5.9.0'", 'android/app/build.gradle');

  const manifest = read('android/app/src/main/AndroidManifest.xml');
  assertContains(manifest, 'android:name="JPUSH_APPKEY"', 'AndroidManifest.xml');
  assertContains(manifest, 'android:name="JPUSH_CHANNEL"', 'AndroidManifest.xml');

  const settingsGradle = read('android/settings.gradle');
  assertContains(settingsGradle, "include ':jpush-react-native'", 'android/settings.gradle');
  assertContains(settingsGradle, "include ':jcore-react-native'", 'android/settings.gradle');

  const projectBuildGradle = read('android/build.gradle');
  assertContains(projectBuildGradle, "maven { url 'https://developer.huawei.com/repo/' }", 'android/build.gradle');
  assertContains(projectBuildGradle, "classpath 'com.google.gms:google-services:4.4.0'", 'android/build.gradle');

  const appDelegatePath = assertFile('ios/JPushExpo56Smoke/AppDelegate.swift');
  const appDelegate = fs.readFileSync(appDelegatePath, 'utf8');
  assertContains(appDelegate, 'import UserNotifications', 'AppDelegate.swift');
  assertContains(appDelegate, 'JPUSHService.setup(withOption: launchOptions', 'AppDelegate.swift');
  assertContains(appDelegate, 'extension AppDelegate: JPUSHRegisterDelegate', 'AppDelegate.swift');

  const infoPlist = read('ios/JPushExpo56Smoke/Info.plist');
  assertContains(infoPlist, 'JPUSH_APPKEY', 'Info.plist');
  assertContains(infoPlist, 'JPUSH_CHANNEL', 'Info.plist');
  assertContains(infoPlist, 'developer-default', 'Info.plist');

  const entitlements = read('ios/JPushExpo56Smoke/JPushExpo56Smoke.entitlements');
  assertContains(entitlements, 'aps-environment', 'JPushExpo56Smoke.entitlements');
  assertContains(entitlements, 'development', 'JPushExpo56Smoke.entitlements');

  const bridgingHeader = read('ios/JPushExpo56Smoke/JPushExpo56Smoke-Bridging-Header.h');
  assertContains(bridgingHeader, '#import <JPUSHService.h>', 'Bridging Header');
  assertContains(bridgingHeader, '#import <RCTJPushModule.h>', 'Bridging Header');

  console.log(`\nExpo 56 prebuild smoke passed in ${appRoot}`);
} finally {
  if (tarballPath) {
    fs.rmSync(tarballPath, { force: true });
  }

  if (process.env.MX_JPUSH_KEEP_SMOKE_DIR !== '1') {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  } else {
    console.log(`\nKept smoke directory: ${tmpRoot}`);
  }
}
