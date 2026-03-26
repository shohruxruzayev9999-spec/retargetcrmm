import {
  collection, doc, getDoc, getDocs, setDoc,
  writeBatch, deleteDoc, onSnapshot, orderBy, query,
  limit, limitToLast, endBefore, runTransaction,
} from "firebase/firestore";
import { db } from "./firebase.js";
import { makeId, isoNow, recordsEqual, flattenPlans, indexById } from "./utils.js";
import { SCHEMA_VERSION } from "./constants.js";

// ─── Batch Commit (max 400 ops per batch) ─────────────────────────────────────
export async function commitBatchOperations(operations) {
  if (!operations.length || !db) return;
  let batch = writeBatch(db);
  let count = 0;
  for (const op of operations) {
    if (op.type === "set")         batch.set(op.ref, op.data, op.options || {});
    else if (op.type === "delete") batch.delete(op.ref);
    if (++count === 400) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  }
  if (count) await batch.commit();
}

// ─── Subcollection Sync ───────────────────────────────────────────────────────
export function syncCollectionOperations(baseCollection, previousItems, nextItems) {
  const ops     = [];
  const prevMap = indexById(previousItems || []);
  const nextMap = indexById(nextItems     || []);
  for (const item of Object.values(nextMap)) {
    const prev = prevMap[item.id];
    if (!prev || !recordsEqual(prev, item))
      ops.push({ type: "set", ref: doc(baseCollection, item.id), data: { ...item }, options: { merge: false } });
  }
  for (const id of Object.keys(prevMap))
    if (!nextMap[id]) ops.push({ type: "delete", ref: doc(baseCollection, id) });
  return ops;
}

// ─── Meta Doc Creators ────────────────────────────────────────────────────────
export function createMetaDocs(meta, actor) {
  const docs = [];
  if (meta?.notifyText) {
    docs.push({
      collection: "notifications",
      id: makeId("notification"),
      data: {
        text:      meta.notifyText,
        page:      meta.page || "dashboard",
        actorId:   actor?.uid || "",
        actorName: actor?.name || actor?.email || "Tizim",
        createdAt: isoNow(),
        readBy:    actor?.uid ? { [actor.uid]: true } : {},
      },
    });
  }
  if (!meta?.skipAudit) {
    docs.push({
      collection: "auditLogs",
      id: makeId("audit"),
      data: {
        text:      meta?.auditText || meta?.notifyText || "CRM ma'lumoti yangilandi",
        actorId:   actor?.uid || "",
        actorName: actor?.name || actor?.email || "Tizim",
        createdAt: isoNow(),
      },
    });
  }
  return docs;
}

// ─── Assigned-project-IDs sync ops ───────────────────────────────────────────
export function buildAssignedProjectIdOps(nextProjects, affectedUserIds, currentPublicUsers) {
  const ops = [];
  const assignmentMap = {};
  const usersById = new Map((currentPublicUsers || []).map((user) => [user.id, user]));
  const emailToIds = new Map();

  function normalizedEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  (currentPublicUsers || []).forEach((user) => {
    const email = normalizedEmail(user?.email);
    if (!email) return;
    if (!emailToIds.has(email)) emailToIds.set(email, new Set());
    emailToIds.get(email).add(user.id);
  });

  function aliasIdsForUserId(userId) {
    const user = usersById.get(userId);
    const email = normalizedEmail(user?.email);
    if (!email || !emailToIds.has(email)) return [userId];
    return Array.from(emailToIds.get(email));
  }

  nextProjects.forEach(p => {
    [p.managerId, ...(p.teamIds || [])].filter(Boolean).forEach(uid => {
      aliasIdsForUserId(uid).forEach((aliasId) => {
        if (!assignmentMap[aliasId]) assignmentMap[aliasId] = [];
        if (!assignmentMap[aliasId].includes(p.id)) assignmentMap[aliasId].push(p.id);
      });
    });
  });

  const expandedAffectedUserIds = new Set();
  for (const userId of affectedUserIds) {
    aliasIdsForUserId(userId).forEach((aliasId) => expandedAffectedUserIds.add(aliasId));
  }

  for (const userId of expandedAffectedUserIds) {
    const current = usersById.get(userId)?.assignedProjectIds || [];
    const next = assignmentMap[userId] || [];
    const same = current.length === next.length && current.every(id => next.includes(id));
    if (!same && db) {
      ops.push({
        type: "set",
        ref: doc(db, "users", userId),
        data: { assignedProjectIds: next, updatedAt: isoNow() },
        options: { merge: true },
      });
    }
  }
  return ops;
}

// ─── Legacy schema migration ──────────────────────────────────────────────────
export async function migrateLegacyRootSchema({ legacyRootRef, actor }) {
  if (!db) return { migrated: false, reason: "no-db" };
  const metaRef  = doc(db, "crmMeta", "agency-crm");
  const metaSnap = await getDoc(metaRef);
  if (metaSnap.exists() && Number(metaSnap.data()?.schemaVersion || 0) >= SCHEMA_VERSION)
    return { migrated: false, reason: "already-migrated" };
  const legacySnap = await getDoc(legacyRootRef);
  if (!legacySnap.exists()) {
    await setDoc(metaRef, { schemaVersion: SCHEMA_VERSION, migratedAt: isoNow(), migratedBy: actor?.uid || "" }, { merge: true });
    return { migrated: false, reason: "no-legacy-data" };
  }
  await setDoc(metaRef, { schemaVersion: SCHEMA_VERSION, migratedAt: isoNow(), migratedBy: actor?.uid || "" }, { merge: true });
  return { migrated: true };
}
