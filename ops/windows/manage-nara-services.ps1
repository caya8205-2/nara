param(
  [ValidateSet("status", "stop", "restart", "logs")]
  [string]$Action = "status",

  [ValidateSet("all", "backend", "openclaw-gateway", "openclaw-dashboard", "9router")]
  [string]$Service = "all",

  [int]$Tail = 80,

  [switch]$SkipOpenClaw,
  [switch]$Skip9Router
)

$ErrorActionPreference = "Stop"

if (!(Test-Path -LiteralPath "package.json") -or !(Test-Path -LiteralPath "apps\backend\package.json")) {
  throw "Run this script from the Nara repository root."
}

$logDir = ".tmp\service-logs"

$services = @(
  [pscustomobject]@{
    Key = "backend"
    Name = "nara-backend"
    Pattern = "*apps/backend/dist/index.js*"
  },
  [pscustomobject]@{
    Key = "openclaw-gateway"
    Name = "openclaw-gateway"
    Pattern = "*openclaw*gateway*run*"
  },
  [pscustomobject]@{
    Key = "openclaw-dashboard"
    Name = "openclaw-dashboard"
    Pattern = "*openclaw*dashboard*--no-open*"
  },
  [pscustomobject]@{
    Key = "9router"
    Name = "9router"
    Pattern = "*9router*"
  }
)

function Get-SelectedServices {
  if ($Service -eq "all") {
    return $services
  }

  return $services | Where-Object { $_.Key -eq $Service }
}

function Get-ServiceProcesses {
  param([pscustomobject]$Definition)

  Get-CimInstance Win32_Process |
    Where-Object { $_.CommandLine -like $Definition.Pattern } |
    Select-Object @{Name = "service"; Expression = { $Definition.Name } },
      ProcessId,
      CommandLine
}

function Show-Status {
  $rows = foreach ($definition in Get-SelectedServices) {
    $processes = @(Get-ServiceProcesses -Definition $definition)
    if ($processes.Count -eq 0) {
      [pscustomobject]@{
        service = $definition.Name
        status = "stopped"
        pid = ""
      }
    } else {
      foreach ($process in $processes) {
        [pscustomobject]@{
          service = $definition.Name
          status = "running"
          pid = $process.ProcessId
        }
      }
    }
  }

  $rows | Format-Table -AutoSize
}

function Stop-Selected {
  foreach ($definition in Get-SelectedServices) {
    $processes = @(Get-ServiceProcesses -Definition $definition)
    if ($processes.Count -eq 0) {
      Write-Host "$($definition.Name) is already stopped." -ForegroundColor DarkGray
      continue
    }

    foreach ($process in $processes) {
      Stop-Process -Id $process.ProcessId -Force
      Write-Host "Stopped $($definition.Name) ($($process.ProcessId))." -ForegroundColor Yellow
    }
  }
}

function Show-Logs {
  $definitions = Get-SelectedServices
  foreach ($definition in $definitions) {
    $stdout = Join-Path $logDir "$($definition.Name).out.log"
    $stderr = Join-Path $logDir "$($definition.Name).err.log"

    Write-Host ""
    Write-Host "==> $($definition.Name) stdout" -ForegroundColor Cyan
    if (Test-Path -LiteralPath $stdout) {
      Get-Content -LiteralPath $stdout -Tail $Tail
    } else {
      Write-Host "No stdout log found at $stdout" -ForegroundColor DarkGray
    }

    Write-Host ""
    Write-Host "==> $($definition.Name) stderr" -ForegroundColor Cyan
    if (Test-Path -LiteralPath $stderr) {
      Get-Content -LiteralPath $stderr -Tail $Tail
    } else {
      Write-Host "No stderr log found at $stderr" -ForegroundColor DarkGray
    }
  }
}

switch ($Action) {
  "status" {
    Show-Status
  }
  "stop" {
    Stop-Selected
  }
  "restart" {
    Stop-Selected
    $args = @()
    if ($SkipOpenClaw) {
      $args += "-SkipOpenClaw"
    }
    if ($Skip9Router) {
      $args += "-Skip9Router"
    }
    powershell -ExecutionPolicy Bypass -File ".\ops\windows\start-nara-services.ps1" @args
  }
  "logs" {
    Show-Logs
  }
}
