$wsh = New-Object -ComObject WScript.Shell
$startup = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Startup)
$startupShortcut = Join-Path $startup "Robo Island.lnk"

$s = $wsh.CreateShortcut($startupShortcut)
$s.TargetPath = "C:\Users\muthu\.gemini\antigravity\scratch\dynamic-island-windows\dist\Robo Island-win32-x64\Robo Island.exe"
$s.WorkingDirectory = "C:\Users\muthu\.gemini\antigravity\scratch\dynamic-island-windows\dist\Robo Island-win32-x64"
$s.IconLocation = "C:\Users\muthu\.gemini\antigravity\scratch\dynamic-island-windows\icon.ico"
$s.Description = "Robo Island - Dynamic Island for Windows"
$s.Save()

Write-Output "Startup shortcut created successfully at: $startupShortcut"
