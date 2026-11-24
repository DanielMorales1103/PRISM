import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const projectId = '1ba4ab2f-b5ff-4861-8df2-f2138ed4d3bd';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export async function getPushToken(): Promise<string | null> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('updates', { name: 'Avisos de Prism', importance: Notifications.AndroidImportance.HIGH });
  }
  const permissions = await Notifications.getPermissionsAsync();
  const granted = permissions.granted || (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return null;
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

export function listenForPush(onReceive: () => void) {
  const received = Notifications.addNotificationReceivedListener(onReceive);
  const opened = Notifications.addNotificationResponseReceivedListener(onReceive);
  return () => { received.remove(); opened.remove(); };
}
