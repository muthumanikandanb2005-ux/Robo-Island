try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    $asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { 
        $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' 
    }[0]

    Function Await($WinRtTask, $ResultType) {
        $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
        $netTask = $asTask.Invoke($null, @($WinRtTask))
        $netTask.Wait(-1) | Out-Null
        $netTask.Result
    }

    [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media, ContentType = WindowsRuntime] | Out-Null
    [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media, ContentType = WindowsRuntime] | Out-Null

    $asyncOp = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
    $manager = Await $asyncOp ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])

    $session = $manager.GetCurrentSession()
    if ($session) {
        $sourceAppId = $session.SourceAppUserModelId
        $propsAsync = $session.TryGetMediaPropertiesAsync()
        $props = Await $propsAsync ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
        $info = $session.GetPlaybackInfo()
        
        $result = @{
            success = $true
            title = $props.Title
            artist = $props.Artist
            albumTitle = $props.AlbumTitle
            source = $sourceAppId
            status = $info.PlaybackStatus.ToString()
        }
        $result | ConvertTo-Json
    } else {
        @{
            success = $false
            message = "No active media session"
        } | ConvertTo-Json
    }
} catch {
    @{
        success = $false
        error = $_.Exception.Message
    } | ConvertTo-Json
}
