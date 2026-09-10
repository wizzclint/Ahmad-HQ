import { getAuthUrl } from "@/lib/hq-auth";

export const dynamic = "force-dynamic";

export async function GET() {
    const url = getAuthUrl();
    return Response.redirect(url);
}
