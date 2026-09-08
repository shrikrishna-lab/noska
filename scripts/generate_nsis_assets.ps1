Add-Type -AssemblyName System.Drawing

$targetDir = "d:\company stuff\Noska V1.1\src-tauri\icons"
if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

# 1. Generate Sidebar (164x314)
$sideWidth = 164
$sideHeight = 314
$sideBmp = New-Object System.Drawing.Bitmap $sideWidth, $sideHeight
$g = [System.Drawing.Graphics]::FromImage($sideBmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Dark luxury background #0F1117
$bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 15, 17, 23))
$g.FillRectangle($bgBrush, 0, 0, $sideWidth, $sideHeight)

# Ambient glow at top #0066FF
$path1 = New-Object System.Drawing.Drawing2D.GraphicsPath
$path1.AddEllipse(10, -20, 144, 144)
$pbg1 = New-Object System.Drawing.Drawing2D.PathGradientBrush $path1
$pbg1.CenterColor = [System.Drawing.Color]::FromArgb(90, 0, 102, 255)
$pbg1.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 15, 17, 23))
$g.FillPath($pbg1, $path1)

# Ambient gold glow at bottom #E3CFB3
$path2 = New-Object System.Drawing.Drawing2D.GraphicsPath
$path2.AddEllipse(10, 180, 144, 144)
$pbg2 = New-Object System.Drawing.Drawing2D.PathGradientBrush $path2
$pbg2.CenterColor = [System.Drawing.Color]::FromArgb(40, 227, 207, 179)
$pbg2.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 15, 17, 23))
$g.FillPath($pbg2, $path2)

# Logo badge
$rect = New-Object System.Drawing.Rectangle 54, 75, 56, 56
$badgeBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.Point 0, 75), (New-Object System.Drawing.Point 0, 131), ([System.Drawing.Color]::FromArgb(255, 0, 102, 255)), ([System.Drawing.Color]::FromArgb(255, 0, 60, 180))
$g.FillRectangle($badgeBrush, $rect)
$borderPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(120, 255, 255, 255)), 1.5
$g.DrawRectangle($borderPen, $rect)

$fontFamily = New-Object System.Drawing.FontFamily 'Segoe UI'
$nFont = New-Object System.Drawing.Font ($fontFamily, [single]22, [System.Drawing.FontStyle]::Bold)
$nBrush = [System.Drawing.Brushes]::White
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$rectF = New-Object System.Drawing.RectangleF 54, 75, 56, 56
$g.DrawString('N', $nFont, $nBrush, $rectF, $sf)

# Title: Noska
$titleFont = New-Object System.Drawing.Font ($fontFamily, [single]15, [System.Drawing.FontStyle]::Bold)
$titleBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 237, 235, 229))
$titleRectF = New-Object System.Drawing.RectangleF 0, 145, 164, 30
$g.DrawString('Noska', $titleFont, $titleBrush, $titleRectF, $sf)

# Subtitle: AI Workspace
$subFont = New-Object System.Drawing.Font ($fontFamily, [single]8, [System.Drawing.FontStyle]::Regular)
$subBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 154, 152, 146))
$subRectF = New-Object System.Drawing.RectangleF 0, 172, 164, 20
$g.DrawString('AI WORKSPACE', $subFont, $subBrush, $subRectF, $sf)

# Clean bottom accent bar
$accentBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(120, 227, 207, 179))
$g.FillRectangle($accentBrush, 42, 290, 80, 2)

$sidebarPath = Join-Path $targetDir "nsis-sidebar.png"
$sideBmp.Save($sidebarPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$sideBmp.Dispose()

# 2. Generate Header (150x57)
$headWidth = 150
$headHeight = 57
$headBmp = New-Object System.Drawing.Bitmap $headWidth, $headHeight
$g2 = [System.Drawing.Graphics]::FromImage($headBmp)
$g2.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g2.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Header white/clean background
$g2.Clear([System.Drawing.Color]::White)

# Mini logo on right
$headRect = New-Object System.Drawing.Rectangle 102, 9, 38, 38
$headBadgeBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.Point 102, 9), (New-Object System.Drawing.Point 102, 47), ([System.Drawing.Color]::FromArgb(255, 0, 102, 255)), ([System.Drawing.Color]::FromArgb(255, 0, 60, 180))
$g2.FillRectangle($headBadgeBrush, $headRect)
$g2.DrawRectangle($borderPen, $headRect)

$headFont = New-Object System.Drawing.Font ($fontFamily, [single]16, [System.Drawing.FontStyle]::Bold)
$headRectF = New-Object System.Drawing.RectangleF 102, 9, 38, 38
$g2.DrawString('N', $headFont, $nBrush, $headRectF, $sf)

$headerPath = Join-Path $targetDir "nsis-header.png"
$headBmp.Save($headerPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g2.Dispose()
$headBmp.Dispose()

Write-Output "SUCCESS: Created $sidebarPath and $headerPath"
