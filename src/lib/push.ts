import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { API } from './api';

/**
 * Push notifications, Expo relay.
 *
 * The server never touches APNs or FCM — it POSTs to exp.host and Expo fans out
 * to Apple and Google. So the only thing this file has to get right is the
 * token: obtain it, keep the server's copy current, and retire it on sign-out.
 */

// How a notification behaves when it lands while the app is OPEN. Without this
// the OS suppresses it entirely on the assumption the user can already see the
// relevant screen — which is wrong here, since a notice can arrive while the
// user is deep in fee collection.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // Replaces the old single shouldShowAlert flag: shouldShowBanner is the
    // heads-up banner while the app is foregrounded, shouldShowList is
    // whether it's also recorded in the notification center/shade. We want
    // both — a notice arriving mid-task should be visible immediately AND
    // still be there if the user swipes it away before reading it.
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Cached so signOut can unregister the exact token it registered. */
let currentToken: string | null = null;

export function getCurrentPushToken() { return currentToken; }

/**
 * Ask for permission and hand the token to the server.
 *
 * Safe to call on every sign-in: registration is an upsert keyed on the token.
 * Never throws — push failing must not stop somebody logging in.
 */
export async function registerForPush(): Promise<string | null> {
  try {
    // Simulators and emulators cannot receive push and return a token that
    // never resolves to a device. Bailing early keeps junk out of the table.
    if (!Device.isDevice) return null;

    // Android needs its channels declared BEFORE the token is requested, or
    // the OS files everything under a default channel and the priority set on
    // the server is ignored.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
      await Notifications.setNotificationChannelAsync('urgent', {
        name: 'Urgent notices',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;

    // Only prompt if we have never asked. iOS gives exactly one chance — asking
    // again after a denial silently returns denied, and a user who said no
    // should be changing this in Settings, not being re-prompted.
    if (status !== 'granted' && existing.canAskAgain) {
      const asked = await Notifications.requestPermissionsAsync();
      status = asked.status;
    }
    if (status !== 'granted') return null;

    // projectId is REQUIRED in SDK 49+. Without it getExpoPushTokenAsync throws
    // at runtime in a build, which is a miserable thing to discover in
    // production — so read it from either place EAS may have written it.
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId;
    if (!projectId) {
      console.warn('[push] No EAS projectId — cannot obtain a push token.');
      return null;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return null;

    await API.post('/api/devices/register', {
      token,
      platform: Platform.OS,
    });

    currentToken = token;
    return token;
  } catch (e) {
    console.warn('[push] registration failed', e);
    return null;
  }
}

/**
 * Retire this device's token. Called on sign-out so the next person to sign in
 * on a shared phone does not receive the previous user's notices.
 *
 * Best-effort and non-blocking by design — sign-out must succeed offline.
 */
export async function unregisterPush(): Promise<void> {
  const token = currentToken;
  currentToken = null;
  if (!token) return;
  try {
    await API.post('/api/devices/unregister', { token });
  } catch {
    // The server also retires tokens Expo reports as dead, so a missed
    // unregister self-heals rather than leaking notifications forever.
  }
}

/**
 * Routes a tapped notification to the thing it is about.
 *
 * Mount once, high in the tree. Handles both cases: the app was already open
 * (listener) and the app was launched cold by the tap (getLastNotificationResponse).
 */
export function usePushNavigation() {
  const router = useRouter();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    function route(data: any) {
      if (!data) return;
      // Guard against the cold-start response ALSO arriving through the
      // listener, which would push the same screen twice.
      const key = `${data.type}:${data.id}`;
      if (handled.current === key) return;
      handled.current = key;

      if (data.type === 'notice') router.push('/(app)/notices' as any);
      else if (data.type === 'invoice') router.push('/(app)/fees' as any);
      else if (data.type === 'poll') router.push('/(app)/polls' as any);
    }

    // Cold start: the tap that launched the app.
    Notifications.getLastNotificationResponseAsync()
      .then(res => { if (res) route(res.notification.request.content.data); })
      .catch(() => {});

    const sub = Notifications.addNotificationResponseReceivedListener(res => {
      route(res.notification.request.content.data);
    });
    return () => sub.remove();
  }, [router]);
}
