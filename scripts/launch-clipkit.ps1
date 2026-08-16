$root = Split-Path -Parent $PSScriptRoot
$healthUrl = 'http://127.0.0.1:3030/health'

function Get-CompanionHealth {
  try { return Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2 } catch { return $null }
}

$health = Get-CompanionHealth
if (-not $health) {
  $node = Get-Command node -ErrorAction Stop
  $env:CLIPKIT_LAN = '1'
  Start-Process -FilePath $node.Source -ArgumentList 'companion\server.mjs' -WorkingDirectory $root -WindowStyle Hidden
  $deadline = (Get-Date).AddSeconds(15)
  do {
    Start-Sleep -Milliseconds 500
    $health = Get-CompanionHealth
  } while (-not $health -and (Get-Date) -lt $deadline)
}

if (-not $health) { throw 'ClipKit companion did not start. Confirm Node.js and yt-dlp are installed, then try again.' }
if (-not $health.lan) { throw 'ClipKit is already running in desktop-only mode. Close it, then run the launcher again.' }

$pairing = Invoke-RestMethod -Uri 'http://127.0.0.1:3030/api/pairing-link' -TimeoutSec 3
Set-Clipboard -Value $pairing.url
Start-Process 'https://clipkit-nine.vercel.app'
Write-Host 'ClipKit is ready. The private iPhone/iPad pairing link is copied to your clipboard.'
