param(
  [ValidateSet("validate", "sync", "export")]
  [string]$Action = "validate",

  [string]$OpenClawConfigPath = "$env:USERPROFILE\.openclaw\openclaw.json",

  [string]$Account = "default",

  [string]$BackendBaseUrl = "http://127.0.0.1:4000",

  [string]$HostNumber = $env:OPENCLAW_WHATSAPP_HOST_NUMBER,

  [string]$AgentSecretEnvName = "AGENT_API_SECRET",

  [string]$AgentPath = "",

  [string]$OutputPath = ".tmp\openclaw-nara-bot-contract.json"
)

$ErrorActionPreference = "Stop"

if (!(Test-Path -LiteralPath "package.json") -or !(Test-Path -LiteralPath "agent\prompts\system.md")) {
  throw "Run this script from the Nara repository root."
}

$promptPath = "agent\prompts\system.md"
$toolsPath = "agent\config\tools.json"

function Write-DebugStep {
  param([string]$Message)
  if ($env:NARA_DEBUG_OPENCLAW_SYNC) {
    Write-Host "[sync-openclaw-nara-bot] $Message" -ForegroundColor DarkGray
  }
}

function Get-TextSha256 {
  param([string]$Text)

  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
    return ([System.BitConverter]::ToString($sha.ComputeHash($bytes))).Replace("-", "").ToLowerInvariant()
  } finally {
    $sha.Dispose()
  }
}

function Read-Contract {
  Write-DebugStep "reading prompt"
  $prompt = Get-Content -LiteralPath $promptPath -Raw
  Write-DebugStep "reading tools"
  $toolsRaw = Get-Content -LiteralPath $toolsPath -Raw
  Write-DebugStep "parsing tools"
  $tools = $toolsRaw | ConvertFrom-Json
  $toolList = @($tools.tools)
  $requiredTools = @(
    "get_user_context",
    "create_task",
    "list_tasks",
    "complete_task",
    "delete_task",
    "create_reminder",
    "list_reminders",
    "update_reminder",
    "delete_reminder",
    "get_summary"
  )
  $toolNames = @($toolList | ForEach-Object { $_.name })
  $missingTools = @($requiredTools | Where-Object { $toolNames -notcontains $_ })

  Write-DebugStep "hashing contract"
  [pscustomobject]@{
    prompt = $prompt
    tools = $toolList
    toolsRaw = $toolsRaw
    promptSha256 = Get-TextSha256 $prompt
    toolsSha256 = Get-TextSha256 $toolsRaw
    requiredTools = $requiredTools
    missingTools = $missingTools
  }
}

function Ensure-ObjectProperty {
  param(
    [pscustomobject]$Object,
    [string]$Name
  )

  if (-not $Object.PSObject.Properties[$Name] -or $null -eq $Object.PSObject.Properties[$Name].Value) {
    $Object | Add-Member -NotePropertyName $Name -NotePropertyValue ([pscustomobject]@{}) -Force
  }

  return $Object.PSObject.Properties[$Name].Value
}

function Get-OpenClawConfig {
  if (!(Test-Path -LiteralPath $OpenClawConfigPath)) {
    throw "OpenClaw config not found: $OpenClawConfigPath"
  }

  Get-Content -LiteralPath $OpenClawConfigPath -Raw | ConvertFrom-Json
}

function Get-WhatsAppAccount {
  param([pscustomobject]$Config)

  if (-not $Config.channels -or -not $Config.channels.whatsapp -or -not $Config.channels.whatsapp.accounts) {
    return $null
  }

  $property = $Config.channels.whatsapp.accounts.PSObject.Properties[$Account]
  if (!$property) {
    return $null
  }

  return $property.Value
}

function Get-DottedObject {
  param(
    [pscustomobject]$Root,
    [string]$Path,
    [switch]$Create
  )

  if ([string]::IsNullOrWhiteSpace($Path)) {
    return $null
  }

  $current = $Root
  foreach ($part in $Path.Split(".")) {
    if ([string]::IsNullOrWhiteSpace($part)) {
      throw "AgentPath contains an empty segment: $Path"
    }

    if (-not $current.PSObject.Properties[$part]) {
      if (!$Create) {
        return $null
      }
      $current | Add-Member -NotePropertyName $part -NotePropertyValue ([pscustomobject]@{}) -Force
    }

    $current = $current.PSObject.Properties[$part].Value
    if ($null -eq $current) {
      if (!$Create) {
        return $null
      }
      $current = [pscustomobject]@{}
    }
  }

  return $current
}

