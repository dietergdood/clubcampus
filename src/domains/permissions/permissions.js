/* ═══════════════════════════════════════════════════════════════
   ClubCampus — domains/permissions/permissions.js
   Zentrale Berechtigungen für alle Module
   War verstreut: kannVerwalten(), role.includes([...]), hardcoded
   ═══════════════════════════════════════════════════════════════ */

const ADMIN_ROLES = ["administrator", "administration"];
const MANAGEMENT_ROLES = [...ADMIN_ROLES, "funktionaer"];
const TRAINER_ROLES = [...ADMIN_ROLES, "trainer"];
const ALL_STAFF = [...ADMIN_ROLES, "funktionaer", "trainer"];

/* ── Mitglieder ──────────────────────────────────────────────── */
export const memberPermissions = {
  canView:    (role) => true,
  canEdit:    (role) => MANAGEMENT_ROLES.includes(role),
  canDelete:  (role) => ADMIN_ROLES.includes(role),
  canExport:  (role) => MANAGEMENT_ROLES.includes(role),
  canArchive: (role) => MANAGEMENT_ROLES.includes(role),
  canViewAhv: (role) => ADMIN_ROLES.includes(role),
  canViewAll: (role) => MANAGEMENT_ROLES.includes(role),
};

/* ── Kader ───────────────────────────────────────────────────── */
export const kaderPermissions = {
  canView:   (role) => ALL_STAFF.includes(role),
  canEdit:   (role) => ALL_STAFF.includes(role),
  canDelete: (role) => ALL_STAFF.includes(role),
  canExport: (role) => ALL_STAFF.includes(role),
  canAdd:    (role) => ALL_STAFF.includes(role),
};

/* ── Termine ─────────────────────────────────────────────────── */
export const terminePermissions = {
  canView:   (role) => true,
  canEdit:   (role) => ALL_STAFF.includes(role),
  canDelete: (role) => ALL_STAFF.includes(role),
  canAdd:    (role) => ALL_STAFF.includes(role),
};

/* ── Helfer ──────────────────────────────────────────────────── */
export const helferPermissions = {
  canView:      (role) => true,
  canEdit:      (role) => MANAGEMENT_ROLES.includes(role),
  canZuteilen:  (role) => ALL_STAFF.includes(role),
  canFreigeben: (role) => ALL_STAFF.includes(role),
  canControlling: (role) => MANAGEMENT_ROLES.includes(role),
};

/* ── Teams ───────────────────────────────────────────────────── */
export const teamPermissions = {
  canView:   (role) => true,
  canEdit:   (role) => ADMIN_ROLES.includes(role),
  canDelete: (role) => ADMIN_ROLES.includes(role),
  canAdd:    (role) => ADMIN_ROLES.includes(role),
};

/* ── Trainingsplan ───────────────────────────────────────────── */
export const trainingsplanPermissions = {
  canView:   (role) => true,
  canEdit:   (role) => ADMIN_ROLES.includes(role),
};

/* ── Portalverwaltung ────────────────────────────────────────── */
export const portalPermissions = {
  canView:   (role) => ADMIN_ROLES.includes(role),
  canEdit:   (role) => ADMIN_ROLES.includes(role),
};

/* ── Nachrichten ─────────────────────────────────────────────── */
export const nachrichtenPermissions = {
  canView:   (role) => true,
  canSend:   (role) => ALL_STAFF.includes(role),
  canDelete: (role) => MANAGEMENT_ROLES.includes(role),
};
