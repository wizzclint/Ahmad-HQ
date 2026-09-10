import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { appendAnyRow, updateRowByColumn, recalcChecklistRun } from "@/lib/hq-data";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 403 });

        const { runId, itemId, status, note, evidence, area } = await request.json();
        if (!runId || !itemId) return Response.json({ error: "Missing runId or itemId" }, { status: 400 });

        const sourceId = `${runId}|${itemId}`;
        const userEmail = session.user.email || "";

        const notePayload = {
            status: status || "",
            note: note || "",
            evidence: evidence || "",
            updated: new Date().toISOString(),
            user: userEmail,
        };

        // Try updating first (match on Source ID which is column index 3 - D)
        const updateRes = await updateRowByColumn(
            "HQ_NOTES",
            1,
            "Z",
            3, // 'Source ID' is the 4th column in HQ_NOTES usually, index 3
            sourceId,
            {
                Timestamp: new Date().toISOString(),
                Note: JSON.stringify(notePayload),
                Author: userEmail,
            }
        );

        if (!updateRes.ok || updateRes.error) {
            // Row not found, append a new one
            await appendAnyRow("HQ_NOTES", {
                Timestamp: new Date().toISOString(),
                "Business / Area": area || "",
                "Source Type": "Checklist Item",
                "Source ID": sourceId,
                Note: JSON.stringify(notePayload),
                Author: userEmail,
            });
        }

        // Trigger recalcs
        await recalcChecklistRun(runId);

        return Response.json({ ok: true });
    } catch (error) {
        console.error("Error saving checklist item:", error);
        return Response.json({ error: "Failed to save checklist item" }, { status: 500 });
    }
}
