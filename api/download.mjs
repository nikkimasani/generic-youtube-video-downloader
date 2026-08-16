import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const config = { maxDuration: 300 };

const binary = join(process.cwd(), "node_modules", "youtube-dl-exec", "bin", "yt-dlp");
const allowedKinds = new Set(["video", "audio"]);
const quality = new Set(["1080", "720", "480"]);

function run(binaryPath, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(binaryPath, args, { windowsHide: true });
    let error = "";
    child.stderr.on("data", (chunk) => { error += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(error || "yt-dlp could not download this link.")));
  });
}

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "POST required." });
  const { url, kind = "video", quality: selectedQuality = "1080" } = request.body || {};
  let parsed;
  try { parsed = new URL(url); } catch { return response.status(400).json({ error: "Enter a valid media URL." }); }
  if (!/^https?:$/.test(parsed.protocol) || !allowedKinds.has(kind)) return response.status(400).json({ error: "Unsupported request." });

  const height = quality.has(selectedQuality) ? selectedQuality : "1080";
  const directory = await mkdtemp(join(tmpdir(), "clipkit-"));
  const output = join(directory, "clipkit.%(ext)s");
  const format = kind === "audio"
    ? "bestaudio[ext=m4a]/bestaudio"
    : `best[ext=mp4][height<=${height}]/best[height<=${height}]`;
  try {
    await run(binary, [parsed.toString(), "--no-playlist", "--no-progress", "--restrict-filenames", "-f", format, "-o", output]);
    const [file] = (await readdir(directory)).filter((name) => name.startsWith("clipkit."));
    if (!file) throw new Error("No file was produced.");
    const extension = file.split(".").pop() || "bin";
    response.setHeader("Content-Type", extension === "mp4" ? "video/mp4" : extension === "m4a" ? "audio/mp4" : "application/octet-stream");
    response.setHeader("Content-Disposition", `attachment; filename="clipkit.${extension}"`);
    const stream = createReadStream(join(directory, file));
    stream.on("error", () => response.destroy());
    response.on("finish", () => rm(directory, { recursive: true, force: true }));
    return stream.pipe(response);
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    return response.status(422).json({ error: "Download failed. Confirm the link is publicly available and try again." });
  }
}
