// src/pages/Workflow.jsx

const STEPS = [
  {
    number: 1,
    title: 'Brief qabul qilish',
    description: 'Mijozdan loyiha maqsadlari, maqsadli auditoriya, byudjet va muddat haqida to\'liq brief yig\'iladi. Dastlabki tahlil va savollar aniqlanadi.',
    department: 'Boshqaruv',
    deptColor: '#1d1d1f',
    deptBg: '#f5f5f7',
  },
  {
    number: 2,
    title: 'Strategiya ishlab chiqish',
    description: 'Mijoz maqsadlari asosida marketing strategiyasi, kontent yo\'nalishi va KPI ko\'rsatkichlari belgilanadi. Raqobatchilar tahlili o\'tkaziladi.',
    department: 'Marketing',
    deptColor: '#0071e3',
    deptBg: '#e8f0fe',
  },
  {
    number: 3,
    title: 'Kontent reja tuzish',
    description: 'Oylik kontent kalendarı, postlar tematikasi, formatlar (reels, post, story) va platformalar bo\'yicha reja tuziladi.',
    department: 'SMM',
    deptColor: '#bf5af2',
    deptBg: '#f5eeff',
  },
  {
    number: 4,
    title: 'Media plan',
    description: 'Reklama platformalari, byudjet taqsimoti, maqsadli auditoriya segmentatsiyasi va kutilayotgan natijalari (KPI) belgilanadi.',
    department: 'Marketing',
    deptColor: '#0071e3',
    deptBg: '#e8f0fe',
  },
  {
    number: 5,
    title: 'Kreativ ishlab chiqarish',
    description: 'Dizayner va kontent yaratuvchilar tomonidan vizual materiallar, bannerlar, video skriptlar va matilar tayyorlanadi.',
    department: 'Kreativ',
    deptColor: '#ff9500',
    deptBg: '#fff8ed',
  },
  {
    number: 6,
    title: 'Syomka va video',
    description: 'Operator va rejissyor bilan birga foto va video suratga olish ishlari amalga oshiriladi. Montaj va post-ishlov beriladi.',
    department: 'Videografiya',
    deptColor: '#ff3b30',
    deptBg: '#fff2f1',
  },
  {
    number: 7,
    title: 'Mijoz bilan kelishuv',
    description: 'Tayyorlangan materiallar mijozga taqdim etiladi. Sharhlar va o\'zgartishlar qabul qilinib, yakuniy tasdiqlash olinadi.',
    department: 'Boshqaruv',
    deptColor: '#1d1d1f',
    deptBg: '#f5f5f7',
  },
  {
    number: 8,
    title: 'Publikatsiya va ishga tushirish',
    description: 'Tasdiqlangan kontent rejalashtirilgan vaqtda barcha platformalarga joylashtiriladi. Reklama kampaniyalari ishga tushiriladi.',
    department: 'SMM',
    deptColor: '#bf5af2',
    deptBg: '#f5eeff',
  },
  {
    number: 9,
    title: 'Monitoring va optimallashtirish',
    description: 'Kampaniya natijalari kunlik kuzatiladi. Reklama byudjetlari, auditoriyalar va kreativlar real vaqtda optimallashtiriladi.',
    department: 'Marketing',
    deptColor: '#0071e3',
    deptBg: '#e8f0fe',
  },
  {
    number: 10,
    title: 'Hisobot va tahlil',
    description: 'Oylik hisobot tayyorlanadi: erishilgan KPI\'lar, sarflangan byudjet, leads soni, CPL, sotuvlar va ROI tahlili mijozga taqdim etiladi.',
    department: 'Boshqaruv',
    deptColor: '#34c759',
    deptBg: '#edfbf1',
  },
];

function StepCard({ step, isLast }) {
  return (
    <div style={{ display: 'flex', gap: 0 }}>
      {/* Timeline column */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 56, flexShrink: 0 }}>
        {/* Number circle */}
        <div style={{
          width: 44, height: 44,
          borderRadius: '50%',
          background: 'var(--text-primary)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '1rem',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          position: 'relative',
          zIndex: 1,
        }}>
          {step.number}
        </div>
        {/* Line */}
        {!isLast && (
          <div style={{
            width: 2,
            flex: 1,
            minHeight: 32,
            background: 'var(--border)',
            marginTop: 4,
          }} />
        )}
      </div>

      {/* Card */}
      <div
        style={{
          flex: 1,
          marginLeft: 16,
          marginBottom: isLast ? 0 : 20,
          transition: 'all var(--transition)',
        }}
      >
        <div
          className="card"
          style={{ padding: '18px 20px' }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
            <h3 style={{ fontSize: '1rem' }}>{step.title}</h3>
            <span style={{
              padding: '3px 10px',
              borderRadius: 20,
              fontSize: '0.72rem',
              fontWeight: 600,
              color: step.deptColor,
              background: step.deptBg,
              flexShrink: 0,
              letterSpacing: '0.01em',
            }}>
              {step.department}
            </span>
          </div>
          <p style={{
            fontSize: '0.86rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
          }}>
            {step.description}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Workflow() {
  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Workflow</h1>
          <div className="page-subtitle">Agentligi ish jarayoni — 10 bosqich</div>
        </div>
      </div>

      {/* Legend */}
      <div className="card" style={{ marginBottom: 28, padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>Bo'limlar:</span>
          {[...new Set(STEPS.map((s) => s.department))].map((dept) => {
            const step = STEPS.find((s) => s.department === dept);
            return (
              <span
                key={dept}
                style={{
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: step.deptColor,
                  background: step.deptBg,
                }}
              >
                {dept}
              </span>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ maxWidth: 720 }}>
        {STEPS.map((step, index) => (
          <StepCard key={step.number} step={step} isLast={index === STEPS.length - 1} />
        ))}
      </div>
    </div>
  );
}
