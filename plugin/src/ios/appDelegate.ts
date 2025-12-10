/**
 * iOS AppDelegate Swift 配置
 * 注入 JPush 初始化和事件处理代码（Swift 版本）
 * 参考: https://juejin.cn/post/7554288083597885467
 */

import { ConfigPlugin, withAppDelegate } from 'expo/config-plugins';
import { getAppKey, getChannel, getApsForProduction } from '../utils/config';
import { mergeContents } from '../utils/generateCode';
import { Validator } from '../utils/codeValidator';

/**
 * 配置 iOS AppDelegate
 */
export const withIosAppDelegate: ConfigPlugin = (config) =>
  withAppDelegate(config, (config) => {
    const validator = new Validator(config.modResults.contents);

    // 1. 添加 UserNotifications 导入
    validator.register('import UserNotifications', (src) => {
      console.log('\n[MX_JPush_Expo] 添加 UserNotifications 导入 ...');
      return mergeContents({
        src,
        newSrc: 'import UserNotifications',
        tag: 'jpush-swift-import',
        anchor: /import React/,
        offset: 1,
        comment: '//',
      });
    });

    // 2. 添加 JPUSHRegisterDelegate 协议
    validator.register('JPUSHRegisterDelegate', (src) => {
      console.log('\n[MX_JPush_Expo] 添加 JPUSHRegisterDelegate 协议 ...');
      
       return mergeContents({
        src,
        newSrc: 'public class AppDelegate: ExpoAppDelegate, JPUSHRegisterDelegate',
        tag: 'jpush-swift-import',
        anchor: /public class AppDelegate: ExpoAppDelegate/,
        offset: 0,
        comment: '//',
      });
    });

    // 3. 在 didFinishLaunchingWithOptions 中添加 JPush 初始化
    validator.register('JPUSHService.register', (src) => {
      console.log('\n[MX_JPush_Expo] 添加 JPush 初始化代码 ...');
      return mergeContents({
        src,
        newSrc: getJPushInitialization(),
        tag: 'jpush-swift-initialization',
        anchor: /return super\.application\(application, didFinishLaunchingWithOptions: launchOptions\)/,
        offset: -1,
        comment: '//',
      });
    });

    // 4. 添加远程通知方法
    validator.register('didRegisterForRemoteNotificationsWithDeviceToken', (src) => {
      console.log('\n[MX_JPush_Expo] 添加远程通知方法 ...');
      return mergeContents({
        src,
        newSrc: getRemoteNotificationMethods(),
        tag: 'jpush-swift-remote-notification',
        anchor: /return super\.application\(app, open: url, options: options\)[\s\S]*?\}/,
        offset: 1,
        comment: '//',
      });
    });

    // 5. 添加 JPUSHRegisterDelegate extension
    validator.register('extension AppDelegate', (src) => {
      console.log('\n[MX_JPush_Expo] 添加 JPUSHRegisterDelegate extension ...');
      return mergeContents({
        src,
        newSrc: getJPushDelegateExtension(),
        tag: 'jpush-swift-delegate-extension',
        anchor: /class ReactNativeDelegate/,
        offset: -1,
        comment: '//',
      });
    });

    config.modResults.contents = validator.invoke();
    return config;
  });


/**
 * JPush 初始化代码
 */
const getJPushInitialization = (): string => {
  return `// JPush 注册配置
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

// 开启调试模式
JPUSHService.setDebugMode()

// 初始化 JPush
JPUSHService.setup(withOption: launchOptions,
                   appKey: "${getAppKey()}",
                   channel: "${getChannel()}",
                   apsForProduction: ${getApsForProduction()})

// 监听自定义消息
NotificationCenter.default.addObserver(
  self,
  selector: #selector(self.networkDidReceiveMessage(_:)),
  name: NSNotification.Name.jpfNetworkDidReceiveMessage,
  object: nil
)`;
};

/**
 * 远程通知方法
 */
const getRemoteNotificationMethods = (): string => {
  return `// MARK: - Remote Notification Methods

public override func application(_ application: UIApplication,
                                didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
  print("🎉 成功获取 deviceToken: \\(deviceToken)")

  // 将 deviceToken 转换为字符串格式
  let tokenParts = deviceToken.map { data in String(format: "%02.2hhx", data) }
  let token = tokenParts.joined()
  print("📱 deviceToken (String): \\(token)")

  // 注册到 JPush
  JPUSHService.registerDeviceToken(deviceToken)

  return super.application(application, didRegisterForRemoteNotificationsWithDeviceToken: deviceToken)
}

public override func application(_ application: UIApplication,
                                didFailToRegisterForRemoteNotificationsWithError error: Error) {
  print("❌ 注册推送通知失败: \\(error.localizedDescription)")
  return super.application(application, didFailToRegisterForRemoteNotificationsWithError: error)
}`;
};

/**
 * JPUSHRegisterDelegate extension（Swift）
 */
const getJPushDelegateExtension = (): string => {
  return `// MARK: - JPUSHRegisterDelegate

extension AppDelegate {

  public func jpushNotificationCenter(_ center: UNUserNotificationCenter,
                                     willPresent notification: UNNotification,
                                     withCompletionHandler completionHandler: @escaping (Int) -> Void) {
    let userInfo = notification.request.content.userInfo

    if notification.request.trigger is UNPushNotificationTrigger {
      // 处理远程推送
      JPUSHService.handleRemoteNotification(userInfo)
      print("iOS10 收到远程通知: \\(userInfo)")
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

  public func jpushNotificationCenter(_ center: UNUserNotificationCenter,
                                     didReceive response: UNNotificationResponse,
                                     withCompletionHandler completionHandler: @escaping () -> Void) {
    let userInfo = response.notification.request.content.userInfo

    if response.notification.request.trigger is UNPushNotificationTrigger {
      // 处理远程推送点击
      JPUSHService.handleRemoteNotification(userInfo)
      print("iOS10 用户点击了远程通知: \\(userInfo)")
      NotificationCenter.default.post(
        name: NSNotification.Name("J_APNS_NOTIFICATION_OPENED_EVENT"),
        object: userInfo
      )
    }

    completionHandler()
  }

  // 自定义消息处理
  @objc func networkDidReceiveMessage(_ notification: Notification) {
    let userInfo = notification.userInfo
    guard let _ = userInfo else { return }

    print("收到自定义消息: \\(userInfo!)")
    NotificationCenter.default.post(
      name: NSNotification.Name("J_CUSTOM_NOTIFICATION_EVENT"),
      object: userInfo
    )
  }
}`;
};