import { createServer } from "node:http";
import { handle } from "../functions/handler.mjs";
import { createFakeSupabase } from "./fake-supabase.mjs";

const port = Number(process.argv[2] || 8000);
const supabase = createFakeSupabase();

const server = createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  const request = new Request(url, {
    method: req.method,
    headers: Object.entries(req.headers).filter(([, v]) => v !== undefined).map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : v]),
    body: body.length ? body : undefined,
  });
  try {
    const response = await handle({ request, supabase });
    const payload = Buffer.from(await response.arrayBuffer());
    res.writeHead(response.status, { "content-type": response.headers.get("content-type") || "application/json", "cache-control": "no-store" });
    res.end(payload);
  } catch (error) {
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "dev_server_error", detail: String(error && error.message) }));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[dev] function harness on http://127.0.0.1:${port}/functions/v1/app`);
});
