"use strict";
/**
 * iOS AppDelegate 配置
 * 注入 JPush 初始化和事件处理代码
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.withIosAppDelegate = void 0;
const config_plugins_1 = require("expo/config-plugins");
const config_1 = require("../utils/config");
/**
 * 添加必要的 import 语句
 */
const addImports = (contents) => {
    if (contents.indexOf('#import <UserNotifications/UserNotifications.h>') !== -1) {
        return contents;
    }
    console.log('\n[MX_JPush_Expo] 配置 AppDelegate import ...');
    const imports = `#import "AppDelegate.h"
#import <UserNotifications/UserNotifications.h>
#import <RCTJPushModule.h>
#import <React/RCTBridge.h>
#import <React/RCTRootView.h>
`;
    return imports + contents;
};
/**
 * 添加 JPush 初始化代码到 didFinishLaunchingWithOptions
 */
const addJPushInitialization = (contents) => {
    if (contents.indexOf('JPUSHRegisterEntity * entity = [[JPUSHRegisterEntity alloc] init];') !== -1) {
        // 已存在，只更新 appKey 和 channel
        console.log('\n[MX_JPush_Expo] 配置 AppDelegate appKey & channel ...');
        return contents.replace(/appKey\:\@\"(.*)\" channel\:\@\"(.*)\" apsForProduction:(YES|NO)/, `appKey:@"${(0, config_1.getAppKey)()}" channel:@"${(0, config_1.getChannel)()}" apsForProduction:${(0, config_1.getApsForProduction)() ? 'YES' : 'NO'}`);
    }
    console.log('\n[MX_JPush_Expo] 配置 AppDelegate didFinishLaunchingWithOptions ...');
    const didFinishLaunchingWithOptionsResult = contents.match(/didFinishLaunchingWithOptions([\s\S]*)launchOptions\n\{\n/);
    if (!didFinishLaunchingWithOptionsResult) {
        console.error('[MX_JPush_Expo] 未找到 didFinishLaunchingWithOptions 方法');
        return contents;
    }
    const [didFinishLaunchingWithOptions] = didFinishLaunchingWithOptionsResult;
    const didFinishLaunchingWithOptionsIndex = didFinishLaunchingWithOptionsResult.index;
    const didFinishLaunchingWithOptionsStartIndex = didFinishLaunchingWithOptionsIndex + didFinishLaunchingWithOptions.length;
    const jpushInitCode = `  // JPush初始化配置
  [JPUSHService setupWithOption:launchOptions appKey:@"${(0, config_1.getAppKey)()}" channel:@"${(0, config_1.getChannel)()}" apsForProduction:${(0, config_1.getApsForProduction)() ? 'YES' : 'NO'}];
  // APNS 注册实体配置
  JPUSHRegisterEntity *entity = [[JPUSHRegisterEntity alloc] init];
  if (@available(iOS 12.0, *)) {
    entity.types = JPAuthorizationOptionAlert | JPAuthorizationOptionBadge | JPAuthorizationOptionSound;
  }
  [JPUSHService registerForRemoteNotificationConfig:entity delegate:self];
  
  // 监听远程通知和响应通知
  NSNotificationCenter *defaultCenter = [NSNotificationCenter defaultCenter];
  [defaultCenter addObserver:self selector:@selector(networkDidReceiveMessage:) name:kJPFNetworkDidReceiveMessageNotification object:nil];

`;
    return (contents.slice(0, didFinishLaunchingWithOptionsStartIndex) +
        jpushInitCode +
        contents.slice(didFinishLaunchingWithOptionsStartIndex));
};
/**
 * 替换设备令牌注册方法
 */
const replaceDeviceTokenRegistration = (contents) => {
    if (contents.indexOf('return [super application:application didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];') > -1) {
        return contents.replace('return [super application:application didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];', '[JPUSHService registerDeviceToken:deviceToken];');
    }
    return contents;
};
/**
 * 替换远程通知接收方法
 */
const replaceRemoteNotificationHandler = (contents) => {
    if (contents.indexOf('return [super application:application didReceiveRemoteNotification:userInfo fetchCompletionHandler:completionHandler];') > -1) {
        return contents.replace('return [super application:application didReceiveRemoteNotification:userInfo fetchCompletionHandler:completionHandler];', `
        // iOS 10 以下 Required
        NSLog(@"iOS 7 APNS");
        [JPUSHService handleRemoteNotification:userInfo];
        [[NSNotificationCenter defaultCenter] postNotificationName:J_APNS_NOTIFICATION_ARRIVED_EVENT object:userInfo];
        completionHandler(UIBackgroundFetchResultNewData);
        `);
    }
    return contents;
};
/**
 * 添加 JPush 事件处理方法
 */
const addJPushEventHandlers = (contents) => {
    if (contents.indexOf('JPush start') !== -1) {
        return contents;
    }
    console.log('\n[MX_JPush_Expo] 配置 AppDelegate other ...');
    const jpushHandlers = `//************************************************JPush start************************************************

// iOS 10 及以上版本的通知处理
- (void)jpushNotificationCenter:(UNUserNotificationCenter *)center willPresentNotification:(UNNotification *)notification withCompletionHandler:(void (^)(NSInteger))completionHandler {
  NSDictionary * userInfo = notification.request.content.userInfo;
  if([notification.request.trigger isKindOfClass:[UNPushNotificationTrigger class]]) {
    // Apns
    NSLog(@"iOS 10 APNS 前台收到消息");
    [JPUSHService handleRemoteNotification:userInfo];
    [[NSNotificationCenter defaultCenter] postNotificationName:J_APNS_NOTIFICATION_ARRIVED_EVENT object:userInfo];
  }
  else {
    // 本地通知 todo
    NSLog(@"iOS 10 本地通知 前台收到消息");
    [[NSNotificationCenter defaultCenter] postNotificationName:J_LOCAL_NOTIFICATION_ARRIVED_EVENT object:userInfo];
  }
  completionHandler(UNNotificationPresentationOptionAlert);
}

- (void)jpushNotificationCenter:(UNUserNotificationCenter *)center didReceiveNotificationResponse:(UNNotificationResponse *)response withCompletionHandler:(void (^)(void))completionHandler {
  NSDictionary * userInfo = response.notification.request.content.userInfo;
  if([response.notification.request.trigger isKindOfClass:[UNPushNotificationTrigger class]]) {
    // Apns
    NSLog(@"iOS 10 APNS 消息事件回调");
    [JPUSHService handleRemoteNotification:userInfo];
    // 保障应用被杀死状态下，用户点击推送消息，打开app后可以收到点击通知事件
    [[RCTJPushEventQueue sharedInstance]._notificationQueue insertObject:userInfo atIndex:0];
    [[NSNotificationCenter defaultCenter] postNotificationName:J_APNS_NOTIFICATION_OPENED_EVENT object:userInfo];
  }
  else {
    // 本地通知
    NSLog(@"iOS 10 本地通知 消息事件回调");
    // 保障应用被杀死状态下，用户点击推送消息，打开app后可以收到点击通知事件
    [[RCTJPushEventQueue sharedInstance]._localNotificationQueue insertObject:userInfo atIndex:0];
    [[NSNotificationCenter defaultCenter] postNotificationName:J_LOCAL_NOTIFICATION_OPENED_EVENT object:userInfo];
  }
  completionHandler();
}

// 自定义消息
- (void)networkDidReceiveMessage:(NSNotification *)notification {
  NSDictionary * userInfo = [notification userInfo];
  [[NSNotificationCenter defaultCenter] postNotificationName:J_CUSTOM_NOTIFICATION_EVENT object:userInfo];
}

//************************************************JPush end************************************************

@end
`;
    return contents.replace(/\@end([\n]*)$/, jpushHandlers);
};
/**
 * 配置 iOS AppDelegate
 */
const withIosAppDelegate = (config) => (0, config_plugins_1.withAppDelegate)(config, (config) => {
    let contents = config.modResults.contents;
    // 1. 添加 imports
    contents = addImports(contents);
    // 2. 添加 JPush 初始化
    contents = addJPushInitialization(contents);
    // 3. 替换设备令牌注册
    contents = replaceDeviceTokenRegistration(contents);
    // 4. 替换远程通知处理
    contents = replaceRemoteNotificationHandler(contents);
    // 5. 添加事件处理方法
    contents = addJPushEventHandlers(contents);
    config.modResults.contents = contents;
    return config;
});
exports.withIosAppDelegate = withIosAppDelegate;
//# sourceMappingURL=appDelegate.js.map