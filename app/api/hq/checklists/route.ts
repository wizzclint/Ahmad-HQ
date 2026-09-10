import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { readSheet } from "@/lib/hq-data";

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const runId = url.searchParams.get("runId");
        if (!runId) return Response.json({ error: "Missing runId" }, { status: 400 });

        const session = await getServerSession(authOptions);
        if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 403 });

        const s = (name: string) => readSheet(name, 1, "Z").catch(() => []);
        const [runs, items, notes] = await Promise.all([
            s("HQ_CHECKLIST_RUNS"),
            s("HQ_CHECKLIST_ITEMS"),
            s("HQ_NOTES"),
        ]);

        const run = runs.find(r => r["Run ID"] === runId);
        if (!run) return Response.json({ error: "Run not found" }, { status: 404 });

        const relevantItems = items
            .filter(i => i["Checklist ID"] === run["Checklist ID"])
            .sort((a, b) => Number(a.Sort || 0) - Number(b.Sort || 0));

        const stateMap: Record<string, any> = {};
        const relevantNotes = notes.filter(
            n => n["Source Type"] === "Checklist Item" && String(n["Source ID"] || "").startsWith(`${runId}|`)
        );

        relevantNotes.forEach(n => {
            const parts = String(n["Source ID"]).split("|");
            const itemId = parts[1];
            if (itemId) {
                try {
                    stateMap[itemId] = JSON.parse(n.Note);
                } catch (e) { }
            }
        });

        const parsedItems = relevantItems.map(item => ({
            ...item,
            state: stateMap[item["Item ID"]] || { status: "", note: "", evidence: "" },
        }));

        return Response.json({ run, items: parsedItems });
    } catch (error) {
        console.error("Error reading checklist run:", error);
        return Response.json({ error: "Failed to read checklist" }, { status: 500 });
    }
}
