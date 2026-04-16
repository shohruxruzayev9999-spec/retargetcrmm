import admin from "firebase-admin";
import nodemailer from "nodemailer";
import { logger, setGlobalOptions } from "firebase-functions/v2";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret, defineString } from "firebase-functions/params";

if (!admin.apps.length) {
  admin.initializeApp();
}

setGlobalOptions({ region: "europe-west3", maxInstances: 10 });

const db = admin.firestore();

const SMTP_HOST = defineSecret("SMTP_HOST");
const SMTP_PORT = defineSecret("SMTP_PORT");
const SMTP_USER = defineSecret("SMTP_USER");
const SMTP_PASS = defineSecret("SMTP_PASS");
const MAIL_FROM = defineSecret("MAIL_FROM");
const APP_URL = defineString("APP_URL", {
  default: "https://retargetcrmm.vercel.app",
});

function tztoday(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function formatDeadline(deadline) {
  if (!deadline) return "Ko'rsatilmagan";
  const date = new Date(`${deadline}T00:00:00`);
  return new Intl.DateTimeFormat("uz-UZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tashkent",
  }).format(date);
}

function isTaskDone(status) {
  return status === "Bajarildi" || status === "Tasdiqlandi";
}

function taskLink(projectId) {
  return `${APP_URL.value()}?project=${projectId}`;
}

function createTransporter() {
  return nodemailer.createTransport({
    host: SMTP_HOST.value(),
    port: Number(SMTP_PORT.value() || 587),
    secure: Number(SMTP_PORT.value() || 587) === 465,
    auth: {
      user: SMTP_USER.value(),
      pass: SMTP_PASS.value(),
    },
  });
}

async function sendRetargetMail({ to, subject, html, text }) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: MAIL_FROM.value(),
    to,
    subject,
    html,
    text,
  });
}

async function getProjectAndUser(projectId, userId) {
  const [projectSnap, userSnap] = await Promise.all([
    db.doc(`projects/${projectId}`).get(),
    db.doc(`users/${userId}`).get(),
  ]);
  return {
    project: projectSnap.exists ? projectSnap.data() : null,
    user: userSnap.exists ? userSnap.data() : null,
  };
}

export const sendNewTaskAssignedEmail = onDocumentCreated(
  {
    document: "projects/{projectId}/tasks/{taskId}",
    secrets: [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM],
  },
  async (event) => {
    const task = event.data?.data();
    const projectId = event.params.projectId;
    if (!task?.ownerId || !task?.name) return;

    const { project, user } = await getProjectAndUser(projectId, task.ownerId);
    if (!user?.email) {
      logger.info("Task email skipped: recipient email missing", { projectId, ownerId: task.ownerId });
      return;
    }

    const subject = `RETARGET: Yangi topshiriq — ${task.name}`;
    const deadline = formatDeadline(task.deadline);
    const projectName = project?.name || "CRM loyihasi";
    const link = taskLink(projectId);
    const text = [
      `Salom, ${user.name || user.email}!`,
      "",
      `Sizga RETARGET CRM ichida yangi topshiriq biriktirildi.`,
      `Loyiha: ${projectName}`,
      `Task: ${task.name}`,
      `Deadline: ${deadline}`,
      task.note ? `Izoh: ${task.note}` : null,
      "",
      `CRM havolasi: ${link}`,
    ].filter(Boolean).join("\n");

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1d1d1f;line-height:1.6">
        <h2 style="margin:0 0 12px">RETARGET CRM</h2>
        <p>Salom, <strong>${user.name || user.email}</strong>!</p>
        <p>Sizga yangi topshiriq biriktirildi.</p>
        <table style="border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:4px 10px 4px 0;color:#6e6e73">Loyiha</td><td><strong>${projectName}</strong></td></tr>
          <tr><td style="padding:4px 10px 4px 0;color:#6e6e73">Task</td><td><strong>${task.name}</strong></td></tr>
          <tr><td style="padding:4px 10px 4px 0;color:#6e6e73">Deadline</td><td><strong>${deadline}</strong></td></tr>
          ${task.note ? `<tr><td style="padding:4px 10px 4px 0;color:#6e6e73">Izoh</td><td>${task.note}</td></tr>` : ""}
        </table>
        <p><a href="${link}" style="color:#0071e3;text-decoration:none">CRM'ni ochish</a></p>
      </div>
    `;

    await sendRetargetMail({ to: user.email, subject, html, text });
    logger.info("Task assignment email sent", { projectId, taskId: event.params.taskId, to: user.email });
  }
);

export const sendUpcomingDeadlineReminders = onSchedule(
  {
    schedule: "0 8 * * *",
    timeZone: "Asia/Tashkent",
    secrets: [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM],
  },
  async () => {
    const today = tztoday();
    const tomorrow = tztoday(new Date(Date.now() + 24 * 60 * 60 * 1000));
    const snap = await db
      .collectionGroup("tasks")
      .where("deadline", ">=", today)
      .where("deadline", "<=", tomorrow)
      .get();

    if (snap.empty) {
      logger.info("No upcoming task deadlines found");
      return;
    }

    const batch = db.batch();
    for (const docSnap of snap.docs) {
      const task = docSnap.data();
      if (!task?.ownerId || !task?.deadline || isTaskDone(task.status)) continue;
      if (task.deadlineReminderKey === task.deadline) continue;

      const projectRef = docSnap.ref.parent.parent;
      const projectId = projectRef?.id;
      if (!projectId) continue;

      const { project, user } = await getProjectAndUser(projectId, task.ownerId);
      if (!user?.email) continue;

      const subject = `RETARGET: Deadline yaqinlashdi — ${task.name}`;
      const deadline = formatDeadline(task.deadline);
      const projectName = project?.name || "CRM loyihasi";
      const link = taskLink(projectId);
      const text = [
        `Salom, ${user.name || user.email}!`,
        "",
        `RETARGET CRM eslatmasi: task deadline yaqinlashdi.`,
        `Loyiha: ${projectName}`,
        `Task: ${task.name}`,
        `Deadline: ${deadline}`,
        "",
        `CRM havolasi: ${link}`,
      ].join("\n");

      const html = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1d1d1f;line-height:1.6">
          <h2 style="margin:0 0 12px">RETARGET CRM</h2>
          <p>Salom, <strong>${user.name || user.email}</strong>!</p>
          <p>Task deadline yaqinlashdi. Iltimos, o'z vaqtida yakunlang.</p>
          <table style="border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:4px 10px 4px 0;color:#6e6e73">Loyiha</td><td><strong>${projectName}</strong></td></tr>
            <tr><td style="padding:4px 10px 4px 0;color:#6e6e73">Task</td><td><strong>${task.name}</strong></td></tr>
            <tr><td style="padding:4px 10px 4px 0;color:#6e6e73">Deadline</td><td><strong>${deadline}</strong></td></tr>
          </table>
          <p><a href="${link}" style="color:#0071e3;text-decoration:none">CRM'ni ochish</a></p>
        </div>
      `;

      await sendRetargetMail({ to: user.email, subject, html, text });
      batch.set(docSnap.ref, {
        deadlineReminderKey: task.deadline,
        deadlineReminderSentAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    await batch.commit();
    logger.info("Upcoming deadline reminder run completed");
  }
);
