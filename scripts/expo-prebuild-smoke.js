#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');

const SDK_FIXTURES = Object.freeze({
  '56': Object.freeze({
    domWebview: '56.0.5',
    expo: '56.0.11',
    react: '19.2.3',
    reactNative: '0.85.2',
  }),
  '57': Object.freeze({
    domWebview: '57.0.1',
    expo: '57.0.18',
    react: '19.2.3',
    reactNative: '0.86.3',
  }),
});

const sdk = process.argv[2];

if (!Object.hasOwn(SDK_FIXTURES, sdk)) {
  throw new Error(
    `Unsupported Expo SDK "${sdk ?? ''}". Expected one of: ${Object.keys(SDK_FIXTURES).join(', ')}`
  );
}

const fixture = SDK_FIXTURES[sdk];
const repoRoot = path.resolve(__dirname, '..');
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), `mx-jpush-expo${sdk}-`));
const appRoot = path.join(tmpRoot, 'app');
const appName = `JPush Expo ${sdk} Smoke`;
const iosProjectName = `JPushExpo${sdk}Smoke`;
const nativePackageName = `com.example.jpushexpo${sdk}`;
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

function parseNpmPackOutput(output) {
  const match = output.match(/\[\s*\{[\s\S]*\}\s*\]\s*$/);

  if (!match) {
    throw new Error(`Failed to parse npm pack JSON output:\n${output}`);
  }

  return JSON.parse(match[0]);
}

try {
  run('pnpm', ['run', 'build']);

  const packOutput = execFileSync('npm', ['pack', '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  const [{ filename }] = parseNpmPackOutput(packOutput);
  tarballPath = path.join(repoRoot, filename);
  const tarballUrl = pathToFileURL(tarballPath).href;

  fs.mkdirSync(appRoot, { recursive: true });
  fs.writeFileSync(
    path.join(appRoot, 'package.json'),
    `${JSON.stringify(
      {
        name: `mx-jpush-expo${sdk}-smoke`,
        version: '1.0.0',
        private: true,
        scripts: {
          prebuild: 'expo prebuild',
        },
        dependencies: {
          '@expo/dom-webview': fixture.domWebview,
          expo: fixture.expo,
          react: fixture.react,
          'react-native': fixture.reactNative,
          'jpush-react-native': '3.1.9',
          'jcore-react-native': '2.3.0',
          'mx-jpush-expo': tarballUrl,
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
          name: appName,
          slug: `jpush-expo-${sdk}-smoke`,
          version: '1.0.0',
          ios: {
            bundleIdentifier: nativePackageName,
          },
          android: {
            package: nativePackageName,
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
      `  return <View><Text>${appName}</Text></View>;`,
      '}',
      '',
    ].join('\n')
  );

  run('npm', ['install', '--no-audit', '--no-fund'], { cwd: appRoot });

  if (sdk === '57') {
    run('npx', ['expo-doctor@latest'], { cwd: appRoot });
  }

  run('npm', ['exec', '--', 'expo', 'prebuild', '--clean', '--no-install'], { cwd: appRoot });

  const appBuildGradle = read('android/app/build.gradle');
  assertContains(appBuildGradle, 'manifestPlaceholders += [', 'android/app/build.gradle');
  assertContains(appBuildGradle, 'JPUSH_APPKEY', 'android/app/build.gradle');
  assertContains(appBuildGradle, 'JPUSH_CHANNEL', 'android/app/build.gradle');
  assertContains(appBuildGradle, 'developer-default', 'android/app/build.gradle');
  assertContains(appBuildGradle, 'JPUSH_PKGNAME', 'android/app/build.gradle');
  assertContains(appBuildGradle, nativePackageName, 'android/app/build.gradle');
  assertContains(appBuildGradle, "implementation project(':jpush-react-native')", 'android/app/build.gradle');
  assertContains(appBuildGradle, "implementation 'cn.jiguang.sdk.plugin:huawei:", 'android/app/build.gradle');
  assertContains(appBuildGradle, "implementation 'cn.jiguang.sdk.plugin:fcm:", 'android/app/build.gradle');
  assertContains(appBuildGradle, "implementation 'cn.jiguang.sdk.plugin:xiaomi:", 'android/app/build.gradle');

  const manifest = read('android/app/src/main/AndroidManifest.xml');
  assertContains(manifest, 'android:name="JPUSH_APPKEY"', 'AndroidManifest.xml');
  assertContains(manifest, 'android:name="JPUSH_CHANNEL"', 'AndroidManifest.xml');

  const settingsGradle = read('android/settings.gradle');
  assertContains(settingsGradle, "include ':jpush-react-native'", 'android/settings.gradle');
  assertContains(settingsGradle, "include ':jcore-react-native'", 'android/settings.gradle');

  const projectBuildGradle = read('android/build.gradle');
  assertContains(projectBuildGradle, "maven { url 'https://developer.huawei.com/repo/' }", 'android/build.gradle');
  assertContains(projectBuildGradle, "classpath 'com.google.gms:google-services:4.4.0'", 'android/build.gradle');

  const iosDirectory = `ios/${iosProjectName}`;
  const appDelegatePath = assertFile(`${iosDirectory}/AppDelegate.swift`);
  const appDelegate = fs.readFileSync(appDelegatePath, 'utf8');
  assertContains(appDelegate, 'import UserNotifications', 'AppDelegate.swift');
  assertContains(appDelegate, 'JPUSHService.setup(withOption: launchOptions', 'AppDelegate.swift');
  assertContains(appDelegate, 'extension AppDelegate: JPUSHRegisterDelegate', 'AppDelegate.swift');

  const infoPlist = read(`${iosDirectory}/Info.plist`);
  assertContains(infoPlist, 'JPUSH_APPKEY', 'Info.plist');
  assertContains(infoPlist, 'JPUSH_CHANNEL', 'Info.plist');
  assertContains(infoPlist, 'developer-default', 'Info.plist');

  const entitlementsFile = `${iosProjectName}.entitlements`;
  const entitlements = read(`${iosDirectory}/${entitlementsFile}`);
  assertContains(entitlements, 'aps-environment', entitlementsFile);
  assertContains(entitlements, 'development', entitlementsFile);

  const bridgingHeaderFile = `${iosProjectName}-Bridging-Header.h`;
  const bridgingHeader = read(`${iosDirectory}/${bridgingHeaderFile}`);
  assertContains(bridgingHeader, '#import <JPUSHService.h>', 'Bridging Header');
  assertContains(bridgingHeader, '#import <RCTJPushModule.h>', 'Bridging Header');

  console.log(`\nExpo ${sdk} prebuild smoke passed in ${appRoot}`);
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
