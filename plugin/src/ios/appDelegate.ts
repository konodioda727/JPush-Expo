/**
 * iOS AppDelegate Swift 配置
 * 注入 JPush 初始化和事件处理代码（Swift 版本）
 * 参考: https://juejin.cn/post/7554288083597885467
 */

import { ConfigPlugin, withAppDelegate } from 'expo/config-plugins';
import {
  replaceGeneratedContentsAtLine,
  syncGeneratedContentsAtEnd,
} from '../utils/generateCode';
import { findBlockRange, findLastLineIndex, findLineIndex } from '../utils/sourceCode';

const DID_FINISH_LAUNCHING_PATTERN =
  /\bdidFinishLaunchingWithOptions\b/;
const APP_DELEGATE_CLASS_PATTERN = /\bclass\s+AppDelegate\b/;

function getLastImportLine(src: string): number {
  const lineIndex = findLastLineIndex(src, /^import\s+/);
  if (lineIndex < 0) {
    throw new Error('[MX_JPush_Expo] 未找到 Swift import 区域');
  }

  return lineIndex;
}

function getDidFinishLaunchingInsertionLine(src: string): number {
  const methodRange = findBlockRange(src, DID_FINISH_LAUNCHING_PATTERN);
  if (!methodRange) {
    throw new Error('[MX_JPush_Expo] 未找到 didFinishLaunchingWithOptions 方法');
  }

  const returnLine = findLineIndex(
    src,
    /return\s+super\.application\(application,\s*didFinishLaunchingWithOptions:\s*launchOptions\)/,
    methodRange.startLine,
    methodRange.endLine
  );

  return returnLine >= 0 ? returnLine : methodRange.endLine;
}

function getAppDelegateClassClosingLine(src: string): number {
  const classRange = findBlockRange(src, APP_DELEGATE_CLASS_PATTERN);
  if (!classRange) {
    throw new Error('[MX_JPush_Expo] 未找到 AppDelegate 类定义');
  }

  return classRange.endLine;
}

export function applyIosAppDelegate(contents: string): string {
  let nextContents = replaceGeneratedContentsAtLine({
    src: contents,
    newSrc: 'import UserNotifications',
    tag: 'jpush-swift-import-usernotifications',
    getLineIndex: getLastImportLine,
    offset: 1,
    comment: '//',
  }).contents;

  nextContents = replaceGeneratedContentsAtLine({
    src: nextContents,
    newSrc: getJPushInitialization(),
    tag: 'jpush-swift-initialization',
    getLineIndex: getDidFinishLaunchingInsertionLine,
    offset: 0,
    comment: '//',
  }).contents;

  nextContents = replaceGeneratedContentsAtLine({
    src: nextContents,
    newSrc: getRemoteNotificationMethods(),
    tag: 'jpush-swift-remote-notification-methods',
    getLineIndex: getAppDelegateClassClosingLine,
    offset: 0,
    comment: '//',
  }).contents;

  nextContents = syncGeneratedContentsAtEnd({
    src: nextContents,
    newSrc: getJPushDelegateExtension(),
    tag: 'jpush-swift-delegate-extension',
    comment: '//',
  }).contents;

  return nextContents;
}

/**
 * 配置 iOS AppDelegate
 */
export const withIosAppDelegate: ConfigPlugin = (config) =>
  withAppDelegate(config, (config) => {
    console.log('\n[MX_JPush_Expo] 配置 iOS AppDelegate ...');
    config.modResults.contents = applyIosAppDelegate(config.modResults.contents);
    return config;
  });

/**
 * JPush 初始化代码（Swift）
 * 基于官方文档，适配 Expo
 */
const getJPushInitialization = (): string => {
  return `
    // JPush 注册配置
    let entity = JPUSHRegisterEntity()
    if #available(iOS 12.0, *) {
      entity.types = Int(UNAuthorizationOptions.alert.rawValue |
                        UNAuthorizationOptions.sound.rawValue |
                        UNAuthorizationOptions.badge.rawValue |
                        UNAuthorizationOptions.provisional.rawValue)
    } else {
      entity.types = Int(UNAuthorizationOptions.alert.rawValue |
                        UNAuthorizationOptions.sound.rawValue |
                        UNAuthorizationOptions.badge.rawValue)
    }
    JPUSHService.register(forRemoteNotificationConfig: entity, delegate: self)

    #if DEBUG
    // 开启调试模式
    JPUSHService.setDebugMode()
    #endif

    let appKey = Bundle.main.object(forInfoDictionaryKey: "JPUSH_APPKEY") as? String ?? ""
    let channel = Bundle.main.object(forInfoDictionaryKey: "JPUSH_CHANNEL") as? String ?? ""
    let apsForProduction =
      (Bundle.main.object(forInfoDictionaryKey: "JPUSH_APS_FOR_PRODUCTION") as? NSNumber)?.boolValue ?? false

    // 初始化 JPush
    JPUSHService.setup(withOption: launchOptions,
                       appKey: appKey,
                       channel: channel,
                       apsForProduction: apsForProduction)

    // 监听自定义消息
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(self.networkDidReceiveMessage(_:)),
      name: NSNotification.Name.jpfNetworkDidReceiveMessage,
      object: nil
    )`;
};

