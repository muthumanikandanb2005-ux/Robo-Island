# Persistent Media & SMTC Bridge Daemon for Windows Dynamic Island
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { 
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' 
}[0]

Function Await($WinRtTask, $ResultType) {
    if (-not $WinRtTask) { return $null }
    try {
        $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
        $netTask = $asTask.Invoke($null, @($WinRtTask))
        if ($netTask.Wait(800)) {
            return $netTask.Result
        }
        return $null
    } catch {
        return $null
    }
}

[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media, ContentType = WindowsRuntime] | Out-Null

# Virtual key helper and Active Window tracker using user32.dll
$csharpHelper = @"
using System;
using System.Text;
using System.Runtime.InteropServices;
using System.Diagnostics;

public class WinHelper {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    public const int KEYEVENTF_EXTENDEDKEY = 0x1;
    public const int KEYEVENTF_KEYUP = 0x2;
    public const byte VK_MEDIA_NEXT_TRACK = 0xB0;
    public const byte VK_MEDIA_PREV_TRACK = 0xB1;
    public const byte VK_MEDIA_STOP = 0xB2;
    public const byte VK_MEDIA_PLAY_PAUSE = 0xB3;
    public const byte VK_VOLUME_MUTE = 0xAD;
    public const byte VK_VOLUME_DOWN = 0xAE;
    public const byte VK_VOLUME_UP = 0xAF;

    public static void SendMediaKey(byte vk) {
        keybd_event(vk, 0, KEYEVENTF_EXTENDEDKEY, UIntPtr.Zero);
        keybd_event(vk, 0, KEYEVENTF_EXTENDEDKEY | KEYEVENTF_KEYUP, UIntPtr.Zero);
    }

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    [DllImport("user32.dll")]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder text, int count);

    public static string GetActiveProcessName() {
        try {
            IntPtr hwnd = GetForegroundWindow();
            if (hwnd == IntPtr.Zero) return "";
            uint pid = 0;
            GetWindowThreadProcessId(hwnd, out pid);
            if (pid == 0) return "";
            Process p = Process.GetProcessById((int)pid);
            return p != null ? p.ProcessName.ToLower() : "";
        } catch {
            return "";
        }
    }

    public static string GetActiveWindowTitle() {
        try {
            IntPtr hwnd = GetForegroundWindow();
            if (hwnd == IntPtr.Zero) return "";
            StringBuilder sb = new StringBuilder(512);
            GetWindowText(hwnd, sb, 512);
            return sb.ToString();
        } catch {
            return "";
        }
    }

    public static string GetActiveClassName() {
        try {
            IntPtr hwnd = GetForegroundWindow();
            if (hwnd == IntPtr.Zero) return "";
            StringBuilder sb = new StringBuilder(256);
            GetClassName(hwnd, sb, 256);
            return sb.ToString();
        } catch {
            return "";
        }
    }
}
"@
Add-Type -TypeDefinition $csharpHelper -Language CSharp

$asyncOp = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
$manager = Await $asyncOp ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::WriteLine("READY")

while ($true) {
    $line = [Console]::ReadLine()
    if ($null -eq $line -or $line -eq "exit") { break }
    
    $trimmed = $line.Trim()
    $parts = $trimmed -split ":", 2
    $action = $parts[0].ToLower()
    $param = if ($parts.Length -gt 1) { $parts[1] } else { $null }

    try {
        $session = if ($manager) { $manager.GetCurrentSession() } else { $null }
        if (-not $session -and $manager) {
            try {
                $newOp = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
                $manager = Await $newOp ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
                if ($manager) { $session = $manager.GetCurrentSession() }
            } catch {}
        }

        switch ($action) {
            "playpause" {
                [WinHelper]::SendMediaKey([WinHelper]::VK_MEDIA_PLAY_PAUSE)
                if ($session) {
                    try { $null = $session.TryTogglePlayPauseAsync() } catch {}
                }
            }
            "next" {
                [WinHelper]::SendMediaKey([WinHelper]::VK_MEDIA_NEXT_TRACK)
                if ($session) {
                    try { $null = $session.TrySkipNextAsync() } catch {}
                }
            }
            "prev" {
                [WinHelper]::SendMediaKey([WinHelper]::VK_MEDIA_PREV_TRACK)
                if ($session) {
                    try { $null = $session.TrySkipPreviousAsync() } catch {}
                }
            }
            "volup" {
                [WinHelper]::SendMediaKey([WinHelper]::VK_VOLUME_UP)
            }
            "voldown" {
                [WinHelper]::SendMediaKey([WinHelper]::VK_VOLUME_DOWN)
            }
            "mute" {
                [WinHelper]::SendMediaKey([WinHelper]::VK_VOLUME_MUTE)
            }
            "seek" {
                if ($session -and $param) {
                    try {
                        $secs = [double]$param
                        $ticks = [long]($secs * 10000000)
                        $null = $session.TryChangePlaybackPositionAsync($ticks)
                    } catch {}
                }
            }
        }

        # Foreground window & Desktop detection
        $fgProc = [WinHelper]::GetActiveProcessName()
        $fgTitle = [WinHelper]::GetActiveWindowTitle()
        $fgClass = [WinHelper]::GetActiveClassName()

        # Desktop is active if explorer is focused with Progman/WorkerW class or title Program Manager, or if no window is focused
        $isDesktop = ($fgProc -eq "explorer" -and ($fgClass -eq "Progman" -or $fgClass -eq "WorkerW" -or $fgTitle -eq "Program Manager")) -or ($fgProc -eq "")
        $isBrowser = [bool]($fgProc -match "(chrome|msedge|brave|firefox|opera|vivaldi|arc|browser)")
        $isYouTube = [bool]($fgTitle -like "*YouTube*" -or $fgTitle -like "*youtube.com*")

        # Query session state
        if ($manager) {
            $session = $manager.GetCurrentSession()
        }
        
        if ($session) {
            $propsAsync = $session.TryGetMediaPropertiesAsync()
            $props = Await $propsAsync ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
            $info = $session.GetPlaybackInfo()
            $timeline = $session.GetTimelineProperties()

            $res = @{
                success = $true
                title = if ($props) { $props.Title } else { "" }
                artist = if ($props) { $props.Artist } else { "" }
                albumTitle = if ($props) { $props.AlbumTitle } else { "" }
                source = $session.SourceAppUserModelId
                status = if ($info) { $info.PlaybackStatus.ToString() } else { "Unknown" }
                position = if ($timeline) { [Math]::Round($timeline.Position.TotalSeconds, 1) } else { 0 }
                duration = if ($timeline) { [Math]::Round($timeline.EndTime.TotalSeconds, 1) } else { 0 }
                fgProcess = $fgProc
                fgTitle = $fgTitle
                isDesktop = [bool]$isDesktop
                isBrowser = [bool]$isBrowser
                isYouTube = [bool]$isYouTube
            }
            [Console]::WriteLine(($res | ConvertTo-Json -Compress))
        } else {
            $res = @{
                success = $false
                message = "No active media session"
                status = "Stopped"
                fgProcess = $fgProc
                fgTitle = $fgTitle
                isDesktop = [bool]$isDesktop
                isBrowser = [bool]$isBrowser
                isYouTube = [bool]$isYouTube
            }
            [Console]::WriteLine(($res | ConvertTo-Json -Compress))
        }
    } catch {
        $res = @{
            success = $false
            error = $_.Exception.Message
        }
        [Console]::WriteLine(($res | ConvertTo-Json -Compress))
    }
}
