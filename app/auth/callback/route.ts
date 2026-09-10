import { getOAuthClient, saveTokens } from "@/lib/hq-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
        return Response.json({ error: "Missing OAuth code." }, { status: 400 });
    }

    try {
        const client = getOAuthClient();
        const { tokens } = await client.getToken(code);
        await saveTokens(tokens);
        // Redirect back to the main app with a connected flag
        return Response.redirect(new URL("/", request.url));
    } catch (error) {
        console.error("OAuth callback failed", error);
        return Response.json(
            { error: "OAuth token exchange failed." },
            { status: 500 },
        );
    }
}
