param(
  [string]$BackendUrl = "http://127.0.0.1:4000",
  [string]$OpenClawUrl = "http://127.0.0.1:18789",
  [string]$OperatorUsername,
  [string]$OperatorPassword,
  [switch]$Json
)

$ErrorActionPreference = "Stop"

function Test-HttpJson {
  param(
    [string]$Name,
    [string]$Url,
    [hashtable]$Headers
  )

  try {
    $requestHeaders = if ($Headers) { $Headers } else { @{} }
    $res = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 8 -Headers $requestHeaders
    $body = $null
    try {
      $body = $res.Content | ConvertFrom-Json
    } catch {
      $previewLength = [Math]::Min(160, $res.Content.Length)
      $body = [pscustomobject]@{
        textLength = $res.Content.Length
        preview = $res.Content.Substring(0, $previewLength)
      }
    }

    return [pscustomobject]@{
      name = $Name
      ok = $true
      detail = "HTTP $($res.StatusCode)"
      url = $Url
      body = $body
    }
  } catch {
    return [pscustomobject]@{
      name = $Name
      ok = $false
      detail = $_.Exception.Message
      url = $Url
      body = $null
    }
  }
}

function Skip-Check {
  param(
    [string]$Name,
    [string]$Detail
  )

  return [pscustomobject]@{
    name = $Name
    ok = $true
    detail = "SKIP: $Detail"
    url = $null
    body = $null
  }
}

function Get-OperatorToken {
  if ([string]::IsNullOrWhiteSpace($OperatorUsername) -or [string]::IsNullOrWhiteSpace($OperatorPassword)) {
    return $null
  }

  try {
    $payload = @{
      username = $OperatorUsername
      password = $OperatorPassword
    } | ConvertTo-Json

    $res = Invoke-WebRequest `
      -Uri "$BackendUrl/api/auth/login" `
      -Method Post `
      -ContentType "application/json" `
      -Body $payload `
      -UseBasicParsing `
      -TimeoutSec 8

    $body = $res.Content | ConvertFrom-Json
    return $body.token
  } catch {
    return $null
  }
}

function Test-DockerContainers {
  try {
    $names = docker ps --format "{{.Names}}" 2>$null
    return [pscustomobject]@{
      name = "docker containers"
      ok = $LASTEXITCODE -eq 0
      detail = if ($LASTEXITCODE -eq 0) { ($names -join ", ") } else { "docker ps failed" }
    }
  } catch {
    return [pscustomobject]@{
      name = "docker containers"
      ok = $false
      detail = $_.Exception.Message
    }
  }
}

function Test-Pm2Process {
  param([string]$ProcessName)

  $pm2 = Get-Command "pm2.cmd" -ErrorAction SilentlyContinue
  if ($null -eq $pm2) {
    $pm2 = Get-Command "pm2" -ErrorAction SilentlyContinue
  }

  if ($null -eq $pm2) {
    return [pscustomobject]@{
      name = "pm2 $ProcessName"
      ok = $false
      detail = "not installed or not on PATH"
    }
  }

  try {
    $list = pm2 jlist | ConvertFrom-Json
    $process = $list | Where-Object { $_.name -eq $ProcessName } | Select-Object -First 1
    return [pscustomobject]@{
      name = "pm2 $ProcessName"
      ok = $null -ne $process -and $process.pm2_env.status -eq "online"
      detail = if ($null -eq $process) { "not found" } else { $process.pm2_env.status }
    }
  } catch {
    return [pscustomobject]@{
      name = "pm2 $ProcessName"
      ok = $false
      detail = $_.Exception.Message
    }
  }
}

$checks = @()
$operatorToken = Get-OperatorToken
$authHeaders = if ($operatorToken) { @{ Authorization = "Bearer $operatorToken" } } else { $null }
$checks += Test-DockerContainers
$checks += Test-Pm2Process "nara-backend"
$checks += Test-Pm2Process "openclaw-gateway"
$checks += Test-Pm2Process "openclaw-dashboard"
$checks += Test-Pm2Process "9router"
$checks += Test-HttpJson "backend health" "$BackendUrl/health"
$checks += Test-HttpJson "backend readiness" "$BackendUrl/api/readiness"
if ($authHeaders) {
  $checks += Test-HttpJson "reminder execution" "$BackendUrl/api/reminders/execution" $authHeaders
} else {
  $checks += Skip-Check "reminder execution" "operator credentials not provided"
}
$checks += Test-HttpJson "openclaw control" "$OpenClawUrl/overview"

$summary = [pscustomobject]@{
  checkedAt = (Get-Date).ToUniversalTime().ToString("o")
  backendUrl = $BackendUrl
  openClawUrl = $OpenClawUrl
  ok = ($checks | Where-Object { $_.ok -eq $false }).Count -eq 0
  checks = $checks
}

if ($Json) {
  $summary | ConvertTo-Json -Depth 12
  exit 0
}

Write-Host "Nara server health check" -ForegroundColor Cyan
Write-Host "Backend: $BackendUrl"
Write-Host "OpenClaw: $OpenClawUrl"
Write-Host ""

foreach ($check in $checks) {
  $status = if ($check.ok) { "OK" } else { "MISS" }
  $color = if ($check.ok) { "Green" } else { "Yellow" }
  Write-Host ("[{0}] {1}: {2}" -f $status, $check.name, $check.detail) -ForegroundColor $color
}

Write-Host ""
if ($summary.ok) {
  Write-Host "Nara server checks passed." -ForegroundColor Green
} else {
  Write-Host "Some checks need attention." -ForegroundColor Yellow
}
