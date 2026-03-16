// scripts/seed.mjs
// Run ONCE to populate Firestore with sample data.
// Usage: node scripts/seed.mjs
//
// Requires: GOOGLE_APPLICATION_CREDENTIALS env var OR Firebase Admin SDK service account.
// npm install firebase-admin  (run from project root)

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// ─── CONFIG ───────────────────────────────────────────────────────────────────
// Replace with your service account key path or use GOOGLE_APPLICATION_CREDENTIALS
// const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));

initializeApp({
  // credential: cert(serviceAccount),
  // Or use Application Default Credentials if GOOGLE_APPLICATION_CREDENTIALS is set
});

const db = getFirestore();

// ─── SAMPLE DATA ──────────────────────────────────────────────────────────────
async function seed() {
  console.log('🌱 Seeding Firestore...\n');

  const batch = db.batch();

  // Sample projects
  const projects = [
    {
      name: 'Faol Reklama Campaign',
      client: 'TechCorp UZ',
      description: 'Instagram va TikTok uchun to\'liq SMM xizmati',
      status: 'Faol',
      budget: 5000,
      startDate: '2025-01-01',
      endDate: '2025-03-31',
      teamIds: [],
      taskCount: 12,
      doneCount: 7,
    },
    {
      name: 'Brendmauer dizayni',
      client: 'GreenFood',
      description: 'Outdoor reklama uchun kreativ materiallar',
      status: 'Jarayonda',
      budget: 2500,
      startDate: '2025-02-01',
      endDate: '2025-02-28',
      teamIds: [],
      taskCount: 8,
      doneCount: 3,
    },
    {
      name: 'YouTube kanal boshlash',
      client: 'MegaMart',
      description: 'YouTube kanalini noldan ishga tushirish',
      status: 'Rejalashtirildi',
      budget: 8000,
      startDate: '2025-03-01',
      endDate: '2025-06-30',
      teamIds: [],
      taskCount: 20,
      doneCount: 0,
    },
    {
      name: 'SEO Optimallashtirish',
      client: 'UniPharma',
      description: 'Website SEO va kontent strategiyasi',
      status: 'Yakunlandi',
      budget: 1800,
      startDate: '2024-11-01',
      endDate: '2024-12-31',
      teamIds: [],
      taskCount: 15,
      doneCount: 15,
    },
  ];

  for (const p of projects) {
    const ref = db.collection('projects').doc();
    batch.set(ref, { ...p, createdAt: new Date() });
  }

  // Sample shoots
  const shoots = [
    {
      title: 'TechCorp mahsulot syomkasi',
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      time: '10:00',
      location: 'Yunusobod, 14-uy studiya',
      operator: 'Jasur Karimov',
      project: 'Faol Reklama Campaign',
      notes: 'Kamida 3 ta fon tayyorlansin',
      createdAt: new Date(),
    },
    {
      title: 'GreenFood lifestyle syomka',
      date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      time: '14:00',
      location: 'Mirzo Ulug\'bek, bog\' ',
      operator: 'Sherzod Toshmatov',
      project: 'Brendmauer dizayni',
      notes: '',
      createdAt: new Date(),
    },
  ];

  for (const s of shoots) {
    const ref = db.collection('shoots').doc();
    batch.set(ref, s);
  }

  // Sample meetings
  const meetings = [
    {
      date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
      type: 'Mijoz bilan',
      participants: 'TechCorp direktor, Account manager',
      result: 'Muvaffaqiyatli',
      summary: 'Q1 natijalari muhokama qilindi. Mijoz kontent sifatidan mamnun.',
      nextStep: 'Q2 brief tayyorlash va yuborish',
      project: 'Faol Reklama Campaign',
      createdAt: new Date(),
    },
    {
      date: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
      type: 'Jamoa ichki',
      participants: 'SMM jamoasi, Creative director',
      result: 'Muvaffaqiyatli',
      summary: 'Yangi kontent formatlar muhokama qilindi. Reels uchun yangi g\'oyalar keltirildi.',
      nextStep: 'Reels skript yozish va tasdiqlash',
      project: '',
      createdAt: new Date(),
    },
  ];

  for (const m of meetings) {
    const ref = db.collection('meetings').doc();
    batch.set(ref, m);
  }

  await batch.commit();
  console.log('✅ Sample projects, shoots, meetings created.\n');
  console.log('📝 Next steps:');
  console.log('   1. Create users via Firebase Auth Console');
  console.log('   2. Set user roles in Firestore: users/{uid}.role');
  console.log('   3. Set salaries in: userPrivate/{uid}.salary');
  console.log('\nDone! 🎉');
}

seed().catch(console.error);
