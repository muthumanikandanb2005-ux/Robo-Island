$proc = Start-Process -FilePath "C:\Users\muthu\.gemini\antigravity\scratch\dynamic-island-windows\dist\Robo Island-win32-x64\Robo Island.exe" -ArgumentList "--enable-logging --log-net-log" -Wait -PassThru
Write-Output "Exit code: $($proc.ExitCode)"
