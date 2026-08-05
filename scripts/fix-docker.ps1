<#
  Membereskan Docker Desktop yang gagal start di Windows.

  MASALAHNYA
  Docker Desktop membuat beberapa AF_UNIX socket di bawah %LOCALAPPDATA%. Kalau
  prosesnya berhenti tidak wajar — di-taskkill, komputer mati tanpa keluar dari
  aplikasi, atau backend-nya sendiri crash — berkas socket itu tertinggal sebagai
  reparse point yatim.

  Berkas yatim itu tidak bisa dibuka MAUPUN dihapus, termasuk oleh Docker sendiri.
  Saat start berikutnya Docker mencoba bind, menemukan berkasnya sudah ada,
  mencoba `remove`, gagal, lalu menutup diri dengan dialog:

      starting services: initializing Inference manager: ...
      remove .../dockerInference: The file cannot be accessed by the system.

  Gejala yang menyesatkan: pipe \\.\pipe\docker* tetap ada karena itu proxy sisi
  Windows, jadi `docker ps` MENGGANTUNG alih-alih memberi error yang jelas.

  Menghapus berkasnya satu per satu tidak bisa. Yang bisa adalah memindahkan
  direktori induknya — rename tidak perlu membuka isinya.

  CATATAN
  Mematikan "Docker AI" di Settings TIDAK mencegah ini; socket dockerInference
  tetap dibuat. Satu-satunya pencegahan adalah keluar dari Docker Desktop secara
  wajar (Quit dari tray) sebelum mematikan komputer.

  PEMAKAIAN
      powershell -ExecutionPolicy Bypass -File scripts\fix-docker.ps1
#>

$ErrorActionPreference = 'SilentlyContinue'

$dirs = @(
  "$env:LOCALAPPDATA\Docker\run",
  "$env:LOCALAPPDATA\docker-secrets-engine"
)

Write-Host "1. Menutup sisa proses Docker..."
Get-Process -Name 'Docker Desktop', 'com.docker.backend' | Stop-Process -Force
Start-Sleep -Seconds 5
wsl.exe --terminate docker-desktop | Out-Null

Write-Host "2. Menyingkirkan socket yatim..."
$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
foreach ($d in $dirs) {
  if (-not (Test-Path $d)) { continue }
  $orphan = Get-ChildItem $d -File -Force |
    Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }
  if (-not $orphan) {
    Write-Host "   $(Split-Path $d -Leaf): bersih"
    continue
  }
  $leaf = Split-Path $d -Leaf
  Rename-Item -Path $d -NewName "$leaf.stale-$ts" -Force
  New-Item -ItemType Directory -Path $d | Out-Null
  Write-Host "   $leaf : $($orphan.Count) socket disingkirkan ke $leaf.stale-$ts"
}

Write-Host "3. Menjalankan Docker Desktop..."
Start-Process "$env:LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe"

Write-Host "4. Menunggu daemon (biasanya 30-90 detik)..."
$docker = "$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin\docker.exe"
$siap = $false
foreach ($i in 1..40) {
  Start-Sleep -Seconds 8
  & $docker version --format '{{.Server.Version}}' 2>&1 | Out-Null
  if ($LASTEXITCODE -eq 0) { $siap = $true; break }
}

if (-not $siap) {
  Write-Host ""
  Write-Host "Daemon belum menjawab setelah ~5 menit." -ForegroundColor Yellow
  Write-Host "Lihat jendela Docker Desktop — kemungkinan ada dialog error lain."
  Write-Host "Log: $env:LOCALAPPDATA\Docker\log\host\com.docker.backend.exe.log"
  exit 1
}

Write-Host ""
Write-Host "Docker siap." -ForegroundColor Green
& $docker start agrous-db | Out-Null
Start-Sleep -Seconds 10
& $docker ps --format '{{.Names}}  {{.Status}}'
