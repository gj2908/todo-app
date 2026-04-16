// Notification utility for browser push notifications and reminders

export interface ReminderSettings {
  enabled: boolean;
  minutesBefore: number; // 0, 15, 30, 60, etc.
}

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    console.log("Browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    try {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    } catch (error) {
      console.error("Failed to request notification permission:", error);
      return false;
    }
  }

  return false;
};

export const sendNotification = (title: string, options?: NotificationOptions) => {
  if (Notification.permission === "granted") {
    new Notification(title, {
      icon: "/favicon_io/favicon-32x32.png",
      ...options,
    });
  }
};

export const scheduleTaskReminder = (taskTitle: string, dueDate: Date, minutesBefore: number = 15) => {
  const now = new Date();
  const reminderTime = new Date(dueDate.getTime() - minutesBefore * 60000);
  const timeUntilReminder = reminderTime.getTime() - now.getTime();

  if (timeUntilReminder > 0) {
    return setTimeout(() => {
      sendNotification(`Reminder: ${taskTitle}`, {
        body: `Task due on ${dueDate.toLocaleString()}`,
        tag: `reminder-${taskTitle}`,
        requireInteraction: false,
      });
    }, timeUntilReminder);
  }

  return null;
};

export const scheduleExactReminder = (title: string, reminderAt: Date, body?: string) => {
  const timeUntilReminder = reminderAt.getTime() - Date.now();

  if (timeUntilReminder > 0) {
    return setTimeout(() => {
      sendNotification(`Reminder: ${title}`, {
        body: body || `Reminder set for ${reminderAt.toLocaleString()}`,
        tag: `custom-reminder-${reminderAt.getTime()}`,
        requireInteraction: false,
      });
    }, timeUntilReminder);
  }

  return null;
};

export const getNotificationPermissionStatus = (): "granted" | "denied" | "default" => {
  if (!("Notification" in window)) return "denied";
  return Notification.permission || "default";
};

// Save reminder preferences to localStorage
export const saveReminderPreferences = (preferences: Record<string, ReminderSettings>) => {
  localStorage.setItem("reminderPreferences", JSON.stringify(preferences));
};

// Load reminder preferences from localStorage
export const loadReminderPreferences = (): Record<string, ReminderSettings> => {
  try {
    const prefs = localStorage.getItem("reminderPreferences");
    return prefs ? JSON.parse(prefs) : {};
  } catch {
    return {};
  }
};
