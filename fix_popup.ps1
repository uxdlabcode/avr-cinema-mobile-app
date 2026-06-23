$base = 'c:\Users\ashis\OneDrive\Documents\github\avr-cinema-mobile-app\src'
$files = @(
  'pages\HomePage\HomePage.tsx',
  'pages\HomePage\TrendNow.tsx',
  'pages\tvstreaming\TvDetails.tsx',
  'pages\tvstreaming\Episode.tsx',
  'pages\tvstreaming\DocumentaryList.tsx'
)
$old = 'w-[280px]'
$new = 'w-[340px]'
$old2 = 'line-clamp-3 leading-relaxed'
$new2 = 'line-clamp-4 leading-relaxed'

foreach ($f in $files) {
  $p = Join-Path $base $f
  $c = [System.IO.File]::ReadAllText($p)
  $c = $c.Replace($old, $new)
  $c = $c.Replace($old2, $new2)
  [System.IO.File]::WriteAllText($p, $c)
  Write-Host "Done: $f"
}
Write-Host "All files updated!"
