// The parts of expo-notifications the daily check-in uses, imported file by file.
// The package entry also loads its push-topic module, whose native half is missing
// from Expo Go on Android (SDK 57), so importing 'expo-notifications' crashes the whole app
// there. Local notifications need none of it. Go back to `import * as Notifications from
// 'expo-notifications'` once the app runs on a development build or Expo Go ships the module.
export { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
export { getPermissionsAsync, requestPermissionsAsync } from 'expo-notifications/build/NotificationPermissions';
export { setNotificationChannelAsync } from 'expo-notifications/build/setNotificationChannelAsync';
export { setNotificationCategoryAsync } from 'expo-notifications/build/setNotificationCategoryAsync';
export { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
export { cancelAllScheduledNotificationsAsync } from 'expo-notifications/build/cancelAllScheduledNotificationsAsync';
export {
  addNotificationResponseReceivedListener,
  getLastNotificationResponseAsync,
  clearLastNotificationResponseAsync,
} from 'expo-notifications/build/NotificationsEmitter';
export { AndroidImportance } from 'expo-notifications/build/NotificationChannelManager.types';
export { SchedulableTriggerInputTypes } from 'expo-notifications/build/Notifications.types';
export type { NotificationResponse } from 'expo-notifications/build/Notifications.types';
