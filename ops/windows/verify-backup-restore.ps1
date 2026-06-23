param(
  [string]$BackupPath,
  [string]$BackupDir = $env:BACKUP_DIR,
  [string]$DatabaseUrl = $env:DATABASE_URL,
  [string]$RestoreDatabase = "nara_restore_check",
  [switch]$Execute,
  [switch]$ResetCheckDatabase
)

$ErrorActionPreference = "Stop"

function Resolve-RepoPath([string]$PathValue) {
  if ([string]::IsNullOrWhiteSpace($PathValue)) {
    return $null
  }

  if ([System.IO.Path]::IsPathRooted($PathValue)) {
    return [System.IO.Path]::GetFullPath($PathValue)
  }

  return [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $PathValue))
}

function Get-DatabaseName([string]$Url) {
  if ([string]::IsNullOrWhiteSpace($Url)) {
    throw "DATABASE_URL is required. Set it in the shell or pass -DatabaseUrl."
  }

  $uri = [Uri]$Url
  $name = $uri.AbsolutePath.TrimStart("/")
  if ([string]::IsNullOrWhiteSpace($name)) {
    throw "DATABASE_URL does not include a database name."
  }
  return $name
}

function Get-MaintenanceUrl([string]$Url) {
  $builder = [UriBuilder]$Url
  $builder.Path = "postgres"
  return $builder.Uri.AbsoluteUri
}

function Test-CommandExists([string]$Command) {
  return $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

function Invoke-CheckedCommand([string]$Command, [string[]]$Arguments) {
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Command exited with code $LASTEXITCODE"
  }
}

function Resolve-LatestBackup([string]$Directory) {
  $absoluteDir = Resolve-RepoPath $Directory
  if (-not $absoluteDir) {
    $absoluteDir = Resolve-RepoPath ".\data\backups"
  }

  if (-not (Test-Path -LiteralPath $absoluteDir -PathType Container)) {
    throw "Backup directory does not exist: $absoluteDir"
  }

  $candidates = Get-ChildItem -LiteralPath $absoluteDir -File |
    Where-Object { $_.Name -like "full-*.json" -or $_.Name -like "database-*.sql" } |
    Sort-Object LastWriteTime -Descending

  if (-not $candidates) {
    throw "No full-*.json or database-*.sql backup files found in $absoluteDir"
  }

  return $candidates[0].FullName
}

function Resolve-DatabaseDump([string]$PathValue) {
  $absolutePath = Resolve-RepoPath $PathValue
  if (-not (Test-Path -LiteralPath $absolutePath -PathType Leaf)) {
    throw "Backup file does not exist: $absolutePath"
  }

  if ($absolutePath.ToLowerInvariant().EndsWith(".sql")) {
    return $absolutePath
  }

  if (-not $absolutePath.ToLowerInvariant().EndsWith(".json")) {
    throw "Unsupported backup file. Expected a database .sql dump or full .json snapshot."
  }

  $snapshot = Get-Content -LiteralPath $absolutePath -Raw | ConvertFrom-Json
  $dumpPath = $snapshot.database.dumpPath
  if ([string]::IsNullOrWhiteSpace($dumpPath)) {
    throw "Full backup snapshot does not include database.dumpPath."
  }

  $resolvedDumpPath = Resolve-RepoPath $dumpPath
  if (-not (Test-Path -LiteralPath $resolvedDumpPath -PathType Leaf)) {
    throw "Database dump referenced by snapshot is missing: $resolvedDumpPath"
  }

  return $resolvedDumpPath
}

$selectedBackup = if ($BackupPath) {
  Resolve-RepoPath $BackupPath
} else {
  Resolve-LatestBackup $BackupDir
}

$dumpPath = Resolve-DatabaseDump $selectedBackup
$dumpInfo = Get-Item -LiteralPath $dumpPath
if ($dumpInfo.Length -le 0) {
  throw "Database dump is empty: $dumpPath"
}

$liveDatabase = Get-DatabaseName $DatabaseUrl
if ($RestoreDatabase -notmatch "^[A-Za-z0-9_]+$") {
  throw "Restore database name may only contain letters, numbers, and underscores."
}

if ($RestoreDatabase -eq $liveDatabase) {
  throw "Refusing to verify restore into live database '$liveDatabase'. Choose a throwaway -RestoreDatabase name."
}

$psqlAvailable = Test-CommandExists "psql"
$createdbAvailable = Test-CommandExists "createdb"
$dropdbAvailable = Test-CommandExists "dropdb"

$maintenanceUrl = Get-MaintenanceUrl $DatabaseUrl
$existsSql = "select 1 from pg_database where datname = '$RestoreDatabase';"
$restoreUrlBuilder = [UriBuilder]$DatabaseUrl
$restoreUrlBuilder.Path = $RestoreDatabase
$restoreUrl = $restoreUrlBuilder.Uri.AbsoluteUri

$plan = [ordered]@{
  selectedBackup = $selectedBackup
  databaseDump = $dumpPath
  dumpSizeBytes = $dumpInfo.Length
  liveDatabase = $liveDatabase
  restoreDatabase = $RestoreDatabase
  mode = if ($Execute) { "execute" } else { "dry-run" }
  resetExistingCheckDatabase = [bool]$ResetCheckDatabase
  psqlAvailable = $psqlAvailable
  createdbAvailable = $createdbAvailable
  dropdbAvailable = $dropdbAvailable
}

if (-not $Execute) {
  $plan.nextStep = "Run again with -Execute to create and restore into the throwaway check database."
  $plan | ConvertTo-Json -Depth 5
  exit 0
}

if (-not $psqlAvailable) {
  throw "psql is not available on PATH. Install PostgreSQL client tools on the server before running restore verification."
}

if (-not $createdbAvailable) {
  throw "createdb is not available on PATH. Install PostgreSQL client tools on the server before running restore verification."
}

if ($ResetCheckDatabase -and -not $dropdbAvailable) {
  throw "dropdb is not available on PATH. Install PostgreSQL client tools or run without -ResetCheckDatabase."
}

$existing = (& psql $maintenanceUrl "-tAc" $existsSql).Trim()
if ($LASTEXITCODE -ne 0) {
  throw "Failed to check restore database existence."
}

if ($existing -eq "1") {
  if (-not $ResetCheckDatabase) {
    throw "Restore check database '$RestoreDatabase' already exists. Re-run with -ResetCheckDatabase to drop only that check database."
  }

  Invoke-CheckedCommand "dropdb" @("--if-exists", "--force", "--maintenance-db", $maintenanceUrl, $RestoreDatabase)
}

Invoke-CheckedCommand "createdb" @("--maintenance-db", $maintenanceUrl, $RestoreDatabase)
Invoke-CheckedCommand "psql" @($restoreUrl, "-v", "ON_ERROR_STOP=1", "-f", $dumpPath)

$tableCount = (& psql $restoreUrl "-tAc" "select count(*) from information_schema.tables where table_schema = 'public';").Trim()
if ($LASTEXITCODE -ne 0) {
  throw "Restore completed, but table verification query failed."
}

[ordered]@{
  ok = $true
  selectedBackup = $selectedBackup
  databaseDump = $dumpPath
  restoreDatabase = $RestoreDatabase
  tableCount = [int]$tableCount
  message = "Restore verification completed against throwaway database '$RestoreDatabase'."
} | ConvertTo-Json -Depth 5
