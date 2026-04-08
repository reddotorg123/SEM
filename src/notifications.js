import { useAppStore } from './store';
import { requestFCMToken, auth, db } from './services/firebase';
import { onMessage } from 'firebase/messaging';
import { messaging } from './services/firebase';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';

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

// Check and send due notifications (Local reminders)
export const checkDueNotifications = async (events) => {
    const { preferences } = useAppStore.getState();
    if (!preferences.notificationsEnabled) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const oneWeekFromNow = new Date(today);
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

    const upcomingEvents = events.filter(event => {
        const deadline = new Date(event.registrationDeadline);
        const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
        return deadlineDate >= today && deadlineDate <= oneWeekFromNow;
    });

    if (upcomingEvents.length === 0) return;

    const shownNotifications = JSON.parse(localStorage.getItem('shown_notifications') || '{}');
    const todayKey = today.toISOString().split('T')[0];

    if (shownNotifications.date !== todayKey) {
        shownNotifications.date = todayKey;
        shownNotifications.tags = [];
    }

    const summaryTag = `summary-${todayKey}`;
    if (shownNotifications.tags.includes(summaryTag)) return;

    let body = 'Upcoming Deadlines:\n';
    upcomingEvents.forEach(event => {
        const dDate = new Date(event.registrationDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        body += `• ${event.eventName}: Due ${dDate}\n`;
    });

    showNotification(
        `${upcomingEvents.length} Event Deadlines This Week`,
        {
            body: body.trim(),
            tag: summaryTag,
            requireInteraction: true
        }
    );

    shownNotifications.tags.push(summaryTag);
    localStorage.setItem('shown_notifications', JSON.stringify(shownNotifications));
};

// 🛰️ GLOBAL REAL-TIME MONITORING (For New Events & Payment Requests)
// This runs regardless of which page the user is on.
let activeSubscriptions = [];

export const initRealTimeNotifications = () => {
    if (!db || !auth?.currentUser) return;

    // Clear existing subs
    activeSubscriptions.forEach(unsub => unsub());
    activeSubscriptions = [];

    const startTime = new Date().toISOString();
    const { userRole } = useAppStore.getState();

    // 1. Monitor Global Events (For ALL Users)
    const eventsQuery = query(collection(db, "events"), orderBy("createdAt", "desc"));
    const unsubEvents = onSnapshot(eventsQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const event = change.doc.data();
                // Only notify if event is NEW (created after we started the app)
                if (event.createdAt > startTime) {
                    showNotification(`🚀 New Event: ${event.eventName}`, {
                        body: `Added by ${event.collegeName}. Tap to view details.`,
                        tag: `new-event-${change.doc.id}`
                    });
                }
            }
        });
    });
    activeSubscriptions.push(unsubEvents);

    // 2. Monitor Payment Requests (Only for Admin & Event Manager)
    if (userRole === 'admin' || userRole === 'event_manager') {
        const paymentsQuery = query(collection(db, "payment_requests"), orderBy("createdAt", "desc"));
        const unsubPayments = onSnapshot(paymentsQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const req = change.doc.data();
                    if (req.createdAt > startTime && req.status === 'pending') {
                        showNotification(`💳 New Payment Verification: ${req.userName}`, {
                            body: `Verification requested for ${req.planName}. Action required.`,
                            tag: `new-payment-${change.doc.id}`,
                            requireInteraction: true
                        });
                    }
                }
            });
        });
        activeSubscriptions.push(unsubPayments);
    }

    // 3. Monitor Team Induction Requests (For the current User/Leader)
    const teamReqQuery = query(
        collection(db, "team_requests"), 
        where("teamId", "==", auth.currentUser.uid),
        where("status", "==", "pending")
    );
    const unsubTeamReq = onSnapshot(teamReqQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const req = change.doc.data();
                if (req.createdAt > startTime) {
                    showNotification(`🔰 New Induction Request`, {
                        body: `${req.userName} wants to join your Tactical Unit. Approval required.`,
                        tag: `team-req-${change.doc.id}`,
                        requireInteraction: true
                    });
                }
            }
        });
    });
    activeSubscriptions.push(unsubTeamReq);
};

// Initialize notification system
export const initNotificationSystem = async () => {
    const hasPermission = await requestNotificationPermission();

    if (hasPermission) {
        if (messaging) {
            onMessage(messaging, (payload) => {
                showNotification(payload.notification.title, {
                    body: payload.notification.body,
                    ...payload.notification
                });
            });
        }

        if (auth?.currentUser) {
            await requestFCMToken(auth.currentUser.uid);
            initRealTimeNotifications();
        }

        // Local reminders check
        setInterval(() => {
            import('./db').then(({ getAllEvents }) => {
                getAllEvents().then(events => checkDueNotifications(events));
            });
        }, 60 * 60 * 1000);
    }

    return hasPermission;
};

