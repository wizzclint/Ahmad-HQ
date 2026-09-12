import {
  addWork,
  appendAnyRow,
  getBootstrap,
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
  "HQ_CUSTOMER_FOLLOWUP", "HQ_REVIEWS", "HQ_DECISIONS", "HQ_EXCEPTIONS",
  "HQ_PLANS", "HQ_PEOPLE", "HQ_KSI", "HQ_GARDENIA_PIPELINE",
  "HQ_GARDENIA_PRODUCT", "HQ_CHECKLIST_DEFS", "HQ_CHECKLIST_RUNS",
  "HQ_LEGACY_CLOSEOUT", "HQ_ALERTS", "HQ_NOTES", "HQ_PROPERTY",
  "HQ_FINANCE_REGISTER", "HQ_PODCAST", "HQ_PERSONAL_REGISTER",
  "HQ_REQUESTS", "HQ_TRAINING", "HQ_SYSTEM_ACCESS", "HQ_PERIODS",
  "HQ_ACTIVITY", "HQ_REGISTRIES", "HQ_REFERENCE_LIBRARY", "HQ_TECH_BACKLOG",
  "HQ_NOTIFICATION_RULES", "HQ_READINESS", "HQ_SOURCE_MAP",
]);

function validateWriteRequest(request: Request, body: unknown) {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
    return "Requests must use application/json.";
  }
  if (JSON.stringify(body).length > maxBodySize) return "Request body is too large.";
  return null;
}

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user;
    // The session only carries what NextAuth's callbacks put on it (see
    // app/api/auth/[...nextauth]/route.ts) — `authorized` isn't one of those
    // fields, but reaching this point at all already implies it was true.
    const user: HqUser | null = sessionUser
      ? {
          email: sessionUser.email ?? "",
          name: sessionUser.name ?? "",
          role: sessionUser.role ?? "",
          area: sessionUser.area ?? "",
          canSeeAll: Boolean(sessionUser.canSeeAll),
          authorized: true,
        }
      : null;

    return Response.json(await getBootstrap(user));
  } catch (error) {
    console.error("Unable to read Ahmad HQ data", error);
    return Response.json({ error: "Unable to read the connected Google Sheet." }, { status: 502 });
  }
}


export async function POST(request: Request) {
  try {
    const item = await request.json();
    const validationError = validateWriteRequest(request, item);
    if (validationError) return Response.json({ error: validationError }, { status: 415 });

    // Generic append to any allowed sheet
    if (item.type === "generic") {
      if (!item.sheet || !ALLOWED_SHEETS.has(item.sheet)) {
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
    const update = await request.json();
    const validationError = validateWriteRequest(request, update);
    if (validationError) return Response.json({ error: validationError }, { status: 415 });

    // Generic update for any allowed sheet
    if (update.type === "generic") {
      if (!update.sheet || !ALLOWED_SHEETS.has(update.sheet)) {
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
