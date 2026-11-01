// Test-only TLS-terminating reverse proxy for the e2e harness.
//
// Why: the app's production CSP contains `upgrade-insecure-requests` (helmet default).
// WebKit applies it to http://localhost, so subresource and form requests are rewritten to
// https:// and fail. Chromium and Firefox exempt localhost. This proxy lets every browser
// reach the unmodified app over HTTPS with a throwaway self-signed certificate.
// It never alters app responses (headers and bodies pass through unchanged).
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { tmpdir } from "node:os";
import path from "node:path";

const listenPort = Number(process.env.E2E_TLS_PORT ?? 3443);
const targetPort = Number(process.env.PORT ?? 3000);

const dir = mkdtempSync(path.join(tmpdir(), "e2e-tls-"));
const keyFile = path.join(dir, "key.pem");
const certFile = path.join(dir, "cert.pem");
execFileSync(
  "openssl",
  ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-subj", "/CN=localhost",
   "-addext", "subjectAltName=DNS:localhost,IP:127.0.0.1", "-keyout", keyFile, "-out", certFile],
  { stdio: "ignore" },
);

const server = https.createServer(
  { key: readFileSync(keyFile), cert: readFileSync(certFile) },
  (req, res) => {
    const upstream = http.request(
      { host: "127.0.0.1", port: targetPort, method: req.method, path: req.url, headers: req.headers },
      (up) => {
        res.writeHead(up.statusCode ?? 502, up.headers);
        up.pipe(res);
      },
    );
    upstream.on("error", () => {
      res.writeHead(502).end();
    });
    req.pipe(upstream);
  },
);
server.listen(listenPort, () => console.log(`e2e TLS proxy on ${listenPort} -> ${targetPort}`));
