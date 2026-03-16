# Agency CRM — Production-Ready

Marketing/SMM agentligi uchun to'liq ichki CRM tizimi.

**Stack:** React 18 + Vite · Firebase Auth + Firestore · Recharts · Vercel

---

## 🚀 Tezkor ishga tushirish

### 1. Firebase loyiha yaratish

1. [Firebase Console](https://console.firebase.google.com) → **Create Project**
2. **Authentication** → Sign-in methods → **Email/Password** + **Google** yoqing
3. **Firestore Database** → Create database (production mode)
4. **Project Settings** → Web app → config nusxa oling

### 2. O'rnatish

```bash
git clone <repo-url>
cd agency-crm
npm install
```

### 3. Environment variables

```bash
cp .env.example .env
# .env faylini Firebase config bilan to'ldiring
```

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 4. Firestore rules joylash

```bash
npm install -g firebase-tools
firebase login
firebase init firestore
# firestore.rules va firestore.indexes.json fayllarini tanlang
firebase deploy --only firestore
```

### 5. Ishga tushirish

```bash
npm run dev       # Development
npm run build     # Production build
npm run preview   # Build preview
```

---

## 👥 Foydalanuvchi rollari va yaratish

### CEO / Manager / Supervisor / Investor
Firebase Auth Console → **Add user** (email + parol):

| Email | Parol | Rol |
|-------|-------|-----|
| ceo@agency.uz | Parol123! | ceo |
| manager@agency.uz | Parol123! | manager |
| investor@agency.uz | Parol123! | investor |

Keyin **Firestore** → `users/{uid}` → qo'lda yoki seed script orqali:

```json
{
  "displayName": "Alisher Karimov",
  "email": "ceo@agency.uz",
  "role": "ceo",
  "department": "Boshqaruv",
  "position": "Bosh direktor",
  "photoURL": "",
  "kpi": "100%"
}
```

CEO uchun maosh: `userPrivate/{uid}`:
```json
{ "salary": 5000 }
```

### Xodimlar (Employee)
Google Sign-In yoki email/parol orqali kiradi.
Birinchi kirganda `role: "employee"` avtomatik o'rnatiladi.
CEO keyinchalik rolni o'zgartira oladi.

---

## 📁 Loyiha strukturasi

```
src/
├── firebase/
│   ├── config.js          # Firebase init
│   ├── auth.js            # Auth helpers
│   └── firestore.js       # CRUD + realtime listeners
├── contexts/
│   ├── AuthContext.jsx    # Auth state + role + can{}
│   └── AppContext.jsx     # Global: users, projects, notifications
├── components/
│   ├── layout/
│   │   ├── Layout.jsx
│   │   └── Sidebar.jsx
│   ├── ui/
│   │   └── index.jsx      # Skeleton, Badge, Avatar, StatCard...
│   └── ProtectedRoute.jsx
└── pages/
    ├── Login.jsx
    ├── Dashboard.jsx
    ├── Loyihalar.jsx       # Projects list
    ├── ProjectDetail.jsx   # 6 tabs: tasks, content, media, plans, calls, report
    ├── Xodimlar.jsx        # Employees + salary (CEO only)
    ├── Syomka.jsx          # Shooting schedule
    ├── Uchrashuvlar.jsx    # Meetings log
    ├── Bildirishnomalar.jsx # Realtime notifications
    ├── Hisobotlar.jsx      # Reports (CEO + Investor)
    └── Workflow.jsx        # 10-step static timeline
```

---

## 🔥 Firestore schema

```
users/{uid}
  displayName, email, role, department, position, photoURL, kpi

userPrivate/{uid}
  salary                          ← faqat CEO ko'radi

projects/{projectId}
  name, client, description, status, budget,
  startDate, endDate, teamIds[], taskCount, doneCount
  
  /tasks/{id}
    title, assignee, dueDate, status, description
  
  /content/{id}
    title, format, platform, dueDate, status
  
  /mediaPlans/{id}
    platform, budget, kpi, startDate, endDate, status
  
  /plans/{id}
    type, title, description, date, status
  
  /calls/{id}
    date, type, contact, result, nextStep
  
  /reports/{id}
    budget, leads, cpl, sales, roi, notes

shoots/{id}
  title, date, time, location, operator, project, notes

meetings/{id}
  date, type, participants, result, summary, nextStep, project

notifications/{id}
  recipientId, type, title, body, read, createdAt
```

---

## 🚢 Vercel deploy

```bash
# 1. Vercel CLI
npm install -g vercel
vercel

# 2. Environment variables — Vercel Dashboard → Settings → Environment Variables
# Barcha VITE_FIREBASE_* o'zgaruvchilarni qo'shing

# 3. Deploy
vercel --prod
```

---

## 🔐 Xavfsizlik

- Firestore Security Rules `firestore.rules` da to'liq sozlangan
- Employee faqat o'ziga biriktirilgan loyihalarni ko'radi
- Maosh ma'lumotlari `userPrivate` collectionida alohida, faqat CEO
- Investor faqat o'qish huquqiga ega
- API kalitlari `.env` faylida (Vercel env vars orqali)

---

## 📊 Realtime arxitektura

```
Firebase Auth → AuthContext (user, role, can{})
                    ↓
             AppContext (global listeners)
             ├── subscribeUsers()          ← barcha rollar uchun
             ├── subscribeProjects()       ← CEO/Manager/Supervisor/Investor
             ├── subscribeEmployeeProjects() ← Employee (filtered)
             └── subscribeNotifications()  ← uid bo'yicha filtered

Sahifalar o'z lazy listenerlarini ochadi:
  ProjectDetail → subscribeSubCollection (tasks, content, ...)
  Syomka        → subscribeShoots
  Uchrashuvlar  → subscribeMeetings
```

---

## ✅ Ishlab chiqilgan funksionallar

- [x] Firebase Auth (email/password + Google)
- [x] Role-based access (CEO, Manager, Supervisor, Investor, Employee)
- [x] Realtime Firestore listeners (sahifa yangilashsiz)
- [x] Dashboard (statistika, grafiklar, jamoa yuklamasi)
- [x] Loyihalar CRUD + 6 tabli workspace
- [x] Topshiriqlar (6 holat bilan)
- [x] Kontent reja, Media plan, Rejalar, Aloqalar, Hisobot
- [x] Xodimlar (bo'lim bo'yicha guruhlab, maosh CEO uchun)
- [x] Syomka (sana bo'yicha guruhlab)
- [x] Uchrashuvlar jurnali
- [x] Realtime bildirishnomalar (unread badge)
- [x] Hisobotlar (CEO + Investor, grafiklar)
- [x] Workflow (10 bosqich timeline)
- [x] Skeleton loading (miltillashsiz)
- [x] Auth restore (sahifa yangilanishida barqaror)
- [x] Firestore Security Rules
- [x] Vercel deployment config
- [x] Apple-style minimal UI, DM Sans font
