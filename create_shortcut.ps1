$wsh = New-Object -ComObject WScript.Shell
$desktop = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$shortcutPath = Join-Path $desktop "Robo Island.lnk"

$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "C:\Users\muthu\.gemini\antigravity\scratch\dynamic-island-windows\dist\Robo Island-win32-x64\Robo Island.exe"
$shortcut.WorkingDirectory = "C:\Users\muthu\.gemini\antigravity\scratch\dynamic-island-windows\dist\Robo Island-win32-x64"
$shortcut.IconLocation = "C:\Users\muthu\.gemini\antigravity\scratch\dynamic-island-windows\icon.ico"
$shortcut.Description = "Robo Island - Dynamic Island for Windows"
$shortcut.Save()

Write-Output "Successfully created desktop shortcut at: $shortcutPath"

# Also create in Start Menu
$startMenu = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Programs)
$startMenuPath = Join-Path $startMenu "Robo Island.lnk"
$startShortcut = $wsh.CreateShortcut($startMenuPath)
$startShortcut.TargetPath = "C:\Users\muthu\.gemini\antigravity\scratch\dynamic-island-windows\dist\Robo Island-win32-x64\Robo Island.exe"
$startShortcut.WorkingDirectory = "C:\Users\muthu\.gemini\antigravity\scratch\dynamic-island-windows\dist\Robo Island-win32-x64"
$startShortcut.IconLocation = "C:\Users\muthu\.gemini\antigravity\scratch\dynamic-island-windows\icon.ico"
$startShortcut.Description = "Robo Island - Dynamic Island for Windows"
$startShortcut.Save()

Write-Output "Successfully created Start Menu shortcut at: $startMenuPath"