/**
 * 远程通知方法（Swift）
 * 基于官方文档
 */
const getRemoteNotificationMethods = (): string => {
  return `
  public override func application(_ application: UIApplication,
                                  didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    #if DEBUG
    print("🎉 成功获取 deviceToken: \\(deviceToken)")

    // 将 deviceToken 转换为字符串格式
    let tokenParts = deviceToken.map { data in String(format: "%02.2hhx", data) }
    let token = tokenParts.joined()
    print("📱 deviceToken (String): \\(token)")
    #endif

    // 注册到 JPush
    JPUSHService.registerDeviceToken(deviceToken)

    return super.application(application, didRegisterForRemoteNotificationsWithDeviceToken: deviceToken)
  }

  public override func application(_ application: UIApplication,
                                  didFailToRegisterForRemoteNotificationsWithError error: Error) {
    #if DEBUG
    print("❌ 注册推送通知失败: \\(error.localizedDescription)")
    #endif
    return super.application(application, didFailToRegisterForRemoteNotificationsWithError: error)
  }`;
};

/**
 * JPUSHRegisterDelegate extension（Swift）
 * 基于官方文档
 */
const getJPushDelegateExtension = (): string => {
  return `extension AppDelegate: JPUSHRegisterDelegate {

  @objc public func jpushNotificationCenter(_ center: UNUserNotificationCenter,
                                     willPresent notification: UNNotification,
                                     withCompletionHandler completionHandler: @escaping (Int) -> Void) {
    let userInfo = notification.request.content.userInfo

    if notification.request.trigger is UNPushNotificationTrigger {
      // 处理远程推送
      JPUSHService.handleRemoteNotification(userInfo)
      #if DEBUG
      print("iOS10 收到远程通知: \\(userInfo)")
      #endif
      NotificationCenter.default.post(
        name: NSNotification.Name("J_APNS_NOTIFICATION_ARRIVED_EVENT"),
        object: userInfo
      )
    }

    // 在前台显示通知
    let presentationOptions = UNNotificationPresentationOptions.badge.rawValue |
                             UNNotificationPresentationOptions.sound.rawValue |
                             UNNotificationPresentationOptions.alert.rawValue
    completionHandler(Int(presentationOptions))
  }

  @objc public func jpushNotificationCenter(_ center: UNUserNotificationCenter,
                                     didReceive response: UNNotificationResponse,
                                     withCompletionHandler completionHandler: @escaping () -> Void) {
    let userInfo = response.notification.request.content.userInfo

    if response.notification.request.trigger is UNPushNotificationTrigger {
      // 处理远程推送点击
      JPUSHService.handleRemoteNotification(userInfo)
      #if DEBUG
      print("iOS10 用户点击了远程通知: \\(userInfo)")
      #endif
      NotificationCenter.default.post(
        name: NSNotification.Name("J_APNS_NOTIFICATION_OPENED_EVENT"),
        object: userInfo
      )
    }

    completionHandler()
  }

  // 自定义消息处理
  @objc public func networkDidReceiveMessage(_ notification: Notification) {
    let userInfo = notification.userInfo
    guard let _ = userInfo else { return }

    #if DEBUG
    print("收到自定义消息: \\(String(describing: userInfo))")
    #endif
    NotificationCenter.default.post(
      name: NSNotification.Name("J_CUSTOM_NOTIFICATION_EVENT"),
      object: userInfo
    )
  }

  // 通知设置
  @objc public func jpushNotificationCenter(_ center: UNUserNotificationCenter,
                                           openSettingsFor notification: UNNotification?) {
    #if DEBUG
    print("打开通知设置")
    #endif
  }

  // 授权状态
  @objc public func jpushNotificationAuthorization(_ status: JPAuthorizationStatus,
                                                   withInfo info: [AnyHashable : Any]?) {
    #if DEBUG
    print("receive notification authorization status:\\(status.rawValue), info:\\(String(describing: info))")
    #endif
  }
}`;
};
