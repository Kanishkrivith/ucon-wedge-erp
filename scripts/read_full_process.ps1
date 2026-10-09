Add-Type -AssemblyName System.IO.Compression.FileSystem

function Read-Docx-Full($path) {
    $zip = [System.IO.Compression.ZipFile]::OpenRead($path)
    $entry = $zip.GetEntry('word/document.xml')
    $stream = $entry.Open()
    $reader = New-Object System.IO.StreamReader($stream)
    $xml = $reader.ReadToEnd()
    $reader.Close()
    $zip.Dispose()
    $text = [System.Text.RegularExpressions.Regex]::Replace($xml, '<[^>]+>', ' ')
    $text = [System.Text.RegularExpressions.Regex]::Replace($text, '\s+', ' ')
    Write-Output ("=== " + $path + " ===")
    Write-Output $text
}

Read-Docx-Full 'D:\Ucon Wedge Unit\all scan\Wedge_Manufacturing process.docx'
