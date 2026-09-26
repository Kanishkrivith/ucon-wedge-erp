Add-Type -AssemblyName System.IO.Compression.FileSystem

function Read-DocxText($path) {
    Write-Host "=== $path ==="
    $zip = [System.IO.Compression.ZipFile]::OpenRead($path)
    $entry = $zip.GetEntry('word/document.xml')
    if ($entry) {
        $stream = $entry.Open()
        $reader = New-Object System.IO.StreamReader($stream)
        $text = $reader.ReadToEnd()
        $reader.Close()
        $stream.Close()
        # strip xml tags
        $clean = [System.Text.RegularExpressions.Regex]::Replace($text, "<[^>]+>", " ")
        Write-Host $clean
    }
    $zip.Dispose()
}

Read-DocxText "D:\Ucon Wedge Unit\all scan\Wedge_Manufacturing process.docx"
Read-DocxText "D:\Ucon Wedge Unit\all scan\Plan.docx"
