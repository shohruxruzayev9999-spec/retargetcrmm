import React from "react";

const services = [
  {
    title: "Brend Strategiya",
    text: "Bozor tahlili, positioning va vizual yo‘nalish bilan kuchli brend asosini quramiz.",
  },
  {
    title: "Kontent & SMM",
    text: "Instagram, TikTok va YouTube uchun sotuvga ishlaydigan kontent tizimini yaratamiz.",
  },
  {
    title: "Performance Ads",
    text: "Meta va Google reklamalarini ROI markazida optimizatsiya qilamiz.",
  },
];

const metrics = [
  { value: "120+", label: "Yakunlangan loyiha" },
  { value: "4.8/5", label: "Mijoz bahosi" },
  { value: "2.7x", label: "O‘rtacha ROI o‘sishi" },
];

const plans = [
  {
    name: "Start",
    price: "7 900 000",
    details: ["SMM strategiya", "12 ta post/reels", "Haftalik hisobot"],
  },
  {
    name: "Growth",
    price: "14 900 000",
    details: ["To‘liq kontent jamoasi", "Performance reklama", "A/B test + dashboard"],
    featured: true,
  },
  {
    name: "Scale",
    price: "24 900 000",
    details: ["Multi-platform kampaniya", "Video production", "KPI bo‘yicha consulting"],
  },
];