function New-ContractMetadata {
  param([pscustomobject]$Contract)

  [pscustomobject]@{
    name = "Nara Bot"
    installedAt = (Get-Date).ToUniversalTime().ToString("o")
    promptPath = $promptPath
    promptSha256 = $Contract.promptSha256
    toolsManifestPath = $toolsPath
    toolsSha256 = $Contract.toolsSha256
    backendBaseUrl = $BackendBaseUrl
    agentSecretEnvName = $AgentSecretEnvName
    requiredFirstTool = "get_user_context"
    whatsapp = [pscustomobject]@{
      account = $Account
      subject = [pscustomobject]@{
        channelType = "whatsapp"
        contactValue = "incoming sender phone number"
      }
    }
    disallowedOpenClawBehaviors = @(
      "internal-task-storage",
      "sub-agent-spawn-for-user-requests",
      "openclaw-project-automation-for-user-requests"
    )
  }
}

function Test-Contract {
  param(
    [pscustomobject]$Config,
    [pscustomobject]$Contract
  )

  $accountConfig = Get-WhatsAppAccount $Config
  $meta = if ($Config.meta -and $Config.meta.naraBotRuntimeContract) {
    $Config.meta.naraBotRuntimeContract
  } else {
    $null
  }
  $agent = if ($AgentPath) { Get-DottedObject -Root $Config -Path $AgentPath } else { $null }

  $checks = @(
    [pscustomobject]@{
      name = "contract files"
      ok = ($Contract.missingTools.Count -eq 0)
      message = if ($Contract.missingTools.Count -eq 0) { "prompt and tools are readable" } else { "missing tools: $($Contract.missingTools -join ', ')" }
    },
    [pscustomobject]@{
      name = "whatsapp account"
      ok = ($null -ne $accountConfig)
      message = if ($accountConfig) { "channels.whatsapp.accounts.$Account exists" } else { "channels.whatsapp.accounts.$Account is missing" }
    },
    [pscustomobject]@{
      name = "allowlist policy"
      ok = ($accountConfig -and ($accountConfig.dmPolicy -eq "allowlist" -or $accountConfig.dmPolicy -eq "open"))
      message = if ($accountConfig) { "dmPolicy=$($accountConfig.dmPolicy)" } else { "account missing" }
    },
    [pscustomobject]@{
      name = "dedicated host number"
      ok = ($accountConfig -and $accountConfig.hostNumber -and -not $accountConfig.selfChatMode)
      message = if ($accountConfig -and $accountConfig.selfChatMode) {
        "shared personal-number mode is enabled"
      } elseif ($accountConfig -and $accountConfig.hostNumber) {
        "hostNumber is configured"
      } else {
        "hostNumber is missing"
      }
    },
    [pscustomobject]@{
      name = "expected host number"
      ok = (-not $HostNumber -or ($accountConfig -and $accountConfig.hostNumber -eq $HostNumber))
      message = if (!$HostNumber) {
        "OPENCLAW_WHATSAPP_HOST_NUMBER not provided"
      } elseif ($accountConfig) {
        "expected=$HostNumber configured=$($accountConfig.hostNumber)"
      } else {
        "account missing"
      }
    },
    [pscustomobject]@{
      name = "runtime metadata"
      ok = ($meta -and $meta.promptSha256 -eq $Contract.promptSha256 -and $meta.toolsSha256 -eq $Contract.toolsSha256)
      message = if ($meta) { "metadata prompt/tools hashes checked" } else { "meta.naraBotRuntimeContract is missing" }
    }
  )

  if ($AgentPath) {
    $checks += [pscustomobject]@{
      name = "agent path"
      ok = ($null -ne $agent)
      message = if ($agent) { "$AgentPath exists" } else { "$AgentPath is missing" }
    }
  }

  [pscustomobject]@{
    ok = -not (@($checks | Where-Object { -not $_.ok }).Count)
    action = $Action
    config = $OpenClawConfigPath
    account = $Account
    agentPath = $AgentPath
    promptSha256 = $Contract.promptSha256
    toolsSha256 = $Contract.toolsSha256
    checks = $checks
  }
}

