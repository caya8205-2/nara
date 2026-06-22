param(
  [Parameter(Mandatory = $true)]
  [Alias("HostPhone", "BotPhone")]
  [string]$OwnerPhone,

  [string]$Account = "default",

  [string]$Name = "Nara Bot",

  [switch]$SelfPhoneMode,

  [ValidateSet("pairing", "allowlist", "open", "disabled")]
  [string]$DmPolicy,

  [string]$OpenClawConfigPath = "$env:USERPROFILE\.openclaw\openclaw.json"
)

$ErrorActionPreference = "Stop"

function Normalize-E164 {
  param([string]$Value)

  $trimmed = $Value.Trim()
  if ($trimmed -notmatch '^\+[1-9][0-9]{7,14}$') {
    throw "WhatsApp host phone must be E.164 format, for example +6281234567890."
  }

  return $trimmed
}

if (!(Test-Path -LiteralPath $OpenClawConfigPath)) {
  throw "OpenClaw config not found: $OpenClawConfigPath. Install/start OpenClaw first."
}

$phone = Normalize-E164 $OwnerPhone
$selectedPolicy = if ($DmPolicy) { $DmPolicy } else { "allowlist" }
$backupPath = "$OpenClawConfigPath.before-whatsapp-setup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

Copy-Item -LiteralPath $OpenClawConfigPath -Destination $backupPath

$cfg = Get-Content -LiteralPath $OpenClawConfigPath -Raw | ConvertFrom-Json

if (-not $cfg.channels) {
  $cfg | Add-Member -NotePropertyName channels -NotePropertyValue ([pscustomobject]@{}) -Force
}

if (-not $cfg.channels.whatsapp) {
  $cfg.channels | Add-Member -NotePropertyName whatsapp -NotePropertyValue ([pscustomobject]@{}) -Force
}

$wa = $cfg.channels.whatsapp
$wa | Add-Member -NotePropertyName enabled -NotePropertyValue $true -Force
$wa | Add-Member -NotePropertyName defaultAccount -NotePropertyValue $Account -Force

if (-not $wa.accounts) {
  $wa | Add-Member -NotePropertyName accounts -NotePropertyValue ([pscustomobject]@{}) -Force
}

if (-not $wa.accounts.PSObject.Properties[$Account]) {
  $wa.accounts | Add-Member -NotePropertyName $Account -NotePropertyValue ([pscustomobject]@{}) -Force
}

$acct = $wa.accounts.PSObject.Properties[$Account].Value
$acct | Add-Member -NotePropertyName name -NotePropertyValue $Name -Force
$acct | Add-Member -NotePropertyName enabled -NotePropertyValue $true -Force
$acct | Add-Member -NotePropertyName dmPolicy -NotePropertyValue $selectedPolicy -Force
$acct | Add-Member -NotePropertyName hostNumber -NotePropertyValue $phone -Force

if ($SelfPhoneMode) {
  $acct | Add-Member -NotePropertyName allowFrom -NotePropertyValue @($phone) -Force
  $acct | Add-Member -NotePropertyName selfChatMode -NotePropertyValue $true -Force
} else {
  $existingAllowFrom = @()
  if ($acct.PSObject.Properties["allowFrom"] -and $acct.allowFrom) {
    $existingAllowFrom = @($acct.allowFrom)
  }
  $acct | Add-Member -NotePropertyName allowFrom -NotePropertyValue $existingAllowFrom -Force
  $acct | Add-Member -NotePropertyName selfChatMode -NotePropertyValue $false -Force
}

if ($cfg.meta) {
  $cfg.meta | Add-Member -NotePropertyName lastTouchedAt -NotePropertyValue ((Get-Date).ToUniversalTime().ToString("o")) -Force
}

$cfg | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $OpenClawConfigPath -Encoding UTF8

[pscustomobject]@{
  config = $OpenClawConfigPath
  backup = $backupPath
  channel = "whatsapp"
  account = $Account
  name = $Name
  hostNumber = $phone
  selfChatMode = [bool]$SelfPhoneMode
  dmPolicy = $selectedPolicy
  allowFrom = @($acct.allowFrom)
  next = @(
    "Restart OpenClaw gateway if it does not hot reload.",
    "Run: openclaw channels login --channel whatsapp --account $Account --verbose",
    "Run: openclaw channels status --channel whatsapp --json"
  )
} | ConvertTo-Json -Depth 8
