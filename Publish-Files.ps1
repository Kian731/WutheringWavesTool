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

# Mirror the project without its local Git metadata. Removing first also carries
# intentional deletions (such as retired images) through to GitHub.
Get-ChildItem -LiteralPath $destinationRoot -Force |
  Where-Object { $_.Name -ne '.git' } |
  Remove-Item -Recurse -Force

Get-ChildItem -LiteralPath $sourceRoot -Force |
  Where-Object { $_.Name -ne '.git' } |
  ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $destinationRoot $_.Name) -Recurse -Force
  }
