[CmdletBinding()]
param(
  [string]$Source,
  [string]$Destination
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($Source) -or [string]::IsNullOrWhiteSpace($Destination)) {
  throw 'This helper must be launched by the GitHub publisher CMD file.'
}

$sourceRoot = [System.IO.Path]::GetFullPath($Source).TrimEnd('\', '/')
$destinationRoot = [System.IO.Path]::GetFullPath($Destination).TrimEnd('\', '/')

if (-not (Test-Path -LiteralPath (Join-Path $destinationRoot '.git') -PathType Container)) {
  throw 'Destination is not the dedicated Git checkout.'
}

if ($sourceRoot -eq $destinationRoot) {
  throw 'Source and destination must be different folders.'
}

# Mirror the project without local-only files. Removing first also carries
# intentional deletions (such as retired images) through to GitHub.
Get-ChildItem -LiteralPath $destinationRoot -Force |
  Where-Object { $_.Name -ne '.git' } |
  Remove-Item -Recurse -Force

# These files are useful on the author's machine but are not required to run,
# update, or publish the guide. Keeping them out of GitHub also avoids uploading
# session exports, automatic rollback copies, dependencies, and scraper caches.
$excludedFolders = @('.git', '_handoff', 'data\_prev', 'tools\node_modules')
$excludedFiles = @(
  'tools\raw.json', 'tools\filemap.json', 'tools\gaps.json', 'tools\images.json',
  'tools\itemfiles.json', 'tools\pagemap.json', 'tools\pagetitles.json',
  'tools\supp.json', 'tools\orphan-imgs.txt'
)

function Test-PublishExcluded([string]$relativePath) {
  $relativePath = $relativePath.Replace('/', '\')
  if ($excludedFiles -contains $relativePath) { return $true }
  foreach ($folder in $excludedFolders) {
    if ($relativePath -eq $folder -or $relativePath.StartsWith($folder + '\', [System.StringComparison]::OrdinalIgnoreCase)) {
      return $true
    }
  }
  return $false
}

Get-ChildItem -LiteralPath $sourceRoot -Recurse -Force -File |
  ForEach-Object {
    $relative = $_.FullName.Substring($sourceRoot.Length).TrimStart('\', '/')
    if (Test-PublishExcluded $relative) { return }
    $target = Join-Path $destinationRoot $relative
    $parent = Split-Path -Parent $target
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
    Copy-Item -LiteralPath $_.FullName -Destination $target -Force
  }
