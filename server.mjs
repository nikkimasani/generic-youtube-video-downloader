import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdir, readdir, stat } from "node:fs/promises";
import { existsSync, createReadStream } from "node:fs";
import { homedir } from "node:os";
import { join, normalize, resolve } from "node:path";

const port = Number(process.env.PORT || 3030);
const downloadsDir = resolve(process.env.DOWNLOADS_DIR || join(homedir(), "Downloads", "ClipKit"));
const jobs = new Map();

await mkdir(downloadsDir, { recursive: true });

function json(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function bodyOf(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 20_000) throw new Error("Request is too large.");
  }
  return JSON.parse(body || "{}");
}

function downloadArgs({ url, kind, quality }) {
  const shared = ["--no-playlist", "--newline", "--restrict-filenames", "-o", join(downloadsDir, "%(title).160B-%(id)s.%(ext)s")];
  if (kind === "audio") return ["-x", "--audio-format", "mp3", "--audio-quality", "0", ...shared, url];
  const maxHeight = { "1080": "1080", "720": "720", "480": "480" }[quality] || "1080";
  return ["-f", `bv*[height<=${maxHeight}]+ba/b[height<=${maxHeight}]/b`, "--merge-output-format", "mp4", ...shared, url];
}

function startJob(input) {
  const id = crypto.randomUUID();
  const job = { id, state: "running", progress: 0, message: "Starting yt-dlp…", files: [], error: null };
  jobs.set(id, job);
  const process = spawn("yt-dlp", downloadArgs(input), { windowsHide: true });
  const onOutput = (chunk) => {
    const line = chunk.toString();
    const progress = line.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
    if (progress) job.progress = Math.round(Number(progress[1]));
    const destination = line.match(/Destination:\s+(.+)/);
    if (destination) job.message = `Saving ${destination[1].trim()}`;
  };
  process.stdout.on("data", onOutput);
  process.stderr.on("data", onOutput);
  process.on("error", (error) => {
    job.state = "error";
    job.error = error.code === "ENOENT" ? "yt-dlp is not installed or is not on your PATH." : error.message;
  });
  process.on("close", async (code) => {
    if (job.state === "error") return;
    if (code !== 0) {
      job.state = "error";
      job.error = "The download did not finish. Check that the link is valid and yt-dlp is up to date.";
      return;
    }
    job.state = "complete";
    job.progress = 100;
    job.message = "Saved to your ClipKit downloads folder.";
    job.files = await recentFiles();
  });
  return job;
}

async function recentFiles() {
  const entries = await readdir(downloadsDir);
  const files = await Promise.all(entries.map(async (name) => ({ name, info: await stat(join(downloadsDir, name)) })));
  return files.filter(({ info }) => info.isFile()).sort((a, b) => b.info.mtimeMs - a.info.mtimeMs).slice(0, 8)
    .map(({ name, info }) => ({ name, size: info.size, updated: info.mtime.toISOString() }));
}

function safeDownloadPath(name) {
  const file = resolve(downloadsDir, normalize(name));
  return file.startsWith(`${downloadsDir}\\`) || file === downloadsDir ? file : null;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  try {
    if (request.method === "GET" && url.pathname === "/api/files") return json(response, 200, { files: await recentFiles() });
    if (request.method === "GET" && url.pathname.startsWith("/downloads/")) {
      const file = safeDownloadPath(decodeURIComponent(url.pathname.slice(11)));
      if (!file || !existsSync(file)) return json(response, 404, { error: "File not found." });
      response.writeHead(200, { "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename="${file.split(/[\\/]/).pop()}"` });
      return createReadStream(file).pipe(response);
    }
    if (request.method === "GET" && url.pathname.startsWith("/api/jobs/")) {
      const job = jobs.get(url.pathname.slice(10));
      return job ? json(response, 200, job) : json(response, 404, { error: "Job not found." });
    }
    if (request.method === "POST" && url.pathname === "/api/downloads") {
      const input = await bodyOf(request);
      let parsed;
      try { parsed = new URL(input.url); } catch { return json(response, 400, { error: "Enter a valid media URL." }); }
      if (!/^https?:$/.test(parsed.protocol)) return json(response, 400, { error: "Only HTTP(S) links are supported." });
      if (!["video", "audio"].includes(input.kind)) return json(response, 400, { error: "Choose video or audio." });
      const job = startJob({ url: parsed.toString(), kind: input.kind, quality: input.quality });
      return json(response, 202, job);
    }
    if (request.method === "GET" && url.pathname === "/") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return createReadStream(join(import.meta.dirname, "web", "index.html")).pipe(response);
    }
    return json(response, 404, { error: "Not found." });
  } catch (error) {
    return json(response, 500, { error: error instanceof Error ? error.message : "Unexpected error." });
  }
});

server.listen(port, () => console.log(`ClipKit is ready at http://localhost:${port}`));
