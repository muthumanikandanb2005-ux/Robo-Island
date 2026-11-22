$env:ELECTRON_ENABLE_LOGGING = "1"
Set-Location "C:\Users\muthu\.gemini\antigravity\scratch\dynamic-island-windows\dist\Robo Island-win32-x64"
$p = Start-Process -FilePath ".\Robo Island.exe" -ArgumentList "--enable-logging" -RedirectStandardError "err.log" -RedirectStandardOutput "out.log" -PassThru
Start-Sleep -Seconds 3
if ($p.HasExited) {
    Write-Output "Exited with code: $($p.ExitCode)"
    Write-Output "--- ERR LOG ---"
    Get-Content "err.log"
    Write-Output "--- OUT LOG ---"
    Get-Content "out.log"
} else {
    Write-Output "App is running! PID: $($p.Id)"
}
