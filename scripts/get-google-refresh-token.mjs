#!/usr/bin/env node
/**
 * One-time helper to obtain a Google OAuth refresh token for the Red
 * Chairs Barber Google Calendar integration.
 *
 * Usage:
 *   node --env-file=.env scripts/get-google-refresh-token.mjs
 *
 * Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the environment.
 * Optionally set GOOGLE_OAUTH_REDIRECT_URI if it differs from the default
 * below — it MUST exactly match one of the "Authorized redirect URIs"
 * already configured on your OAuth Client in Google Cloud Console.
 */
import http from "node:http";
import { URL } from "node:url";
import { google } from "googleapis";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_OAUTH_REDIRECT_URI ?? "http://localhost:3000/oauth2callback";
const CALENDAR_ACCOUNT_HINT = "redchairsb@gmail.com";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "Faltan GOOGLE_CLIENT_ID y/o GOOGLE_CLIENT_SECRET en el entorno.\n" +
      "Ejecuta este script así: node --env-file=.env scripts/get-google-refresh-token.mjs"
  );
  process.exit(1);
}

const redirectUrl = new URL(REDIRECT_URI);
const port = Number(redirectUrl.port || 3000);

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent", // forces Google to (re)issue a refresh_token every run
  scope: ["https://www.googleapis.com/auth/calendar"],
  login_hint: CALENDAR_ACCOUNT_HINT,
});

console.log("\n=== Red Chairs Barber — Generador de GOOGLE_REFRESH_TOKEN ===\n");
console.log(`Redirect URI usado: ${REDIRECT_URI}`);
console.log("↳ Debe existir EXACTAMENTE igual en tu OAuth Client (Authorized redirect URIs).\n");
console.log("1. Abre esta URL en tu navegador:\n");
console.log(authUrl);
console.log(`\n2. Inicia sesión con la cuenta del calendario (${CALENDAR_ACCOUNT_HINT}) y acepta los permisos.`);
console.log("3. Este script capturará el código automáticamente. Esperando...\n");

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    if (url.pathname !== redirectUrl.pathname) {
      res.writeHead(404).end();
      return;
    }

    const error = url.searchParams.get("error");
    if (error) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<h1>Autorización cancelada</h1><p>${error}</p><p>Puedes cerrar esta pestaña.</p>`);
      console.error(`\nGoogle devolvió un error: ${error}`);
      server.close(() => process.exit(1));
      return;
    }

    const code = url.searchParams.get("code");
    if (!code) {
      res.writeHead(400).end("Falta el parámetro 'code'.");
      return;
    }

    const { tokens } = await oauth2Client.getToken(code);

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      "<h1>Listo</h1><p>Ya puedes cerrar esta pestaña y volver a la terminal.</p>"
    );

    if (!tokens.refresh_token) {
      console.error(
        "\nGoogle no devolvió un refresh_token.\n" +
          "Esto suele pasar si esta app ya tenía acceso concedido previamente.\n" +
          "Revócalo en https://myaccount.google.com/permissions (busca tu OAuth Client) " +
          "y vuelve a ejecutar este script.\n"
      );
      server.close(() => process.exit(1));
      return;
    }

    console.log("\n✅ GOOGLE_REFRESH_TOKEN obtenido:\n");
    console.log(tokens.refresh_token);
    console.log("\nCópialo en tu .env local y en las variables de entorno de Vercel como GOOGLE_REFRESH_TOKEN.\n");
    server.close(() => process.exit(0));
  } catch (err) {
    console.error("\nError intercambiando el código por tokens:", err);
    res.writeHead(500).end("Error intercambiando el código por tokens. Revisa la terminal.");
    server.close(() => process.exit(1));
  }
});

server.listen(port, () => {
  console.log(`(Servidor local escuchando en el puerto ${port} para recibir el redirect de Google...)`);
});
