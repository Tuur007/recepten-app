// services/notifications.ts
//
// Dagelijkse "vanavond eet je …"-melding om 16:00 voor elke ingeplande
// dinermaaltijd. Eén notificatie per dag, herplant zichzelf alleen als de
// gebruiker een nieuwe maaltijd ingeeft of een bestaande wijzigt.

import * as Notifications from 'expo-notifications';
import { warn } from '../utils/logger';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { openDatabaseSync } from 'expo-sqlite';

const DB_NAME = 'recepten.db';
const PREF_PREFIX = 'notif_';

// Use openDatabaseSync because callers can run outside React (e.g. wakeup from
// an event handler). The handle is cached so we don't reopen on every call.
let cachedDb: ReturnType<typeof openDatabaseSync> | null = null;
function db() {
  if (!cachedDb) cachedDb = openDatabaseSync(DB_NAME);
  return cachedDb;
}

async function readNotificationId(dayKey: string): Promise<string | null> {
  try {
    const row = await db().getFirstAsync<{ value: string }>(
      'SELECT value FROM app_prefs WHERE key = ?',
      [`${PREF_PREFIX}${dayKey}`],
    );
    return row?.value ?? null;
  } catch {
    return null;
  }
}

async function writeNotificationId(dayKey: string, id: string): Promise<void> {
  try {
    await db().runAsync(
      'INSERT INTO app_prefs (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [`${PREF_PREFIX}${dayKey}`, id],
    );
  } catch (err) {
    warn('[notif] write id failed:', err);
  }
}

async function deleteNotificationId(dayKey: string): Promise<void> {
  try {
    await db().runAsync('DELETE FROM app_prefs WHERE key = ?', [
      `${PREF_PREFIX}${dayKey}`,
    ]);
  } catch (err) {
    warn('[notif] delete id failed:', err);
  }
}

/**
 * Vraagt notificatiepermissie. Retourneert true bij toestemming, false bij
 * weigering. Gooit nooit — falen wordt enkel gelogd.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted || settings.status === 'granted') return true;
    const result = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    return result.granted || result.status === 'granted';
  } catch (err) {
    warn('[notif] requestNotificationPermission failed:', err);
    return false;
  }
}

/**
 * Plant een eenmalige notificatie om 16:00 op de opgegeven datum. Annuleert
 * eerst een eventuele bestaande melding voor dezelfde dag.
 */
export async function scheduleDinnerNotification(
  dayKey: string,
  recipeTitle: string,
  dateForDay: Date,
): Promise<void> {
  // Niet plannen voor het verleden.
  const target = new Date(dateForDay);
  target.setHours(16, 0, 0, 0);
  if (target.getTime() <= Date.now()) {
    await cancelDinnerNotification(dayKey);
    return;
  }

  await cancelDinnerNotification(dayKey);

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Vanavond: ${recipeTitle}`,
        body: 'Vergeet de boodschappen niet.',
      },
      trigger: {
        type: SchedulableTriggerInputTypes.CALENDAR,
        year: target.getFullYear(),
        month: target.getMonth() + 1, // expo-notifications gebruikt 1-12
        day: target.getDate(),
        hour: 16,
        minute: 0,
        repeats: false,
      },
    });
    await writeNotificationId(dayKey, id);
  } catch (err) {
    warn('[notif] schedule failed:', err);
  }
}

/**
 * Annuleert de geplande notificatie voor een specifieke dag (indien aanwezig).
 */
export async function cancelDinnerNotification(dayKey: string): Promise<void> {
  const id = await readNotificationId(dayKey);
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (err) {
    warn('[notif] cancel failed:', err);
  }
  await deleteNotificationId(dayKey);
}

/**
 * Annuleert alle geplande notificaties van de app. Bedoeld voor reset /
 * import-flows waar de hele weekplanner wordt vervangen.
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (err) {
    warn('[notif] cancelAll failed:', err);
  }
  try {
    await db().runAsync('DELETE FROM app_prefs WHERE key LIKE ?', [`${PREF_PREFIX}%`]);
  } catch (err) {
    warn('[notif] clear prefs failed:', err);
  }
}
