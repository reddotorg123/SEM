import { useAppStore } from './store';
import { requestFCMToken, auth } from './services/firebase';
import { onMessage } from 'firebase/messaging';
import { messaging } from './services/firebase';

// Request notification permission
export const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
};

// Show notification
export const showNotification = (title, options = {}) => {
    if (Notification.permission === 'granted') {
        const notification = new Notification(title, {
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            vibrate: [200, 100, 200],
            ...options
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        return notification;
    }
};

// Schedule reminder for an event
export const scheduleEventReminder = (event, daysBeforeDeadline) => {
    const deadline = new Date(event.registrationDeadline);
    const reminderDate = new Date(deadline);
    reminderDate.setDate(reminderDate.getDate() - daysBeforeDeadline);

    const now = new Date();
    const timeUntilReminder = reminderDate - now;

    if (timeUntilReminder > 0) {
        setTimeout(() => {
            showNotification(
                `Deadline Reminder: ${event.eventName}`,
                {
                    body: `Registration deadline in ${daysBeforeDeadline} day(s) - ${event.collegeName}`,
                    tag: `deadline-${event.id}-${daysBeforeDeadline}`,
                    requireInteraction: true
                }
            );
        }, timeUntilReminder);
    }
};

// Check and send due notifications
export const checkDueNotifications = async (events) => {
    const { preferences } = useAppStore.getState();

    if (!preferences.notificationsEnabled) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const oneWeekFromNow = new Date(today);
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

    // Filter events with deadlines in the next 7 days
    const upcomingEvents = events.filter(event => {
        const deadline = new Date(event.registrationDeadline);
        const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
        return deadlineDate >= today && deadlineDate <= oneWeekFromNow;
    });

    if (upcomingEvents.length === 0) return;

    // Load shown notifications from localStorage to prevent duplicates
    const shownNotifications = JSON.parse(localStorage.getItem('shown_notifications') || '{}');
    const todayKey = today.toISOString().split('T')[0];

    // Cleanup old entries (older than today)
    if (shownNotifications.date !== todayKey) {
        shownNotifications.date = todayKey;
        shownNotifications.tags = [];
    }

    // Check if we already showed the summary today
    const summaryTag = `summary-${todayKey}`;
    if (shownNotifications.tags.includes(summaryTag)) return;

    // Build the notification body
    let body = 'Upcoming Deadlines:\n';
    upcomingEvents.forEach(event => {
        const dDate = new Date(event.registrationDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        const sDate = new Date(event.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        body += `• ${event.eventName}: Due ${dDate} | Event ${sDate}\n`;
    });

    // Show a single aggregated notification
    showNotification(
        `${upcomingEvents.length} Event Deadlines This Week`,
        {
            body: body.trim(),
            tag: summaryTag,
            requireInteraction: true,
            data: { type: 'summary', count: upcomingEvents.length }
        }
    );

    shownNotifications.tags.push(summaryTag);
    localStorage.setItem('shown_notifications', JSON.stringify(shownNotifications));
};

// Initialize notification system
export const initNotificationSystem = async () => {
    const hasPermission = await requestNotificationPermission();

    if (hasPermission) {
        // Foreground Message Handler (When tab is active)
        if (messaging) {
            onMessage(messaging, (payload) => {
                console.log("🔔 Foreground Message received:", payload);
                showNotification(payload.notification.title, {
                    body: payload.notification.body,
                    ...payload.notification
                });
            });
        }

        // Register for Push Tokens if logged in
        if (auth?.currentUser) {
            await requestFCMToken(auth.currentUser.uid);
        }

        // Check local reminders every hour
        setInterval(() => {
            import('./db').then(({ getAllEvents }) => {
                getAllEvents().then(events => {
                    checkDueNotifications(events);
                });
            });
        }, 60 * 60 * 1000); // 1 hour

        // Check immediately
        import('./db').then(({ getAllEvents }) => {
            getAllEvents().then(events => {
                checkDueNotifications(events);
            });
        });
    }

    return hasPermission;
};
