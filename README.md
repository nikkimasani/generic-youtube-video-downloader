# ClipKit Local

ClipKit is a standalone web interface for `yt-dlp`. The Vercel page is the interface; the included local companion downloads on your own computer and uses your signed-in browser session without sending its cookies anywhere.

Only download material you own or are allowed to save. ClipKit does not bypass DRM or access controls.

## Start it

1. Install [Node.js 20+](https://nodejs.org/), [yt-dlp](https://github.com/yt-dlp/yt-dlp#installation), and FFmpeg.
2. Sign in to the video service in Chrome, Edge, or Firefox.
3. Run `npm run companion` from this repository and leave it running.
4. Open the deployed ClipKit page and select the browser in which you are signed in.

Downloads are saved to `~/Downloads/ClipKit` by default. Set `CLIPKIT_DOWNLOADS_DIR` before starting the companion to use another location.

## What it includes

- Video (MP4) and audio (MP3) downloads
- A quality selector for video
- A Vercel interface paired with a cookie-safe local companion

The legacy Bash TUI remains in `ytdlp.sh` for users who prefer it.

---

# Legacy Bash TUI

***Now includes video quality selection***

[Click here for the latest changes to ytdlp.sh](https://github.com/sl1pstream/generic-youtube-video-downloader/blob/main/Changelog.md)

A bash script TUI for Arch Linux (*possibly* Windows) that can download YouTube videos, or just audio from videos (with a few options to choose from)

*Note*: This script was made largely with the help of multiple coding AIs, specifically GPT-4, as well as the following coding extensions on VSCode: CodeBuddy, Codeium, Amazon Q. Please understand that while I can confirm that the script is not malicious, you bear the burden of risk by running anonymous scripts you find on the internet. I am only posting this as a proof-of-concept after spending months brainstorming features and troubleshooting.

The script will also auto-update yt-dlp for you before the media download begins. While this ensures you are always up to date with the latest yt-dlp and minimizes the chances of running into erros due to an outdated version, you can disable this by opening the script file and removing all of the -U flags from the download commands, if you feel the need.

### Why?
Because those "download YouTube videos" websites don't stay up forever (most have limited options anyway), are ad-filled, and all have different UIs that you have to adapt to just to forget them when they inevitably disappear and get replaced.

# Screenshots
<img width="800" height="352" alt="image" src="https://github.com/user-attachments/assets/9e53a276-a2bc-4677-b9a0-7dc58322f366" />

<img width="799" height="197" alt="image" src="https://github.com/user-attachments/assets/113e2f8b-9ff2-4b4d-a932-323907e00153" />
<img width="798" height="293" alt="image" src="https://github.com/user-attachments/assets/1c69a02d-8a14-4860-b1ac-4f478c9f6c83" />
<img width="799" height="472" alt="image" src="https://github.com/user-attachments/assets/76bb6e1c-4568-4c16-ba85-79279c4c8dc1" />
<img width="799" height="218" alt="image" src="https://github.com/user-attachments/assets/7a2e9458-511d-4952-ba56-f1945b00b187" />









# Requirements
### System Requirements:

- Linux system or equivalent (instructions for setting up WSL2 below, a virtual machine may also work)

### Required Software:

- `yt-dlp` - YouTube downloader tool

- `fzf` - Text-based user interface utility

- `kdialog` - KDE dialog utility

- `firefox` - Browser for cookie extraction (**Note that you must be signed into YouTube on Firefox**)

- `mktemp` and `mkfifo` - System utilities for temporary files and named pipes

# Usage

### For Linux Users

**If you already have this repo cloned, skip to step 3.** Run the following in terminal:
1. Clone this repo: `git clone https://github.com/sl1pstream/generic-youtube-video-downloader.git`
2. Set the directory: `cd generic-youtube-video-downloader`
3. (Optional) Update all files: `git pull --all`
4. Make the script executable: `chmod +x ytdlp.sh` (only required on first run)
5. Run: `./ytdlp.sh`

### For Windows Users (WSL Setup)

*Please note that this method is untested. As this is primarily meant to run in native Linux environments, I can only offer limited support for issues encountered with this method*

Since this is a bash script designed for Arch Linux, Windows users need to set up WSL2 with Arch:

1. **Enable WSL2**: Open PowerShell as Administrator and run:
   ```powershell
   wsl --install
   ```
2. **Install Arch Linux**: Download and install Arch Linux WSL from the Microsoft Store or use:
   ```powershell
   wsl --install -d ArchLinux
   ```
3. **Restart your computer** when prompted
4. **Set up Arch Linux**: After restart, create a username and password when prompted
5. **Install prerequisites** in Arch Linux terminal:
   ```bash
   sudo pacman -Syu
   sudo pacman -S yt-dlp fzf kdialog firefox git
   ```
(You can skip installing Firefox if you remove all the `---cookies-from-browser firefox` flags in the script. _Downside: if you get rate limited or flagged for potential bot behavior, you will have to add them back, install Firefox in WSL, and sign into YouTube with it._)
   
5. **Continue with the Linux instructions above**

### Other Linux Distros
Install `boxbuddy` and set up an Arch Linux environment, and install the prerequisites (see "Required Software" above).

### About Selecting Video Quality
- **Single Video, Clip:** Some videos have less qualities available to download vs stream. HD options will still be available
- **Playlist, Channel, Custom:**
  - For any maximum quality, if a video is not available in that quality, the video with the next lowest quality will be chosen
  - If the quality selected is lower than the minimum quality available for a video, the lowest quality will be downloaded

---
The script itself is fairly intuitive to use, and most options throughout the script have basic descriptions that tells users what each one does. If you are knowledgeable in coding (specifically bash), you are free to read through the code to see how each part works.

**Please direct all yt-dlp related issues to the [yt-dlp repo](https://github.com/yt-dlp/yt-dlp). I am not responsible for issues with the tool itself, nor am I a very experienced coder/dev. I make scripts every now and then at best**
