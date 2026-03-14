$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')
$target = Join-Path $root 'src\app\api'
$files = Get-ChildItem -Path $target -Recurse -Filter '*.ts'

$bad = @()
foreach ($file in $files) {
  $content = [System.IO.File]::ReadAllText($file.FullName)
  $hasSessionDecode = $content -match 'sessionData'
  $hasSessionHelper = $content -match 'getCurrentUser|getSessionUser|verifyTeacher|verifyAdmin'
  $usesSessionAsUserId = $content -match 'userId\s*:\s*user\.id'
  if ($hasSessionDecode -and $hasSessionHelper -and $usesSessionAsUserId) {
    $bad += $file.FullName
  }
}

if ($bad.Count -gt 0) {
  Write-Host 'Potential session-shape mismatch found (user.id used with sessionData):' -ForegroundColor Yellow
  $bad | ForEach-Object { Write-Host " - $_" }
  exit 1
}

Write-Host 'Session shape check passed.' -ForegroundColor Green
