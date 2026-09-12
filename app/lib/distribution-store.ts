import "server-only";

import { PortalError } from "./directory-store";
import { getRuntimeEnv } from "./runtime-env";
import "./server-runtime";

export type DistributionWorkspaceRecord = {
  state: Record<string, unknown> | null;
  revision: number;
  updatedAt: string | null;
};

const MAX_PAYLOAD_BYTES = 4_000_000;
const LIMITS = {
  contacts: 5_000,
  lists: 1_500,
  templates: 1_500,
  campaigns: 1_500,
  recipientsPerCampaign: 10_000,
};

function d1() {
  const database = getRuntimeEnv().DB;
  if (!database) throw new PortalError("La base de datos del portal no está disponible.", 503);
  return database;
}

function owner(email: string) {
  return email.trim().toLowerCase();
}

function asArray(value: unknown, name: keyof typeof LIMITS) {
  if (!Array.isArray(value)) throw new PortalError(`El bloque ${name} no tiene un formato válido.`);
  if (value.length > LIMITS[name]) throw new PortalError(`El bloque ${name} excede el límite permitido.`);
  return value;
}

function sanitizeWorkspaceState(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new PortalError("El estado de mensajería no tiene un formato válido.");
  }

  const state = input as Record<string, unknown>;
  const contacts = asArray(state.contacts, "contacts");
  const lists = asArray(state.lists, "lists");
  const templates = asArray(state.templates, "templates");
  const campaigns = asArray(state.campaigns, "campaigns");

  for (const campaign of campaigns) {
    if (!campaign || typeof campaign !== "object" || Array.isArray(campaign)) {
      throw new PortalError("Hay una campaña con formato inválido.");
    }
    const recipients = (campaign as Record<string, unknown>).recipients;
    if (!Array.isArray(recipients)) throw new PortalError("Hay una campaña sin destinatarios válidos.");
    if (recipients.length > LIMITS.recipientsPerCampaign) {
      throw new PortalError("Una campaña excede el límite de destinatarios permitido.");
    }
  }

  if (!state.settings || typeof state.settings !== "object" || Array.isArray(state.settings)) {
    throw new PortalError("La configuración de mensajería no tiene un formato válido.");
  }

  const normalized = {
    contacts,
    lists,
    templates,
    campaigns,
    settings: state.settings,
  };
  const serialized = JSON.stringify(normalized);
  if (new TextEncoder().encode(serialized).byteLength > MAX_PAYLOAD_BYTES) {
    throw new PortalError("El respaldo de mensajería es demasiado grande para sincronizarse.");
  }
  return { normalized, serialized };
}

export async function getDistributionWorkspace(email: string): Promise<DistributionWorkspaceRecord> {
  const row = await d1().prepare(
    "SELECT payload_json, revision, updated_at FROM distribution_workspaces WHERE owner_email = ?"
  ).bind(owner(email)).first<Record<string, unknown>>();

  if (!row) return { state: null, revision: 0, updatedAt: null };

  try {
    const parsed = JSON.parse(String(row.payload_json ?? "{}"));
    return {
      state: parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null,
      revision: Number(row.revision ?? 0),
      updatedAt: row.updated_at ? String(row.updated_at) : null,
    };
  } catch {
    throw new PortalError("El respaldo sincronizado no pudo leerse. Contacta a administración.", 500);
  }
}

export async function saveDistributionWorkspace(email: string, input: unknown) {
  const { normalized, serialized } = sanitizeWorkspaceState(input);
  const normalizedOwner = owner(email);

  await d1().prepare(
    `INSERT INTO distribution_workspaces (owner_email, payload_json, revision, updated_at)
     VALUES (?, ?, 1, CURRENT_TIMESTAMP)
     ON CONFLICT(owner_email) DO UPDATE SET
       payload_json = excluded.payload_json,
       revision = distribution_workspaces.revision + 1,
       updated_at = CURRENT_TIMESTAMP`
  ).bind(normalizedOwner, serialized).run();

  const row = await d1().prepare(
    "SELECT revision, updated_at FROM distribution_workspaces WHERE owner_email = ?"
  ).bind(normalizedOwner).first<Record<string, unknown>>();

  return {
    state: normalized,
    revision: Number(row?.revision ?? 1),
    updatedAt: row?.updated_at ? String(row.updated_at) : null,
  };
}

export async function deleteDistributionWorkspace(email: string) {
  await d1().prepare("DELETE FROM distribution_workspaces WHERE owner_email = ?").bind(owner(email)).run();
}
