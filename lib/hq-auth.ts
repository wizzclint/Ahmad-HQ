import { promises as fs } from "fs";
import path from "path";
import { google } from "googleapis";

const TOKENS_PATH = path.join(process.cwd(), "tokens.json");

export interface OAuthTokens {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
}

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

export function getAuthUrl(): string {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  });
}

export async function saveTokens(tokens: OAuthTokens): Promise<void> {
  cachedClient = null; // new credentials (e.g. a fresh sign-in) must not be shadowed by the old cached client
  try {
    await fs.writeFile(TOKENS_PATH, JSON.stringify(tokens, null, 2), "utf-8");
  } catch {
    // Vercel serverless functions have a read-only filesystem.
    // It's safe to ignore this because we rely on GOOGLE_REFRESH_TOKEN in production.
    console.warn("Could not save tokens to filesystem (likely serverless environment).");
  }
}

export async function loadTokens(): Promise<OAuthTokens | null> {
  // If we have an environment variable for the refresh token (Vercel production), prioritize it.
  // We only pull the refresh token, and the library will fetch a fresh access_token automatically.
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    return {
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      access_token: null,
      expiry_date: null,
    };
  }

  try {
    const raw = await fs.readFile(TOKENS_PATH, "utf-8");
    return JSON.parse(raw) as OAuthTokens;
  } catch {
    return null;
  }
}

// Reuse one authorised client until its access token is about to expire. With the refresh
// token coming from an env var (Vercel), there is no stored access token, so without this
// every single Sheets call would first make its own token-refresh round trip.
let cachedClient: { client: ReturnType<typeof getOAuthClient>; expiry: number } | null = null;
let clientInFlight: Promise<ReturnType<typeof getOAuthClient>> | null = null;

async function buildClient() {
  const client = getOAuthClient();
  const tokens = await loadTokens();
  if (!tokens?.refresh_token) {
    throw new Error("No OAuth tokens found. Visit /auth/login to authorise.");
  }
  client.setCredentials(tokens);

  // If the access token is missing or about to expire in under 60 seconds, refresh it.
  let expiry = tokens.expiry_date ?? 0;
  if (!tokens.access_token || expiry - Date.now() < 60_000) {
    const { credentials } = await client.refreshAccessToken();
    await saveTokens({ ...tokens, ...credentials }); // also clears cachedClient; it is set again just below
    client.setCredentials(credentials);
    expiry = credentials.expiry_date ?? 0;
  }

  cachedClient = { client, expiry };
  return client;
}

export function getValidClient() {
  if (cachedClient && cachedClient.expiry - Date.now() > 60_000) return Promise.resolve(cachedClient.client);
  // Concurrent callers share one refresh instead of each starting their own.
  clientInFlight ??= buildClient().finally(() => { clientInFlight = null; });
  return clientInFlight;
}
