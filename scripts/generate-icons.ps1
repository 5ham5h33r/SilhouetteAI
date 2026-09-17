Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$iconDir = Join-Path $projectRoot 'extension\icons'
New-Item -ItemType Directory -Force -Path $iconDir | Out-Null

$source = New-Object System.Drawing.Bitmap 256, 256
$graphics = [System.Drawing.Graphics]::FromImage($source)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.Color]::Transparent)

$shield = New-Object System.Drawing.Drawing2D.GraphicsPath
$shield.AddBezier(28, 24, 82, 8, 174, 8, 228, 24)
$shield.AddLine(228, 24, 228, 116)
$shield.AddBezier(228, 116, 228, 178, 184, 226, 128, 246)
$shield.AddBezier(128, 246, 72, 226, 28, 178, 28, 116)
$shield.CloseFigure()

$shieldBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.Point 28, 20),
  (New-Object System.Drawing.Point 228, 236),
  ([System.Drawing.Color]::FromArgb(16, 185, 129)),
  ([System.Drawing.Color]::FromArgb(5, 150, 105))
)
$graphics.FillPath($shieldBrush, $shield)

$innerBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(15, 23, 42))
$graphics.FillEllipse($innerBrush, 76, 58, 104, 104)
$graphics.FillPie($innerBrush, 52, 128, 152, 132, 180, 180)

$highlightBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(236, 253, 245))
$graphics.FillEllipse($highlightBrush, 102, 82, 52, 52)
$graphics.FillPie($highlightBrush, 80, 144, 96, 80, 180, 180)

$graphics.Dispose()
$shield.Dispose()
$shieldBrush.Dispose()
$innerBrush.Dispose()
$highlightBrush.Dispose()

foreach ($size in 16, 48, 128) {
  $output = New-Object System.Drawing.Bitmap $size, $size
  $canvas = [System.Drawing.Graphics]::FromImage($output)
  $canvas.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $canvas.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $canvas.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $canvas.Clear([System.Drawing.Color]::Transparent)
  $canvas.DrawImage($source, 0, 0, $size, $size)
  $output.Save((Join-Path $iconDir "icon-$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $canvas.Dispose()
  $output.Dispose()
}

$source.Dispose()
Write-Output "Generated SilhouetteAI icons in $iconDir"
