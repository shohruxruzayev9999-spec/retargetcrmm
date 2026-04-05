// ─── Design Tokens ────────────────────────────────────────────────────────────
export const T = {
  font: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, sans-serif`,
  colors: {
    bg: "#f5f5f7", surface: "#ffffff", surfaceMuted: "#ffffff",
    surfaceElevated: "#ffffff", border: "#e5e5ea", borderLight: "#f2f2f7",
    text: "#1d1d1f", textMuted: "#6e6e73", textSecondary: "#6e6e73",
    textTertiary: "#aeaeb2", accent: "#0071e3", accentHover: "#0077ed",
    accentSoft: "#e8f0fe", blue: "#0071e3", blueSoft: "#e8f0fe",
    green: "#34c759", greenSoft: "#e8fbed", orange: "#ff9f0a",
    orangeSoft: "#fff4e5", red: "#ff3b30", redSoft: "#fff0ef",
    purple: "#af52de", purpleSoft: "#f5eeff", indigo: "#5856d6",
    indigoSoft: "#eeeefe", teal: "#5ac8fa", tealSoft: "#edf8ff",
    yellow: "#ffcc00", yellowSoft: "#fff9db", slate: "#1d1d1f",
  },
  radius: { sm: 6, md: 10, lg: 14, xl: 18, full: 999 },
  shadow: {
    sm: "0 1px 3px rgba(0,0,0,0.08)",
    md: "0 4px 16px rgba(0,0,0,0.08)",
    lg: "0 8px 32px rgba(0,0,0,0.10)",
  },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
};

// ─── Roles ────────────────────────────────────────────────────────────────────
export const ROLE_META = {
  CEO:        { label: "CEO",          dept: "Boshqaruv",          title: "CEO" },
  MANAGER:    { label: "Menejer",      dept: "Project Management", title: "Loyiha menejeri" },
  SUPERVISOR: { label: "Boshqaruvchi", dept: "Boshqaruv",          title: "Boshqaruvchi" },
  INVESTOR:   { label: "Investor",     dept: "Investor",           title: "Investor" },
  OPERATOR:   { label: "Operator",     dept: "Media bo'limi",      title: "Videograf/Operator" },
  EDITOR:     { label: "Montajor",     dept: "Media bo'limi",      title: "Montajor" },
  EMPLOYEE:   { label: "Xodim",        dept: "SMM bo'limi",        title: "Xodim" },
};

// SEC-FIX: parollar olib tashlandi — faqat email→role mapping saqlanadi
export const FIXED_ROLE_BY_EMAIL = {
  "ceo@agency.uz":            { role: "CEO",        name: "Agency CEO",          dept: "Boshqaruv",          title: "CEO" },
  "manager@agency.uz":        { role: "MANAGER",    name: "Agency Menejer",      dept: "Project Management", title: "Loyiha menejeri" },
  "boshqaruvchi@agency.uz":   { role: "SUPERVISOR", name: "Agency Boshqaruvchi", dept: "Boshqaruv",          title: "Boshqaruvchi" },
  "investor@agency.uz":       { role: "INVESTOR",   name: "Agency Investor",     dept: "Investor",           title: "Investor" },
};

// ─── Statuses & Options ───────────────────────────────────────────────────────
export const PROJECT_STATUSES  = ["Rejalashtirildi","Jarayonda","Tasdiqlandi","Yakunlandi","To'xtatildi"];
export const TASK_STATUSES     = ["Rejalashtirildi","Jarayonda","Ko'rib chiqilmoqda","Tasdiqlandi","Bajarildi","Rad etildi"];
export const CONTENT_STATUSES  = ["Rejalashtirildi","Jarayonda","Ko'rib chiqilmoqda","Tasdiqlandi","E'lon qilindi","Rad etildi"];
export const PLAN_STATUSES     = ["Rejalashtirildi","Jarayonda","Tasdiqlandi","Bajarildi"];
export const COMMON_WORK_STATUSES = ["Yangi","Jarayonda","Kutilmoqda","Tasdiqlangan","Tugallangan","Bekor qilingan"];
export const SHOOT_STATUSES    = ["Yangi","Rejalashtirildi","Jarayonda","Kutilmoqda","Tasdiqlangan","Tasdiqlandi","Tugallangan","Bajarildi","Bekor qilingan"];
export const CALL_STATUSES     = COMMON_WORK_STATUSES;
export const PRIORITIES        = ["Yuqori","O'rta","Past"];
export const PLATFORMS         = ["Instagram","Facebook","TikTok","YouTube","Telegram"];
export const FORMATS           = ["Post","Reels","Story","Video","Carousel","Live"];
export const VIDEO_FORMATS     = ["Video", "Reels"];
export const DESIGN_TASK_STATUSES = [
  "Yangi TZ",
  "Jarayonda",
  "Ko'rib chiqilmoqda",
  "Tasdiqlandi",
  "Yakunlandi",
  "Rad etildi",
];
export const DESIGN_FORMATS = [
  "Banner", "Post", "Reels", "Story", "Logo", "Prezentatsiya", "Boshqa",
];
export const DEPARTMENTS       = ["SMM bo'limi","Target bo'limi","Media bo'limi","Grafik dizayn bo'limi","Sales bo'limi","Project Management","Boshqaruv"];
export const MONTAJ_STATUSES   = ["Kutilmoqda","Montajda","Ko'rib chiqilmoqda","Qayta ishlash","Bajarildi"];

export const EMOJI_GROUPS = [
  { id: "smileys",  label: "😊", name: "Smileys",  items: ["😀","😄","😁","🙂","😉","😍","🥰","🤩","😎","🥹","🤝","🙏"] },
  { id: "gestures", label: "🙌", name: "Qo'llar",  items: ["👍","👏","🙌","👌","✍️","🤞","🫶","💪","🫡","🤜","🤛","👀"] },
  { id: "work",     label: "💼", name: "Ish",      items: ["✅","🗂️","📌","📎","💼","📈","📊","📅","🎯","🚀","🔥","💡"] },
  { id: "moods",    label: "🌈", name: "Kayfiyat", items: ["🎉","🥳","❤️","💙","💚","💜","🌟","⚡","☕","🍀","🌈","✨"] },
];

// ─── Status / Priority Meta ───────────────────────────────────────────────────
export const STATUS_META = {
  "Yangi TZ":            { bg: "#eeeefe", text: "#4338ca", border: "#c7d2fe" },
  "Yangi":               { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  "Rejalashtirildi":     { bg: "#eef2ff", text: "#4338ca", border: "#c7d2fe" },
  "Jarayonda":           { bg: "#dbeafe", text: "#1d4ed8", border: "#93c5fd" },
  "Kutilmoqda":          { bg: "#fff7ed", text: "#c2410c", border: "#fdba74" },
  "Ko'rib chiqilmoqda":  { bg: "#ffedd5", text: "#c2410c", border: "#fdba74" },
  "Montajda":            { bg: "#dbeafe", text: "#1d4ed8", border: "#93c5fd" },
  "Review":              { bg: "#ffedd5", text: "#c2410c", border: "#fdba74" },
  "Revision":            { bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5" },
  "Qayta ishlash":       { bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5" },
  "Tasdiqlangan":        { bg: "#dcfce7", text: "#15803d", border: "#86efac" },
  "Tasdiqlandi":         { bg: "#dcfce7", text: "#15803d", border: "#86efac" },
  "Tugallangan":         { bg: "#dcfce7", text: "#166534", border: "#4ade80" },
  "Bajarildi":           { bg: "#dcfce7", text: "#166534", border: "#4ade80" },
  "E'lon qilindi":       { bg: "#ccfbf1", text: "#0f766e", border: "#5eead4" },
  "Rad etildi":          { bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5" },
  "Bekor qilingan":      { bg: "#f3f4f6", text: "#6b7280", border: "#d1d5db" },
  "Yakunlandi":          { bg: "#dcfce7", text: "#166534", border: "#4ade80" },
  "To'xtatildi":         { bg: "#f2f2f7", text: "#6e6e73", border: "#e5e5ea" },
};

export const PRIORITY_META = {
  "Yuqori": { bg: "#fee2e2", text: "#b91c1c" },
  "O'rta":  { bg: "#ffedd5", text: "#c2410c" },
  "Past":   { bg: "#dcfce7", text: "#166534" },
};

/** Jadval multi-select chip ranglari (platforma ustunlari) */
export const PLATFORM_META = {
  Instagram: { bg: "#fce7f3", text: "#9d174d", border: "#f9a8d4" },
  Facebook:  { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" },
  TikTok:    { bg: "#f3e8ff", text: "#6b21a8", border: "#d8b4fe" },
  YouTube:   { bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5" },
  Telegram:  { bg: "#e0f2fe", text: "#0369a1", border: "#7dd3fc" },
};

// ─── App Constants ────────────────────────────────────────────────────────────
export const ROOT_DOC_ID   = "agency-crm";
export const SCHEMA_VERSION = 3;
export const CRM_CACHE_KEY  = `agency-crm-cache:${ROOT_DOC_ID}`;
export const PROJECTS_PAGE_SIZE = 50;

// ─── Field Limits (UX-03 fix) ─────────────────────────────────────────────────
export const LIMITS = {
  projectName:  100,
  clientName:   100,
  taskName:     200,
  note:         1000,
  caption:      2000,
  title:        200,
};

// ─── Empty States ─────────────────────────────────────────────────────────────
export const EMPTY_PROJECT_WORKSPACE = {
  tasks: [], contentPlan: [], mediaPlan: [],
  plans: { daily: [], weekly: [], monthly: [] },
  calls: [],
};

export function getCurrentMonthId() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function getMonthLabel(monthId) {
  if (!monthId) return "";
  const [y, m] = monthId.split("-");
  const monthIndex = parseInt(m, 10) - 1;
  const months = ["Yanvar","Fevral","Mart","Aprel","May","Iyun",
    "Iyul","Avgust","Sentabr","Oktyabr","Noyabr","Dekabr"];
  return `${months[monthIndex] || monthId} ${y}`;
}
