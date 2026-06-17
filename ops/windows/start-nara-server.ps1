param(
  [ValidateSet("services", "foreground", "pm2")]
  [string]$Mode = "services",

  [switch]$SkipInfra,
  [switch]$SkipMigrate,
  [switch]$SkipBuild,
  [switch]$SkipOpenClaw,
  [switch]$Skip9Router,
  [switch]$AdminDev,
  [int]$AdminPort = 5173
)

$ErrorActionPreference = "Stop"

function Require-RepoRoot {
  if (!(Test-Path -LiteralPath "package.json") -or !(Test-Path -LiteralPath "apps\backend\package.json")) {
    throw "Run this script from the Nara repository root."
  }
}

function Invoke-Step {
  param(
    [string]$Name,
    [scriptblock]$Action
  )

  Write-Host ""
  Write-Host "==> $Name" -ForegroundColor Cyan
  & $Action
}

function Get-Pm2Command {
  $pm2 = Get-Command "pm2.cmd" -ErrorAction SilentlyContinue
  if ($null -eq $pm2) {
    $pm2 = Get-Command "pm2" -ErrorAction SilentlyContinue
  }
  if ($null -eq $pm2) {
    throw "PM2 is not installed or not on PATH. Install with: npm install -g pm2"
  }
  return $pm2
}

function Start-Pm2Command {
  param(
    [string]$Name
  )

  pm2 delete $Name 2>$null | Out-Null

  pm2 start ".\ops\windows\pm2-ecosystem.config.cjs" --only $Name | Out-Host
}

Require-RepoRoot

if (!(Test-Path -LiteralPath ".env")) {
  throw ".env not found. Copy .env.example to .env and fill local secrets first."
}

Invoke-Step "Checking server prerequisites" {
  powershell -ExecutionPolicy Bypass -File ".\ops\windows\check-server-prereqs.ps1"
}

if (!$SkipInfra) {
  Invoke-Step "Starting PostgreSQL and Redis containers" {
    npm run infra:up
  }
}

if (!$SkipMigrate) {
  Invoke-Step "Applying database migrations" {
    npm run db:migrate
  }
}

if (!$SkipBuild) {
  Invoke-Step "Building backend, admin, and desktop packages" {
    npm run build
  }
}

if ($AdminDev) {
  Invoke-Step "Starting local admin dashboard in a hidden window" {
    Start-Process -FilePath "npm.cmd" `
      -ArgumentList @("--workspace", "@nara/web-admin", "run", "dev", "--", "--host", "127.0.0.1", "--port", "$AdminPort") `
      -WindowStyle Hidden `
      -PassThru | Select-Object Id,ProcessName
  }
}

if ($Mode -eq "pm2") {
  Invoke-Step "Checking PM2" {
    Get-Pm2Command | Select-Object Source
  }

  Invoke-Step "Starting backend with PM2" {
    Start-Pm2Command -Name "nara-backend"
  }

  if (!$SkipOpenClaw) {
    Invoke-Step "Starting OpenClaw gateway with PM2" {
      Start-Pm2Command -Name "openclaw-gateway"
    }

    Invoke-Step "Starting OpenClaw dashboard with PM2" {
      Start-Pm2Command -Name "openclaw-dashboard"
    }
  }

  if (!$Skip9Router) {
    Invoke-Step "Starting 9router with PM2" {
      Start-Pm2Command -Name "9router"
    }
  }

  Invoke-Step "Saving PM2 process list" {
    pm2 save
  }

  Invoke-Step "Checking Nara health" {
    powershell -ExecutionPolicy Bypass -File ".\ops\windows\check-nara-health.ps1"
  }
  exit 0
}

if ($Mode -eq "services") {
  Invoke-Step "Starting Nara services" {
    $args = @()
    if ($SkipOpenClaw) {
      $args += "-SkipOpenClaw"
    }
    if ($Skip9Router) {
      $args += "-Skip9Router"
    }

    powershell -ExecutionPolicy Bypass -File ".\ops\windows\start-nara-services.ps1" @args
  }

  # Give services a short window to spin up before running the full health check.
  Write-Host "Waiting briefly for services to become ready..." -ForegroundColor Cyan
  $maxWait = 30
  $interval = 1
  $deadline = (Get-Date).AddSeconds($maxWait)
  while ((Get-Date) -lt $deadline) {
    $ocOk = $false
    $backendOk = $false
    try {
      $res = Invoke-WebRequest -Uri "http://127.0.0.1:18789/overview" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
      $ocOk = $res.StatusCode -eq 200
    } catch { $ocOk = $false }

    try {
      $res2 = Invoke-WebRequest -Uri "http://127.0.0.1:4000/api/readiness" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
      $backendOk = $res2.StatusCode -eq 200
    } catch { $backendOk = $false }

    if ($ocOk -and $backendOk) { break }
    Start-Sleep -Seconds $interval
  }

  Invoke-Step "Checking Nara health" {
    powershell -ExecutionPolicy Bypass -File ".\ops\windows\check-nara-health.ps1"
  }
  exit 0
}

Write-Host ""
Write-Host "Starting backend in foreground. Keep this PowerShell window open." -ForegroundColor Green
npm --workspace @nara/backend run start
