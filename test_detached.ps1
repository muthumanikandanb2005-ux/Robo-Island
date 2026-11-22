Set-Location "C:\Users\muthu\.gemini\antigravity\scratch\dynamic-island-windows\dist\Robo Island-win32-x64"
$p = Start-Process -FilePath ".\Robo Island.exe" -PassThru
Start-Sleep -Seconds 4
$proc = Get-Process -Id $p.Id -ErrorAction SilentlyContinue
if ($proc) {
    Write-Output "SUCCESS: Robo Island is running independently! PID: $($proc.Id), Name: $($proc.ProcessName)"
} else {
    Write-Output "Process exited."
}
