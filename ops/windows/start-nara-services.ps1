param(
  [switch]$SkipBackend,
  [switch]$SkipOpenClaw,
  [switch]$Skip9Router
)

$ErrorActionPreference = "Stop"

if (!(Test-Path -LiteralPath "package.json") -or !(Test-Path -LiteralPath "apps\backend\package.json")) {
  throw "Run this script from the Nara repository root."
}

if (!(Test-Path -LiteralPath ".env")) {
  throw ".env not found. Copy .env.example to .env and fill local secrets first."
}

$logDir = ".tmp\service-logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Stop-ExistingCommandLine {
  param([string]$Pattern)

  Get-CimInstance Win32_Process |
    Where-Object { $_.CommandLine -like $Pattern } |
    ForEach-Object {
      try {
        Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop
      } catch {
        Write-Host "Could not stop process $($_.ProcessId): $($_.Exception.Message)" -ForegroundColor Yellow
      }
    }
}

function Resolve-Executable {
  param([string]$Command)

  $resolved = Get-Command $Command -ErrorAction SilentlyContinue
  if ($null -eq $resolved) {
    throw "$Command is not installed or not on PATH."
  }

  return $resolved.Source
}

function Start-NaraProcess {
  param(
    [string]$Name,
    [string]$FilePath,
    [string[]]$ArgumentList,
    [string]$MatchPattern
  )

  Stop-ExistingCommandLine -Pattern $MatchPattern
  $resolvedFilePath = Resolve-Executable -Command $FilePath

  $stdout = Join-Path $logDir "$Name.out.log"
  $stderr = Join-Path $logDir "$Name.err.log"

  $process = Start-Process `
    -FilePath $resolvedFilePath `
    -ArgumentList $ArgumentList `
    -WorkingDirectory (Get-Location).Path `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdout `
    -RedirectStandardError $stderr `
    -PassThru

  [pscustomobject]@{
    name = $Name
    pid = $process.Id
    stdout = $stdout
    stderr = $stderr
  }
}

$started = @()

if (!$SkipBackend) {
  $started += Start-NaraProcess `
    -Name "nara-backend" `
    -FilePath "node" `
    -ArgumentList @("--env-file-if-exists=.env", "apps/backend/dist/index.js") `
    -MatchPattern "*apps/backend/dist/index.js*"
}

if (!$SkipOpenClaw) {
  $started += Start-NaraProcess `
    -Name "openclaw-gateway" `
    -FilePath "openclaw" `
    -ArgumentList @("gateway", "run") `
    -MatchPattern "*openclaw*gateway*run*"

  $started += Start-NaraProcess `
    -Name "openclaw-dashboard" `
    -FilePath "openclaw" `
    -ArgumentList @("dashboard", "--no-open") `
    -MatchPattern "*openclaw*dashboard*--no-open*"
}

if (!$Skip9Router) {
  $started += Start-NaraProcess `
    -Name "9router" `
    -FilePath "9router" `
    -ArgumentList @() `
    -MatchPattern "*9router*"
}

Write-Host "Started Nara services:" -ForegroundColor Green
$started | Format-Table -AutoSize

Write-Host ""
Write-Host "Logs are in $logDir" -ForegroundColor Cyan
Write-Host "Run: npm run health-check"
