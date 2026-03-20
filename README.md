<div align="center">

# 📱 VIBE App — The Ultimate Movie Streaming Experience

<img src="https://img.shields.io/badge/React_Native-0.73+-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React Native" />
<img src="https://img.shields.io/badge/Expo-50-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo" />
<img src="https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
<img src="https://img.shields.io/badge/React_Navigation-7.x-8a4baf?style=for-the-badge&logo=react&logoColor=white" alt="React Navigation" />
<img src="https://img.shields.io/badge/Socket.IO-Real_Time-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.IO" />
<img src="https://img.shields.io/badge/EAS_Build-CI/CD-46E3B7?style=for-the-badge&logo=expo&logoColor=black" alt="EAS" />

<br />

**A premium, high-performance mobile application for streaming movies and TV shows.**

**Built exclusively for iOS and Android with complete real-time sync, live chats, and interactive Watch Parties.**

<br />

[🎬 Web Platform](https://github.com/) · [🖥️ Backend API](https://server-nextjs-firm.onrender.com) · [📧 Contact](mailto:nhanntn2203@gmail.com)

<br />
  
</div>

---

## ✨ Core Features

<table>
<tr>
<td width="50%">

### 🎥 Native Streaming Engine
- **HLS / MP4 Video Playback** optimized with `expo-video`
- **Dynamic Quality Scaling** based on bandwidth
- **Picture-in-Picture (PiP)** background playback
- **Watch Progress** auto-synced with the cloud
- **Custom UI Controls** tailored for touch devices

</td>
<td width="50%">

### 💬 Interactive Communities
- **Real-Time Global Chat** via WebSocket & Socket.IO
- **Live User Presence** (Online/Offline statuses)
- **Image Uploads** with client-side compression
- **Emoji Reactions** integrated directly into messages
- **Watch Parties** perfectly synced across mobile and web

</td>
</tr>
<tr>
<td width="50%">

### 📱 Premium UX / UI
- **Cross-Platform** flawless design for both iOS & Android
- **Bottom Tab Navigation** & nested `NativeStack` routing
- **Adaptive Layouts** handling notches, dynamic islands, and safe areas
- **Skeleton Loaders** preventing layout shift (CLS)
- **Smooth Animations** and micro-interactions

</td>
<td width="50%">

### 🤖 AI Integration & Features
- **Anthropic Claude AI** embedded for smart movie recommendations
- **Guess The Movie** interactive minigames
- **Personalized Watchlists** & dynamic browsing
- **Multi-Server Playback** (TMDB, PhimAPI, NguonC) fallback handling

</td>
</tr>
</table>

---

## 🛠️ Tech Stack

| Category | Technologies |
|:---|:---|
| **Framework** | Expo (SDK 50+) & React Native |
| **Language** | TypeScript |
| **Routing** | React Navigation (`native-stack`, `bottom-tabs`) |
| **Real-time Engine** | Socket.IO Client |
| **Video Player** | Expo Video |
| **State Management** | Context API / Zustand |
| **Local Storage** | React Native Async Storage |
| **HTTP Client** | Axios |
| **Build System** | Expo Application Services (EAS CLI) |

---

## 📁 Project Structure

```
app_ios/
├── App.tsx                     # Global App Entry & Navigator Wrapper
├── app.json                    # Expo Manifest & Native Configs
├── eas.json                    # EAS Build & CI/CD Profiles
├── package.json                # Dependencies & Scripts
├── assets/                     # Fonts, Icons, Splash Screens
└── src/
    ├── api/                    # Axios instances (TMDB, Backend)
    ├── components/             # Reusable UI (Cards, Inputs, Loaders)
    ├── constants/              # Configs, Colors, Theme definitions
    ├── contexts/               # Global states (Auth, Theme, NetInfo)
    ├── hooks/                  # Custom Hooks (useChatSocket, useFetch)
    ├── navigation/             # BottomTabs and RootStack setup
    ├── screens/                # Core Pages (Home, Detail, Watch, AI)
    ├── types/                  # TypeScript interface definitions
    └── utils/                  # Helper functions & formatting
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Expo Go** app installed on your physical mobile device
- **EAS CLI** installed globally (`npm install -g eas-cli`)

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd app_ios

# 2. Install native & JS dependencies
npm install

# 3. Setup environment variables
# Duplicate .env.example (if available) or create a new .env file
```

### Environment Variables (`.env`)

Expo completely relies on the `EXPO_PUBLIC_` prefix to securely inject environment variables into the mobile bundle. Make sure you don't commit this file!

```env
# API Gateway & Backend
EXPO_PUBLIC_API_BASE_URL=https://server-nextjs-firm.onrender.com

# 3rd Party Integrations
EXPO_PUBLIC_TMDB_API_KEY=your_tmdb_api_key_here
EXPO_PUBLIC_ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### Development (Local Server)

```bash
# Start the Metro bundler
npx expo start

# Start and share over internet via ngrok (so peers can scan your QR)
npx expo start --tunnel

# Clear cache if something is acting weird
npx expo start -c
```

Open the **Expo Go** app on your iPhone or Android, scan the QR code generated in the Terminal, and the app will instantly boot up!

---

## 📦 Building for Production

Expo Application Services (EAS) automatically signs, compiles, and packages the app natively in the cloud.

### For Android User Testing (.APK)
Generates an installable APK file directly to your device without needing the Play Store.
```bash
eas build -p android --profile preview
```

### For Google Play Console (.AAB)
Generates the optimized App Bundle required for Play Store distribution.
```bash
eas build -p android
```

### For iOS App Store / TestFlight (.IPA)
*(Requires an active $99/yr Apple Developer Account)*
```bash
eas build -p ios
```

---

## 🔒 Security Best Practices

| Feature | Implementation |
|:---|:---|
| 🔑 **Env Variables** | Local `.env` ignored via `.gitignore`. Never hardcode secrets. |
| 🛡️ **Network Security** | Uses `HTTPS` standard for all API and Socket interactions. |
| 🚫 **Over-The-Air (OTA)** | Safe deployment of JS bundles using EAS Update without affecting native code. |
| 🎫 **Data Persistence** | Uses `AsyncStorage` securely instead of web session storages. |

---

<div align="center">

**Built with ❤️ using React Native, Expo, and TypeScript**

<img src="https://img.shields.io/badge/Made_with-React_Native-61DAFB?style=flat-square&logo=react" />
<img src="https://img.shields.io/badge/Powered_by-Expo-000020?style=flat-square&logo=expo" />

</div>