export default function App() {
  return (
    <div className="page">
      <style>{`
        :root {
          --bg: #f7f4ef;
          --ink: #172121;
          --muted: #5f6464;
          --card: #ffffff;
          --accent: #ff6b2c;
          --accent-dark: #d94f16;
          --line: #e5ddd1;
          --soft: #fff1e9;
        }

        * { box-sizing: border-box; }

        body {
          margin: 0;
          font-family: "Avenir Next", "Manrope", "Segoe UI", sans-serif;
          color: var(--ink);
          background: radial-gradient(circle at 20% 10%, #ffe2d2 0%, transparent 35%),
                      radial-gradient(circle at 85% 25%, #f1f8d8 0%, transparent 30%),
                      var(--bg);
        }

        .page { min-height: 100vh; }

        .container {
          width: min(1120px, 92%);
          margin: 0 auto;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 0;
        }

        .logo {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: 0.02em;
        }

        .logo span { color: var(--accent); }

        .nav {
          display: flex;
          gap: 20px;
          color: var(--muted);
          font-weight: 600;
          font-size: 14px;
        }

        .cta {
          border: 0;
          padding: 12px 18px;
          border-radius: 999px;
          background: var(--accent);
          color: white;
          font-weight: 700;
          cursor: pointer;
          transition: 180ms ease;
        }

        .cta:hover {
          background: var(--accent-dark);
          transform: translateY(-1px);
        }

        .hero {
          display: grid;
          grid-template-columns: 1.1fr .9fr;
          gap: 24px;
          align-items: center;
          padding: 36px 0 40px;
        }

        .badge {
          display: inline-block;
          background: var(--soft);
          border: 1px solid #ffd7c2;
          color: #aa430f;
          font-weight: 700;
          padding: 8px 14px;
          border-radius: 999px;
          font-size: 12px;
          margin-bottom: 14px;
        }

        h1 {
          margin: 0;
          font-size: clamp(32px, 5vw, 64px);
          line-height: 1.04;
          letter-spacing: -0.03em;
        }

        .hero p {
          color: var(--muted);
          font-size: 18px;
          max-width: 600px;
          margin-top: 16px;
          line-height: 1.55;
        }

        .hero-actions {
          margin-top: 24px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .ghost {
          border: 1px solid var(--line);
          background: #fff;
          color: var(--ink);
          padding: 12px 18px;
          border-radius: 999px;
          font-weight: 700;
          cursor: pointer;
        }

        .hero-card {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 20px 40px rgba(85, 55, 25, 0.08);
          transform: rotate(-1deg);
        }

        .hero-card h3 {
          margin: 0 0 14px;
          font-size: 18px;
        }

        .line {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px dashed #eadfce;
          font-weight: 600;
        }

        .line:last-child { border-bottom: 0; }

        .section {
          padding: 68px 0;
        }

        .section-head {
          max-width: 680px;
          margin-bottom: 26px;
        }

        .section-head h2 {
          margin: 0;
          font-size: clamp(26px, 4vw, 44px);
          letter-spacing: -0.02em;
        }

        .section-head p {
          margin-top: 10px;
          color: var(--muted);
          line-height: 1.6;
        }

        .grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .card {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 20px;
        }

        .card h3 { margin: 0 0 8px; }
        .card p { margin: 0; color: var(--muted); line-height: 1.55; }

        .metrics {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .metric {
          text-align: center;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 22px 14px;
        }

        .metric strong {
          display: block;
          font-size: clamp(28px, 4.5vw, 42px);
          line-height: 1;
          margin-bottom: 6px;
        }

        .pricing {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .price-card {
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 20px;
          background: #fff;
        }

        .price-card.featured {
          border-color: #ffb58f;
          background: linear-gradient(180deg, #fff7f2, #ffffff 35%);
          box-shadow: 0 18px 28px rgba(255, 107, 44, 0.16);
        }

        .price { font-size: 30px; font-weight: 800; margin: 10px 0 14px; }
        .price small { font-size: 14px; color: var(--muted); font-weight: 600; }

        ul {
          margin: 0;
          padding-left: 18px;
          color: var(--muted);
          line-height: 1.8;
        }

        .final-cta {
          margin: 72px 0 30px;
          background: #172121;
          color: #ecf2ef;
          border-radius: 24px;
          padding: 34px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .final-cta h3 {
          margin: 0;
          font-size: clamp(24px, 4vw, 38px);
          letter-spacing: -0.02em;
        }

        .final-cta p {
          margin: 8px 0 0;
          color: #c5d0cd;
        }

        footer {
          padding: 18px 0 28px;
          color: var(--muted);
          font-size: 13px;
          text-align: center;
        }

        @media (max-width: 960px) {
          .hero,
          .grid-3,
          .metrics,
          .pricing {
            grid-template-columns: 1fr;
          }

          .topbar .nav { display: none; }

          .hero-card {
            transform: none;
          }
        }
      `}</style>

      <header className="container topbar">
        <div className="logo">MARKET<span>UP</span></div>
        <nav className="nav">
          <span>Xizmatlar</span>
          <span>Jarayon</span>
          <span>Narxlar</span>
          <span>Kontakt</span>
        </nav>
        <button className="cta">Bepul audit</button>
      </header>

      <main className="container">
        <section className="hero">
          <div>
            <span className="badge">2026 uchun yangilangan growth tizim</span>
            <h1>Biznesingizni kontent va reklama orqali real o‘sishga olib chiqamiz.</h1>
            <p>
              Strategiya, kreativ va performance marketingni bitta jamoada birlashtirib,
              ko‘rinish emas, natija beradigan digital system quramiz.
            </p>
            <div className="hero-actions">
              <button className="cta">Loyihani boshlash</button>
              <button className="ghost">Portfolio ko‘rish</button>
            </div>
          </div>

          <aside className="hero-card">
            <h3>Oxirgi 90 kun natijalari</h3>
            <div className="line"><span>Leadlar soni</span><strong>+214%</strong></div>
            <div className="line"><span>CPA kamayishi</span><strong>-31%</strong></div>
            <div className="line"><span>Sotuv konversiyasi</span><strong>+18%</strong></div>
            <div className="line"><span>Organik reach</span><strong>1.9M</strong></div>
          </aside>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Sizga kerak bo‘lgan 3 asosiy yo‘nalish</h2>
            <p>
              Har bir xizmat alohida emas, yagona funnel sifatida ishlaydi: trafik, ishonch va sotuv.
            </p>
          </div>
          <div className="grid-3">
            {services.map((item) => (
              <article className="card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Raqamlar biz haqimizda gapiradi</h2>
          </div>
          <div className="metrics">
            {metrics.map((m) => (
              <div className="metric" key={m.label}>
                <strong>{m.value}</strong>
                <span>{m.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Paketlar</h2>
            <p>Budjet va maqsadingizga mos modelni tanlang. Har paket KPI bilan yuritiladi.</p>
          </div>
          <div className="pricing">
            {plans.map((p) => (
              <article className={`price-card ${p.featured ? "featured" : ""}`} key={p.name}>
                <h3>{p.name}</h3>
                <div className="price">
                  {p.price} <small>so‘m / oy</small>
                </div>
                <ul>
                  {p.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="final-cta">
          <div>
            <h3>30 daqiqalik strategik sessiyani bron qiling.</h3>
            <p>Suhbatdan keyin sizga aniq roadmap va KPI modeli beriladi.</p>
          </div>
          <button className="cta">Uchrashuv belgilash</button>
        </section>
      </main>

      <footer className="container">© 2026 MARKETUP. Barcha huquqlar himoyalangan.</footer>
    </div>
  );
}
