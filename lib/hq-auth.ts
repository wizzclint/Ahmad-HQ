import { promises as fs } from "fs";
import path from "path";

const TOKENS_PATH = path.join(process.cwd(), "tokens.json");

export interface OAuthTokens {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
}

export function getOAuthClient() {
  const { google } = require("googleapis");
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
  try {
    await fs.writeFile(TOKENS_PATH, JSON.stringify(tokens, null, 2), "utf-8");
  } catch (error) {
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

export async function getValidClient() {
  const client = getOAuthClient();
  const tokens = await loadTokens();
  if (!tokens?.refresh_token) {
    throw new Error("No OAuth tokens found. Visit /auth/login to authorise.");
  }
  client.setCredentials(tokens);

  // If the access token is missing or about to expire in under 60 seconds, refresh it.
  const expiresIn = (tokens.expiry_date ?? 0) - Date.now();
  if (!tokens.access_token || expiresIn < 60_000) {
    const { credentials } = await client.refreshAccessToken();
    await saveTokens({ ...tokens, ...credentials });
    client.setCredentials(credentials);
  }

  return client;
}

export function hasOAuthConfig(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_SHEETS_ID,
  );
}
