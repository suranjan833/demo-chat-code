# 💬 SuranjanDemoChat – Premium Messaging Platform

SuranjanDemoChat is a modern, secure, and premium real-time messaging web application built with **React 19**, **Vite**, **TypeScript**, and **Firebase**.

It provides seamless authentication, private & group chats, file sharing, and a clean, responsive UI for a premium messaging experience.

---

## 🚀 Features

### 🔐 Authentication

- Email & Password Sign In
- Google Sign-In
- Password setup for first-time users
- Secure Firebase Authentication
- Forgot Password support

### 💬 Messaging

- One-to-one private chats
- Group chats
- Real-time message updates
- Message timestamps
- Reply to specific messages
- Emoji reactions
- File/image sharing with download support

### 👤 User Management

- Online status indicator
- User search
- Block user functionality
- Chat request system

### 🎨 UI/UX

- Clean premium layout
- Responsive design
- Sidebar navigation
- Loading screens
- Modal-based interactions

---

## 🏗️ Project Structure

```
/suranjan833/demo-chat-code/
├── App.tsx
├── components/
│   ├── AuthView.tsx
│   ├── ChatWindow.tsx
│   ├── Dashboard.tsx
│   ├── LoadingScreen.tsx
│   ├── NewChatModal.tsx
│   ├── RequestList.tsx
│   ├── SetPasswordModal.tsx
│   └── Sidebar.tsx
├── services/
│   └── uploadService.ts
├── firebaseConfig.ts
├── types.ts
├── index.html
├── index.tsx
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## 🛠️ Tech Stack

- **Frontend:** React 19 + TypeScript
- **Build Tool:** Vite
- **Backend & Auth:** Firebase
- **Database:** Firestore (Realtime updates)
- **Icons:** Lucide React
- **Date Handling:** date-fns

---

## 📦 Installation & Setup

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/suranjan833/demo-chat-code.git
cd demo-chat-code
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Setup Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable:
   - Authentication (Email/Password + Google)
   - Firestore Database
   - Storage

4. Replace the configuration inside:

```ts
firebaseConfig.ts;
```

with your Firebase project credentials.

---

### 4️⃣ Run Development Server

```bash
npm run dev
```

App will be available at:

```
http://localhost:5173
```

---

### 5️⃣ Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

---

## 🔑 Authentication Flow

### Sign In

```
Welcome Back
Enter your credentials to access the chat
```

- Email address
- Password
- Continue with Google
- Forgot Password
- Sign Up

### First-Time Setup

```
Secure Your Account
First-time users need to set an account password.
```

- Set new password
- Confirm password
- Complete setup

---

## 💬 Chat Experience

### Dashboard

- View active chats
- View message requests
- Start new conversation
- See online users

### Chat Window

- Real-time messaging
- Attach files (📎)
- Emoji reactions
- Reply to messages
- Download shared files

---

## 📁 File Upload

Handled via:

```
services/uploadService.ts
```

Files are uploaded to Firebase Storage and accessible via secure download URLs.

---

## 🔥 Firebase Configuration Example

```ts
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

---

## 👨‍💻 Authors

Made with ❤️ by

- **Suranjan Bhattacharjee**

---

## 📄 License

This project is private and intended for educational or institutional use.

---

## 🌟 Future Improvements

- Push notifications
- Voice & video calls
- Message editing & deletion
- Dark mode
- End-to-end encryption

---

## 💡 Notes

- Ensure Firebase rules are properly configured before deploying.
- Protect API keys using environment variables in production.
- Always enable proper security rules for Firestore & Storage.

---

# 🎉 Welcome to SuranjanDemoChat

> Select a conversation from the sidebar to start your premium messaging experience.
