import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { generateExpectedRuns } from "@/lib/hq-data";

export async function POST() {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user;

        if (!user || user.role === "Unauthorized") {
            return Response.json({ error: "Unauthorized access detected." }, { status: 403 });
        }

        const result = await generateExpectedRuns();
        return Response.json(result);
    } catch (error) {
        console.error("Failed to run maintenance:", error);
        return Response.json({ error: "Failed to generate checklist runs." }, { status: 500 });
    }
}
