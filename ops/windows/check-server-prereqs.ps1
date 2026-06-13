param(
  [switch]$Json
)

$ErrorActionPreference = "Stop"

function Test-Command {
  param([string]$Name)

  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if ($null -eq $cmd) {
    return [pscustomobject]@{
      name = $Name
      ok = $false
      detail = "not found"
    }
  }

  return [pscustomobject]@{
    name = $Name
    ok = $true
    detail = $cmd.Source
  }
}

function Test-AnyCommand {
  param(
    [string]$Name,
    [string[]]$Candidates
  )

  foreach ($candidate in $Candidates) {
    $cmd = Get-Command $candidate -ErrorAction SilentlyContinue
    if ($null -ne $cmd) {
      return [pscustomobject]@{
        name = $Name
        ok = $true
        detail = $cmd.Source
      }
    }
  }

  return [pscustomobject]@{
    name = $Name
    ok = $false
    detail = "not found"
  }
}

function Test-Http {
  param(
    [string]$Name,
    [string]$Url
  )

  try {
    $res = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
    return [pscustomobject]@{
      name = $Name
      ok = $true
      detail = "HTTP $($res.StatusCode)"
    }
  } catch {
    return [pscustomobject]@{
      name = $Name
      ok = $false
      detail = $_.Exception.Message
    }
  }
}

$checks = @()
$checks += Test-Command "node"
$checks += Test-Command "npm.cmd"
$checks += Test-Command "docker"
$checks += Test-Command "git"
$checks += Test-AnyCommand "openclaw" @("openclaw", "openclaw.cmd")
$checks += Test-Command "cloudflared"
$checks += Test-AnyCommand "pm2" @("pm2", "pm2.cmd")
$checks += Test-Http "backend health" "http://127.0.0.1:4000/health"
$checks += Test-Http "openclaw control" "http://127.0.0.1:18789/overview"

$dockerStatus = "not checked"
try {
  $dockerPs = docker ps --format "{{.Names}}" 2>$null
  $dockerStatus = if ($LASTEXITCODE -eq 0) { "docker reachable" } else { "docker not reachable" }
} catch {
  $dockerStatus = $_.Exception.Message
}

$summary = [pscustomobject]@{
  cwd = (Get-Location).Path
  docker = $dockerStatus
  checks = $checks
  nextSteps = @(
    "Install missing required tools: node, npm, docker, git.",
    "Install optional server tools as needed: openclaw, cloudflared, pm2.",
    "Run npm run infra:up, npm run db:migrate, npm run build.",
    "Use ops/windows/setup-openclaw-whatsapp.ps1 before WhatsApp QR linking."
  )
}

if ($Json) {
  $summary | ConvertTo-Json -Depth 8
  exit 0
}

Write-Host "Nara Windows server prerequisite check" -ForegroundColor Cyan
Write-Host "Working directory: $($summary.cwd)"
Write-Host "Docker: $($summary.docker)"
Write-Host ""

foreach ($check in $checks) {
  $status = if ($check.ok) { "OK" } else { "MISS" }
  $color = if ($check.ok) { "Green" } else { "Yellow" }
  Write-Host ("[{0}] {1}: {2}" -f $status, $check.name, $check.detail) -ForegroundColor $color
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
foreach ($step in $summary.nextSteps) {
  Write-Host "- $step"
}
