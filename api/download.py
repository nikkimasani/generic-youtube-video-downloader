import json
import os
import shutil
import tempfile
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse

import yt_dlp


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            size = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(size).decode("utf-8"))
            media_url = payload.get("url", "")
            kind = payload.get("kind", "video")
            selected_quality = payload.get("quality", "1080")
            parsed = urlparse(media_url)
            if parsed.scheme not in {"http", "https"} or not parsed.netloc or kind not in {"video", "audio"}:
                return self.respond_json(400, {"error": "Enter a valid media URL and format."})

            height = selected_quality if selected_quality in {"1080", "720", "480"} else "1080"
            directory = tempfile.mkdtemp(prefix="clipkit-")
            try:
                options = {
                    "outtmpl": os.path.join(directory, "clipkit.%(ext)s"),
                    "noplaylist": True,
                    "quiet": True,
                    "no_warnings": True,
                    "restrictfilenames": True,
                    "format": "bestaudio[ext=m4a]/bestaudio" if kind == "audio" else f"best[ext=mp4][height<={height}]/best[height<={height}]",
                }
                with yt_dlp.YoutubeDL(options) as downloader:
                    downloader.download([media_url])
                files = [name for name in os.listdir(directory) if name.startswith("clipkit.")]
                if not files:
                    raise RuntimeError("No file was produced.")
                filename = files[0]
                path = os.path.join(directory, filename)
                content_type = "video/mp4" if filename.endswith(".mp4") else "audio/mp4" if filename.endswith(".m4a") else "application/octet-stream"
                self.send_response(200)
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
                self.send_header("Content-Length", str(os.path.getsize(path)))
                self.end_headers()
                with open(path, "rb") as file:
                    shutil.copyfileobj(file, self.wfile)
            finally:
                shutil.rmtree(directory, ignore_errors=True)
        except Exception as error:
            print(f"[clipkit:download-failed] {type(error).__name__}: {str(error)[:2000]}")
            self.respond_json(422, {"error": "Download failed. Confirm the link is publicly available and try again."})

    def respond_json(self, status, body):
        encoded = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)
