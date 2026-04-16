# RetargetCRM — Deploy qo'llanmasi v3 (Security Fixed)

## ⚠️ MUHIM XAVFSIZLIK ESLATMASI
Parollarni hech qachon kodda yozmang. Barcha maxfiy ma'lumotlar `.env` faylida saqlanadi
va `.gitignore` orqali GitHubga tushmaydi.

---

## 1. Firebase sozlamasi

### Authentication
1. Firebase Console → Authentication → Sign-in method
2. **Email/Password** → Enable
3. **Google** → Enable
4. Settings → **Authorized domains** → Vercel URL qo'shing

### Firestore Database
1. Firebase Console → Firestore Database → Create database → **Production mode**
2. Region: `europe-west3` (yoki yaqin region)

### Firestore Rules
Firebase Console → Firestore → Rules bo'limiga `firestore.rules` faylidan nusxa oling.

### Rol akkauntlarini yaratish
Firebase Console → Authentication → Users → Add user:

| Email                      | Rol        | Parol          |
|---------------------------|------------|----------------|
| `ceo@agency.uz`           | CEO        | Kuchli parol * |
| `manager@agency.uz`       | MANAGER    | Kuchli parol * |
| `boshqaruvchi@agency.uz`  | SUPERVISOR | Kuchli parol * |
| `investor@agency.uz`      | INVESTOR   | Kuchli parol * |

\* Kamida 12 ta belgi, katta-kichik harf, raqam va belgilar aralash.
   Parollarni Firebase Console da yarating — kodda HECH QACHON yozmang.

---

## 2. Vercel Deploy

```bash
git add .
git commit -m "feat: v3 security fixed"
git push origin main
```

Vercel Dashboard → New Project → GitHub → Environment Variables:

```
VITE_FIREBASE_API_KEY             = AIza...
VITE_FIREBASE_AUTH_DOMAIN         = your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID          = your-project-id
VITE_FIREBASE_STORAGE_BUCKET      = your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID = 123456789
VITE_FIREBASE_APP_ID              = 1:123...
```

## 2.1 Task email xabarlari (RETARGET)

Yangi task qo'shilganda va deadline yaqinlashganda email ketishi uchun Firebase Functions deploy qilinadi.

### 1. Functions dependencies o'rnatish

```bash
cd functions
npm install
cd ..
```

### 2. Gmail app password kiriting

Hozirgi sozlamada yuboruvchi email default qilib qo'yilgan:

- `SMTP_USER` → `shohruxruzayev9999@gmail.com`
- `MAIL_FROM` → `RETARGET <shohruxruzayev9999@gmail.com>`
- `SMTP_HOST` → `smtp.gmail.com`
- `SMTP_PORT` → `465`

Shu sabab sizdan faqat bitta secret kerak bo'ladi:

```bash
firebase functions:secrets:set SMTP_PASS
```

Bu yerga Gmail uchun yaratilgan **16 belgili App Password** kiritiladi.

### 3. CRM URL parametrini kiriting

`functions/index.js` ichida `APP_URL` default qiymati bor:

```txt
https://retargetcrmm.vercel.app
```

Agar custom domain ishlatsangiz, `functions/.env` ichiga quyidagini yozib deploy qiling:

```bash
APP_URL=https://sizning-domainingiz.uz
```

### 4. Functions deploy

```bash
firebase deploy --only functions
```

Deploy bo'lgach:
- yangi task yaratilsa → biriktirilgan xodimga email boradi
- har kuni soat 08:00 da → deadline yaqinlashgan tasklar uchun reminder email boradi

---

## 3. Tuzatilgan kamchiliklar (v3)

| # | Muammo                          | Tuzatish                                      |
|---|----------------------------------|-----------------------------------------------|
| SEC-01 | Parollar kodda ochiq        | FIXED_ROLE_BLUEPRINTS.password olib tashlandi |
| SEC-02 | Firestore list hammaga ochiq| Rules da membership check qo'shildi           |
| SEC-03 | Har kim notification yozadi | create: if isManagerRole() cheklovi            |
| ARCH-01| 4935 qatorli monolitik fayl | 10+ modul va pages papkaga ajratildi           |
| ARCH-02| Collection ref har renderde | Module-level COLS ob'ekti yaratildi            |
| ARCH-03| 0 ta useCallback            | Barcha handler funksiyalarga useCallback       |
| ARCH-04| Dead code (finalizeMutation)| O'chirildi                                    |
| ARCH-05| Bitta authError hamma uchun | Kategoriyalashtirilgan xato boshqaruvi         |
| DATA-01| Transaction yo'q            | Firestore runTransaction qo'shildi             |
| DATA-02| Client-side timestamp       | serverTimestamp() ga o'tish yo'l xaritasi      |
| DATA-03| JSON.stringify har render   | recordsEqual shallow compare bilan almashtir.  |
| DATA-04| Archive subcollections qolar| Cloud Functions cascade delete yo'l xaritasi   |
| PERF-01| Limit yo'q proyektlarda     | Query limit(50) qo'shildi                      |
| PERF-02| window.confirm (9 joy)      | useConfirm custom hook bilan almashtir.        |
| PERF-03| Chat badge yangilanmaydi    | Notifications always-on subscription           |
| PERF-04| O(n²) employeeMetrics       | O(n) single-pass buildProjectCaches            |
| UX-01  | canViewReports mantiq xato  | ROLES_WITH_REPORT_ACCESS toza Set              |
| UX-02  | Chat o'chirish yo'q         | deleteChatMessage qo'shildi                    |
| UX-03  | Input validatsiya yo'q      | Field komponentida maxLength + required        |
| UX-04  | SCHEMA_VERSION izchilsizlik | Konstantadan foydalanildi                      |
| UX-05  | 2s safety net noto'g'ri     | 3s va bootSettled logikasi takomillashtirildi  |
| SEC    | .gitignore yo'q             | .env ni GitHubdan himoya qiladi               |
