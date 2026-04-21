# VELQOR JOURNAL

Professional-grade trading journal and analytics platform. Glassmorphism design, real-time cross-device sync via Firebase, and full analytics suite.

## Features

- **Trade Journal** — Log every trade with full metadata (entry/exit/stop/R-multiple, session, emotion, execution score, rule compliance)
- **Calendar View** — Visual daily P&L calendar with weekly summaries and year-at-a-glance bar
- **Analytics** — Equity curve, drawdown, monthly P&L, win rate trend, R-distribution, symbol & setup breakdown
- **Time Analysis** — P&L by session, day-of-week, and 24-hour heatmap
- **Risk Analysis** — Drawdown timeline, risk scatter, R-distribution bars, violation tracking
- **Discipline** — Compliance score ring, emotion vs win rate, execution distribution, rule-breaking trades
- **Playbook** — Strategy setups with entry rules and live performance stats
- **Review** — Weekly/monthly reviews with auto-linked trade stats
- **Milestones** — Balance, P&L, trade count, win rate, streak goals with progress bars
- **Settings** — Account config, discipline rules, data export

## Setup

### 1. Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Authentication** → Email/Password + Google
4. Enable **Firestore Database** → Start in production mode
5. Add Firestore security rules (see below)
6. Register a **Web App** and copy the config

### 2. Update Firebase Config

Edit `firebase-config.js` and replace the placeholder values with your Firebase project config:

```js
export const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};
```

### 3. Firestore Security Rules

In Firebase Console → Firestore → Rules, paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 4. Deploy to GitHub Pages

1. Push this repository to GitHub
2. Go to **Settings → Pages → Source**: set to `GitHub Actions`
3. The included workflow (`/.github/workflows/deploy.yml`) will auto-deploy on every push to `main`
4. Your journal will be live at `https://YOUR_USERNAME.github.io/REPO_NAME/`

> **Note:** GitHub Pages serves static files from the root. The app uses ES modules (`type="module"`), which require HTTPS — GitHub Pages provides this automatically.

### 5. Add Authorized Domain

In Firebase Console → Authentication → Settings → Authorized domains, add your GitHub Pages domain:
```
YOUR_USERNAME.github.io
```

## Local Development

Just open `index.html` in a browser via a local server (required for ES modules):

```bash
# Python
python -m http.server 8080

# Node
npx serve .
```
