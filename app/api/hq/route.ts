import {
  addWork,
  appendAnyRow,
  createCustomSheet,
  deleteAnyRow,
  deleteControl,
  deleteWork,
  getBootstrap,
  isRegisteredCustomSheet,
  saveAnyRow,
  saveControl,
  saveWork,
} from "@/lib/hq-data";
import type { HqUser } from "@/lib/hq-types";

export const dynamic = "force-dynamic";

const maxBodySize = 64_000;

// Sheet names allowed for generic writes (whitelist for safety)
const ALLOWED_SHEETS = new Set([
  "HQ_TARGETS", "HQ_BUDGETS", "HQ_CUSTOMERS", "HQ_CUSTOMER_ISSUES",
  "HQ_CUSTOMER_FOLLOWUP", "HQ_REVIEWS",
  "HQ_PLANS", "HQ_PEOPLE", "HQ_KSI", "HQ_GARDENIA_PIPELINE",
  "HQ_GARDENIA_PRODUCT", "HQ_GARDENIA_TASKS", "HQ_IRONMARK_TASKS", "HQ_CHECKLIST_DEFS", "HQ_CHECKLIST_RUNS",
  "HQ_ALERTS", "HQ_NOTES", "HQ_PROPERTY",
  "HQ_FINANCE_REGISTER", "HQ_PERSONAL_REGISTER",
  "HQ_REQUESTS", "HQ_TRAINING", "HQ_SYSTEM_ACCESS", "HQ_PERIODS",
  "HQ_ACTIVITY", "HQ_REGISTRIES", "HQ_REFERENCE_LIBRARY", "HQ_FIREFLIES_LEGACY",
  "HQ_EDIBLE_WEEKLY", "HQ_EDIBLE_TARGETS", "HQ_EDIBLE_KSI_REVIEW",
  "HQ_FINANCE_ITEMS", "HQ_FINANCE_PAYMENTS",
  "HQ_NOTIFICATION_RULES", "HQ_READINESS", "HQ_SOURCE_MAP",
]);

function validateWriteRequest(request: Request, body: unknown) {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
    return "Requests must use application/json.";
  }
  if (JSON.stringify(body).length > maxBodySize) return "Request body is too large.";
  return null;
}

// A sheet is writable either because it's one of the built-in registers above,
// or because it was created at runtime via "+ New Register" and is recorded
// in the HQ_CUSTOM_SHEETS registry (see lib/hq-data.ts).
async function isAllowedSheet(name: unknown): Promise<boolean> {
  if (typeof name !== "string" || !name) return false;
  if (ALLOWED_SHEETS.has(name)) return true;
  return isRegisteredCustomSheet(name);
}

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Every method below requires a signed-in user. NextAuth's signIn callback only lets emails
// on the HQ_ACCESS list start a session, so having a session is itself the approval check.
async function signedInUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}
const unauthorized = () => Response.json({ error: "Please sign in." }, { status: 401 });

export async function GET() {
  try {
    const sessionUser = await signedInUser();
    if (!sessionUser) return unauthorized();
    // The session only carries what NextAuth's callbacks put on it (see
    // app/api/auth/[...nextauth]/route.ts) — `authorized` isn't one of those
    // fields, but reaching this point at all already implies it was true.
    const user: HqUser = {
      email: sessionUser.email ?? "",
      name: sessionUser.name ?? "",
      role: sessionUser.role ?? "",
      area: sessionUser.area ?? "",
      canSeeAll: Boolean(sessionUser.canSeeAll),
      authorized: true,
    };

    return Response.json(await getBootstrap(user));
  } catch (error) {
    console.error("Unable to read Ahmad HQ data", error);
    return Response.json({ error: "Unable to read the connected Google Sheet." }, { status: 502 });
  }
}


export async function POST(request: Request) {
  try {
    const sessionUser = await signedInUser();
    if (!sessionUser) return unauthorized();
    const item = await request.json();
    const validationError = validateWriteRequest(request, item);
    if (validationError) return Response.json({ error: validationError }, { status: 415 });

    // Create a brand-new register sheet at runtime — no code change needed.
    if (item.type === "createSheet") {
      if (!item.label || typeof item.label !== "string") {
        return Response.json({ error: "A name is required." }, { status: 400 });
      }
      if (!Array.isArray(item.columns) || item.columns.some((c: unknown) => typeof c !== "string")) {
        return Response.json({ error: "A list of column names is required." }, { status: 400 });
      }
      const result = await createCustomSheet(item.label, item.columns, sessionUser.email || "unknown");
      return Response.json(result, { status: result.ok ? 200 : 400 });
    }

    // Generic append to any allowed sheet
    if (item.type === "generic") {
      if (!(await isAllowedSheet(item.sheet))) {
        return Response.json({ error: "Unknown or disallowed sheet." }, { status: 400 });
      }
      if (!item.row || typeof item.row !== "object") {
        return Response.json({ error: "A row object is required." }, { status: 400 });
      }
      return Response.json(await appendAnyRow(item.sheet, item.row));
    }

    // Original work append
    if (!item["Project / Function"] || !item["Work Item / Next Action"]) {
      return Response.json({ error: "A function and next action are required." }, { status: 400 });
    }
    return Response.json(await addWork(item));
  } catch (error) {
    console.error("Unable to save Ahmad HQ row", error);
    return Response.json({ error: "Unable to save to the connected Google Sheet." }, { status: 502 });
  }
}

export async function PUT(request: Request) {
  try {
    if (!(await signedInUser())) return unauthorized();
    const update = await request.json();
    const validationError = validateWriteRequest(request, update);
    if (validationError) return Response.json({ error: validationError }, { status: 415 });

    // Generic update for any allowed sheet
    if (update.type === "generic") {
      if (!(await isAllowedSheet(update.sheet))) {
        return Response.json({ error: "Unknown or disallowed sheet." }, { status: 400 });
      }
      if (!update.id || !update.changes || typeof update.changes !== "object") {
        return Response.json({ error: "id and changes are required." }, { status: 400 });
      }
      return Response.json(await saveAnyRow(update.sheet, update.id, update.changes));
    }

    // Original work/control update
    if (!update.id || !update.type) {
      return Response.json({ error: "An item id and type are required." }, { status: 400 });
    }
    if (update.type !== "control" && update.type !== "work") {
      return Response.json({ error: "Unsupported update type." }, { status: 400 });
    }
    const result = update.type === "control" ? await saveControl(update) : await saveWork(update);
    return Response.json(result);
  } catch (error) {
    console.error("Unable to update Ahmad HQ row", error);
    return Response.json({ error: "Unable to update the connected Google Sheet." }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await signedInUser())) return unauthorized();
    const body = await request.json();
    const validationError = validateWriteRequest(request, body);
    if (validationError) return Response.json({ error: validationError }, { status: 415 });

    if (!body.id || typeof body.id !== "string") {
      return Response.json({ error: "An id is required." }, { status: 400 });
    }

    if (body.type === "generic") {
      if (!(await isAllowedSheet(body.sheet))) {
        return Response.json({ error: "Unknown or disallowed sheet." }, { status: 400 });
      }
      return Response.json(await deleteAnyRow(body.sheet, body.id));
    }

    if (body.type === "control") return Response.json(await deleteControl(body.id));
    if (body.type === "work") return Response.json(await deleteWork(body.id));

    return Response.json({ error: "Unsupported delete type." }, { status: 400 });
  } catch (error) {
    console.error("Unable to delete Ahmad HQ row", error);
    return Response.json({ error: "Unable to delete from the connected Google Sheet." }, { status: 502 });
  }
}
