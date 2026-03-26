# 🛡️ SEM SYSTEM EVOLUTION LOG (CHANGELOG)

This file tracks all critical architectural changes, bug fixes, and feature implementations to ensure transparency and provide a revert-path for system stability.

## [2026-03-26] - Session: Team Induction & Infrastructure Reinforcement

### ⚙️ CORE ARCHITECTURE
- **Global Layout Correction**: Removed the `AdminPanel` from the global `App.jsx` layout. It was inadvertently rendering "Access Denied" for non-admins on every page. Now isolated to `/admin` route.
- **Routing Stability**: Refactored `RoutesWrapper` in `App.jsx` to ensure `/invite/:teamId` is accessible regardless of authentication state.

### 🚀 FEATURES
- **Poster URL Support**: Added `Neural Link 0 (Poster URL)` to `AddEventModal` and `EditEventModal`.
-   **FCM Notifications:** Firebase Cloud Messaging structure is integrated, awaiting VAPID key and Sender ID configuration in the Firebase Console.
-   **Team Induction Flow:** Implemented a persistent `sessionStorage` based redirect in `JoinTeam.jsx` and `Login.jsx`, ensuring users who sign in after clicking an invite link are automatically returned to the induction process.
-   **UI Integrity:** Stabilized `JoinTeam.jsx` after component corruption, restoring full induction functionality and seat-limit monitoring (Max 10 per team).
- **Real-time Sync**: Enhanced `App.jsx` with a dual-channel sync for Global Events and Team-specific performance data.

### 🐞 BUG FIXES
- **Team Join Resolution**: Redesigned `JoinTeam.jsx` to handle both direct UIDs and alphanumeric invite codes with a 10-member limit check.
- **Admin Lockout**: Ensured only the master admin (`jagadish2k2006@gmail.com`) can retain/assign the 'admin' role.

### ⚠️ PENDING CONTEXT (ACTION REQUIRED)
- **FCM Configuration**: The Service Worker and `getToken` call currently use placeholders for `messagingSenderId` and `vapidKey`. These must be provided via the Firebase Console for production notifications to function.
- **Performance Optimization**: Investigating lag reports in the Dashboard component.

---
*End of current session entry.*
