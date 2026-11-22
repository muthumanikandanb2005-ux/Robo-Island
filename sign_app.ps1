# Code Signing & Publisher Certificate Automation for Robo Island
param(
    [string]$ExePath = "C:\Users\muthu\.gemini\antigravity\scratch\dynamic-island-windows\dist\Robo Island-win32-x64\Robo Island.exe"
)

Write-Host "Creating Code Signing Certificate for Robo Island..."
$cert = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert | Where-Object { $_.Subject -like "*CN=Robo Island*" } | Select-Object -First 1

if (-not $cert) {
    $cert = New-SelfSignedCertificate `
        -Type CodeSigningCert `
        -Subject "CN=Robo Island, O=Robo Island" `
        -CertStoreLocation "Cert:\CurrentUser\My" `
        -NotAfter (Get-Date).AddYears(10)
}

$certFile = Join-Path $PSScriptRoot "RoboIsland.cer"
$pfxFile = Join-Path $PSScriptRoot "RoboIsland.pfx"

# Export public certificate
$certBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
[System.IO.File]::WriteAllBytes($certFile, $certBytes)

# Export PFX with empty password
$pfxBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Pfx, "")
[System.IO.File]::WriteAllBytes($pfxFile, $pfxBytes)

Write-Host "Registering into TrustedPublisher & TrustedPeople stores..."
$x509 = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($certFile)

# Add to TrustedPublisher (CurrentUser)
$pubStore = New-Object System.Security.Cryptography.X509Certificates.X509Store([System.Security.Cryptography.X509Certificates.StoreName]::TrustedPublisher, [System.Security.Cryptography.X509Certificates.StoreLocation]::CurrentUser)
$pubStore.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
$pubStore.Add($x509)
$pubStore.Close()

# Add to TrustedPeople (CurrentUser)
$peopleStore = New-Object System.Security.Cryptography.X509Certificates.X509Store([System.Security.Cryptography.X509Certificates.StoreName]::TrustedPeople, [System.Security.Cryptography.X509Certificates.StoreLocation]::CurrentUser)
$peopleStore.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
$peopleStore.Add($x509)
$peopleStore.Close()

# Sign the binary
if (Test-Path $ExePath) {
    Write-Host "Signing executable: $ExePath"
    $sig = Set-AuthenticodeSignature -FilePath $ExePath -Certificate $cert
    Write-Host "Signature Status: $($sig.Status)"
    Write-Host "Signer Subject: $($sig.SignerCertificate.Subject)"
    Write-Host "Verified Publisher: Robo Island"
} else {
    Write-Warning "Executable not found at $ExePath"
}