function Export-Contract {
  param([pscustomobject]$Contract)

  Write-DebugStep "exporting contract"
  $parent = Split-Path -Parent $OutputPath
  if (!$parent) {
    $parent = "."
  }
  if ($parent -and !(Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent | Out-Null
  }

  $baseName = [System.IO.Path]::GetFileNameWithoutExtension($OutputPath)
  $promptOutputPath = Join-Path $parent "$baseName.system.md"
  $toolsOutputPath = Join-Path $parent "$baseName.tools.json"
  Copy-Item -LiteralPath $promptPath -Destination $promptOutputPath -Force
  Copy-Item -LiteralPath $toolsPath -Destination $toolsOutputPath -Force

  Write-DebugStep "serializing export"
  $indexJson = [pscustomobject]@{
    ok = $true
    name = "Nara Bot"
    exportedAt = (Get-Date).ToUniversalTime().ToString("o")
    systemPromptPath = $promptOutputPath
    toolsManifestPath = $toolsOutputPath
    promptSha256 = $Contract.promptSha256
    toolsSha256 = $Contract.toolsSha256
    backendBaseUrl = $BackendBaseUrl
    agentSecretEnvName = $AgentSecretEnvName
    requiredFirstTool = "get_user_context"
  } | ConvertTo-Json -Depth 8
  [System.IO.File]::WriteAllText(
    (Resolve-Path -LiteralPath $parent).Path + "\" + (Split-Path -Leaf $OutputPath),
    $indexJson,
    [System.Text.UTF8Encoding]::new($false)
  )

  Write-DebugStep "export written"
  return $OutputPath
}

function Sync-Contract {
  param(
    [pscustomobject]$Config,
    [pscustomobject]$Contract
  )

  $backupPath = "$OpenClawConfigPath.before-nara-bot-sync-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
  Copy-Item -LiteralPath $OpenClawConfigPath -Destination $backupPath

  $meta = Ensure-ObjectProperty -Object $Config -Name "meta"
  $meta | Add-Member -NotePropertyName naraBotRuntimeContract -NotePropertyValue (New-ContractMetadata $Contract) -Force

  $accountConfig = Get-WhatsAppAccount $Config
  if ($accountConfig) {
    $accountConfig | Add-Member -NotePropertyName naraBotRuntimeContract -NotePropertyValue ([pscustomobject]@{
      promptSha256 = $Contract.promptSha256
      toolsSha256 = $Contract.toolsSha256
      backendBaseUrl = $BackendBaseUrl
      requiredFirstTool = "get_user_context"
    }) -Force
  }

  if ($AgentPath) {
    $agent = Get-DottedObject -Root $Config -Path $AgentPath -Create
    $agent | Add-Member -NotePropertyName name -NotePropertyValue "Nara Bot" -Force
    $agent | Add-Member -NotePropertyName systemPromptPath -NotePropertyValue $promptPath -Force
    $agent | Add-Member -NotePropertyName systemPromptSha256 -NotePropertyValue $Contract.promptSha256 -Force
    $agent | Add-Member -NotePropertyName toolsManifestPath -NotePropertyValue $toolsPath -Force
    $agent | Add-Member -NotePropertyName toolsManifestSha256 -NotePropertyValue $Contract.toolsSha256 -Force
    $agent | Add-Member -NotePropertyName toolBaseUrl -NotePropertyValue $BackendBaseUrl -Force
    $agent | Add-Member -NotePropertyName requiredFirstTool -NotePropertyValue "get_user_context" -Force
    $agent | Add-Member -NotePropertyName headers -NotePropertyValue ([pscustomobject]@{
      "x-agent-secret" = $AgentSecretEnvName
    }) -Force
  }

  $Config | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $OpenClawConfigPath -Encoding UTF8

  return $backupPath
}

Write-DebugStep "start action=$Action"
$contract = Read-Contract
Write-DebugStep "contract loaded"

if ($Action -eq "export") {
  $written = Export-Contract $contract
  [pscustomobject]@{
    ok = $true
    action = "export"
    outputPath = $written
    promptSha256 = $contract.promptSha256
    toolsSha256 = $contract.toolsSha256
  } | ConvertTo-Json -Depth 10
  exit 0
}

$config = Get-OpenClawConfig

if ($Action -eq "sync") {
  $backup = Sync-Contract -Config $config -Contract $contract
  $config = Get-OpenClawConfig
  $report = Test-Contract -Config $config -Contract $contract
  $report | Add-Member -NotePropertyName backupPath -NotePropertyValue $backup -Force
  $report | ConvertTo-Json -Depth 20
  exit 0
}

(Test-Contract -Config $config -Contract $contract) | ConvertTo-Json -Depth 20
