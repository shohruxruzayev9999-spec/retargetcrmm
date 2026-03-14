# RetargetCRM — Deploy qilish bo'yicha qo'llanma

## 1. Firebase sozlamasi

### Authentication
1. Firebase Console → Authentication → Sign-in method
2. **Email/Password** → Enable
3. **Google** → Enable
4. Settings → **Authorized domains** → Vercel URL qo'shing:
   - `your-project.vercel.app`
   - `localhost` (local dev uchun)

### Firestore Database
1. Firebase Console → Firestore Database → Create database
2. **Production mode** ni tanlang
3. Region: `europe-west3` (yoki yaqin region)

### Firestore Rules
1. Firebase Console → Firestore → Rules
2. `firestore.rules` faylidan nusxa oling va saqlang

### Firebase Authentication — Rol akkauntlari
Firebase Console → Authentication → Users → Add user:
| Email | Parol | Rol |
|-------|-------|-----|
| `ceo@agency.uz` | `ceo12345` | CEO |
| `manager@agency.uz` | `manager12345` | MANAGER |
| `boshqaruvchi@agency.uz` | `bosh12345` | SUPERVISOR |
| `investor@agency.uz` | `investor12345` | INVESTOR |

> Xodimlar Google orqali o'zlari ro'yxatdan o'tadi.

---

## 2. Vercel Deploy

### Birinchi marta
```bash
# GitHub ga push qiling
git add .
git commit -m "fix: all critical bugs resolved v2"
git push origin main
```

Vercel Dashboard:
1. **New Project** → GitHub repo ni tanlang
2. **Environment Variables** ni qo'shing (`.env.example` ga qarang)
3. **Deploy**

### Environment Variables (Vercel)
```
VITE_FIREBASE_API_KEY          = AIza...
VITE_FIREBASE_AUTH_DOMAIN      = your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID       = your-project-id
VITE_FIREBASE_STORAGE_BUCKET   = your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID = 123456789
VITE_FIREBASE_APP_ID           = 1:123...
```

> **MUHIM:** `VITE_` prefix bo'lishi shart — aks holda qiymatlar build da ko'rinmaydi.

---

## 3. Tuzatilgan xatolar (v2)

| # | Muammo | Tuzatish |
|---|--------|----------|
| 1 | **Oq ekran** — HMR / StrictMode da Firebase duplikat init | `getApps()` check qo'shildi |
| 2 | **Chat eski xabarlar** yuklanmaydi | `endBefore+limitToLast` query tuzatildi |
| 3 | **Chat cursor stale closure** | `chatCursorRef` ref qo'shildi |
| 4 | **Task o'zgarishi boshqaga ko'rinmaydi** | Permission-denied da optimistik revert |
| 5 | **Xodimlar bo'sh ko'rinadi** | `usersReady` flag alohida ajratildi |
| 6 | **Workspace flicker** | Cache-first loading qo'llanildi |
| 7 | **Firestore Rules get() chaqiruvlari ko'p** | `resource.data` ga o'zgartirildi |
| 8 | **`writeMetaDocs` dead code** | O'chirildi |
| 9 | **Chat xabar status** yangilanmaydi | Success pathda status='sent' set qilindi |
| 10 | **Firebase v12** unstable | Stable v10 ga qaytarildi |

---

## 4. Local ishga tushirish

```bash
npm install
cp .env.example .env
# .env faylni to'ldiring
npm run dev
```

---

## 5. Muhim eslatmalar

- Firestore Rules ni deploy qilishni unutmang: `firebase deploy --only firestore:rules`
- Firebase authorized domains ga Vercel URL ni qo'shing
- Vercel da har safar ENV o'zgartirganda redeploy kerak
