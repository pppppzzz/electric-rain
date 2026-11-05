param(
    [Parameter(Mandatory=$true)][string]$Port,
    [string]$OutputDirectory = (Join-Path $PSScriptRoot 'logs'),
    [int]$TimeoutSeconds = 180
)
# Recorder only. Does not upload firmware or send song-selection commands.
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$captureId = [DateTimeOffset]::UtcNow.ToString('yyyyMMdd_HHmmss_fff')
$rawPath = Join-Path $OutputDirectory ($captureId + '_115200_raw.txt')
$metaPath = Join-Path $OutputDirectory ($captureId + '_capture.json')
$serial = New-Object System.IO.Ports.SerialPort($Port,115200,[System.IO.Ports.Parity]::None,8,[System.IO.Ports.StopBits]::One)
$serial.Handshake = [System.IO.Ports.Handshake]::None
$serial.Encoding = [System.Text.Encoding]::ASCII
$serial.DtrEnable = $true
$serial.RtsEnable = $false
$writer = $null
$tail = ''
$sawCalibration = $false
$sawSelection = $false
$sawFinish = $false
$complete = $false
$failure = $null
$startedUtc = [DateTimeOffset]::UtcNow.ToString('o')
$timer = [Diagnostics.Stopwatch]::StartNew()
try {
    $serial.Open() # UNO may reset on DTR; recording starts immediately.
    $writer = New-Object System.IO.StreamWriter($rawPath,$false,(New-Object System.Text.UTF8Encoding($false)))
    Write-Host "Recording $Port at 115200 8N1 to $rawPath"
    Write-Host 'Wait for calibration, then blow to select and play one complete round.'
    Write-Host 'If no calibration appears, press the physical RESET button once.'
    while ($timer.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
        $chunk = $serial.ReadExisting()
        if ($chunk.Length -eq 0) { Start-Sleep -Milliseconds 20; continue }
        $writer.Write($chunk)
        $writer.Flush()
        [Console]::Write($chunk)
        $tail += $chunk
        $newline = $tail.IndexOf("`n")
        while ($newline -ge 0) {
            $line = $tail.Substring(0,$newline).TrimEnd([char]13)
            $tail = $tail.Substring($newline+1)
            if ($line -eq 'Keep quiet for 2 seconds: calibrating microphone.') { $sawCalibration = $true }
            if ($sawCalibration -and $line -match '^Selected: (Mo Li Hua|Jingle Bells|Doll and Bear Dance)$') { $sawSelection = $true }
            if ($sawSelection -and $line -eq 'Song finished. Quiet pause, then recalibrate and blow again.') { $sawFinish = $true }
            if ($sawFinish -and $line -eq 'Blow now: soft / medium / strong.') { $complete = $true }
            $newline = $tail.IndexOf("`n")
        }
        if ($complete) { break }
    }
} catch {
    $failure = $_.Exception.Message
} finally {
    if ($null -ne $writer) { $writer.Dispose() }
    if ($serial.IsOpen) { $serial.Close() }
    $serial.Dispose()
    $hash = if (Test-Path -LiteralPath $rawPath) { (Get-FileHash -Algorithm SHA256 -LiteralPath $rawPath).Hash } else { $null }
    [ordered]@{
        port=$Port; baud=115200; format='8N1'; hardware_flow_control=$false;
        started_utc=$startedUtc; ended_utc=[DateTimeOffset]::UtcNow.ToString('o');
        raw_file=[IO.Path]::GetFileName($rawPath); sha256=$hash;
        saw_calibration=$sawCalibration; saw_selection=$sawSelection; saw_finish=$sawFinish;
        complete_cycle=$complete; error=$failure;
        firmware_identity='Not read back; banner and source snapshot alone do not prove binary identity.'
    } | ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath $metaPath
}
if ($failure) { throw $failure }
if (!$complete) { throw 'Capture incomplete: timed out before a complete calibration/selection/song/end cycle. Partial output retained.' }
Write-Host "Complete real serial capture saved: $rawPath"
