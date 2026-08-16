import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const host = "127.0.0.1";
const port = Number(process.env.CLIPKIT_PORT || 3030);
const downloadsDir = resolve(process.env.CLIPKIT_DOWNLOADS_DIR || join(homedir(), "Downloads", "ClipKit"));
const allowedOrigins = new Set(["https://clipkit-nine.vercel.app", "http://localhost:3030"]);
const jobs = new Map();

await mkdir(downloadsDir, { recursive: true });

function cors(request, response) {
  const origin = request.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    response.setHeader("Access-Control-Allow-Private-Network", "true");
  }
  return !origin || allowedOrigins.has(origin);
}

function json(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 20_000) throw new Error("Request is too large.");
  }
  return JSON.parse(body || "{}");
}

function argumentsFor({ url, kind, quality, browser }) {
  const shared = ["--no-playlist", "--newline", "--restrict-filenames", "--cookies-from-browser", browser, "-o", join(downloadsDir, "%(title).160B-%(id)s.%(ext)s")];
  if (kind === "audio") return ["-x", "--audio-format", "mp3", "--audio-quality", "0", ...shared, url];
  const height = new Set(["1080", "720", "480"]).has(quality) ? quality : "1080";
  return ["-f", `bv*[height<=${height}]+ba/b[height<=${height}]/b`, "--merge-output-format", "mp4", ...shared, url];
}

function createJob(input) {
  const id = crypto.randomUUID();
  const job = { id, state: "running", progress: 0, message: "Starting local yt-dlp…", error: null };
  jobs.set(id, job);
  const process = spawn("yt-dlp", argumentsFor(input), { windowsHide: true });
  const onData = (chunk) => {
    const text = chunk.toString();
    const match = text.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
    if (match) job.progress = Math.round(Number(match[1]));
    const destination = text.match(/Destination:\s+(.+)/);
    if (destination) job.message = `Saving ${destination[1].trim()}`;
  };
  process.stdout.on("data", onData);
  process.stderr.on("data", onData);
  process.on("error", (error) => {
    job.state = "error";
    job.error = error.code === "ENOENT" ? "yt-dlp is not installed or is not on your PATH." : error.message;
  });
  process.on("close", (code) => {
    if (job.state === "error") return;
    if (code !== 0) {
      job.state = "error";
      job.error = "yt-dlp could not finish this download. Update yt-dlp, then try again.";
      return;
    }
    job.state = "complete";
    job.progress = 100;
    job.message = `Saved locally in ${downloadsDir}.`;
  });
  return job;
}

createServer(async (request, response) => {
  if (!cors(request, response)) return json(response, 403, { error: "This local service only accepts ClipKit." });
  if (request.method === "OPTIONS") return response.writeHead(204).end();
  const url = new URL(request.url, `http://${host}:${port}`);
  try {
    if (request.method === "GET" && url.pathname === "/health") return json(response, 200, { ready: true });
    if (request.method === "GET" && url.pathname.startsWith("/api/jobs/")) {
      const job = jobs.get(url.pathname.slice(10));
      return job ? json(response, 200, job) : json(response, 404, { error: "Job not found." });
    }
    if (request.method === "POST" && url.pathname === "/api/downloads") {
      const input = await readBody(request);
      let parsed;
      try { parsed = new URL(input.url); } catch { return json(response, 400, { error: "Enter a valid media URL." }); }
      if (!/^https?:$/.test(parsed.protocol) || !["video", "audio"].includes(input.kind) || !["chrome", "edge", "firefox"].includes(input.browser)) {
        return json(response, 400, { error: "Unsupported download settings." });
      }
      return json(response, 202, createJob({ ...input, url: parsed.toString() }));
    }
    return json(response, 404, { error: "Not found." });
  } catch (error) {
    return json(response, 500, { error: error instanceof Error ? error.message : "Unexpected error." });
  }
}).listen(port, host, () => console.log(`ClipKit companion ready at http://${host}:${port}`));
