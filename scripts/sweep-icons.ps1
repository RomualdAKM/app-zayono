# ──────────────────────────────────────────────────────────────────────
# Sweep replace PrimeIcons usages with <AppIcon>.
#
# Why a script: 30+ files use icons in dozens of variations. A manual
# edit per file is error-prone and slow. This script handles the three
# most common patterns we ship in templates:
#
#   <i class="pi pi-NAME" />        → <AppIcon name="NAME" />
#   <i class="pi pi-NAME"></i>      → <AppIcon name="NAME" />
#   <i class="pi pi-NAME extra…">…  → unchanged (keeps the extra
#                                       classes, falls back to font)
#
# Dynamic bindings (`:class="['pi', someComputed]"`, ternaries, etc.)
# are deliberately left untouched. The wrapper still falls back to the
# PrimeIcons font for any name that isn't mapped in AppIcon.vue, so
# those cases keep rendering exactly as before.
#
# Run from frontend/:  powershell -ExecutionPolicy Bypass -File scripts/sweep-icons.ps1
# ──────────────────────────────────────────────────────────────────────

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$root = (Resolve-Path "$PSScriptRoot/..").Path
$targets = @(
    "$root\pages",
    "$root\components"
)

# The sidebar is already migrated by hand and uses a different idiom
# (`<component :is>` with imported references); skip it so we don't
# clobber the existing structure.
$excludePaths = @(
    "$root\components\layout\Sidebar.vue",
    "$root\components\AppIcon.vue"
)

# Four regex patterns — strict (exact class) and permissive (with extra
# classes), each in self-closing and explicit-close forms.
#
# The permissive variant uses a negative lookahead `(?!pi-)` to skip
# anything where the second class is ALSO a PrimeIcons name — that's
# the `pi pi-spin pi-spinner` shape where one class is the animation
# modifier and the other is the icon. Leaving those untouched preserves
# the existing spinner behaviour.
$patterns = @(
    @{
        Find    = '<i\s+class="pi\s+pi-([a-z][a-z0-9-]*)"\s*/>'
        Replace = '<AppIcon name="$1" />'
    },
    @{
        Find    = '<i\s+class="pi\s+pi-([a-z][a-z0-9-]*)"\s*></i>'
        Replace = '<AppIcon name="$1" />'
    },
    @{
        Find    = '<i\s+class="pi\s+pi-([a-z][a-z0-9-]*)\s+((?!pi-)[a-z][a-z0-9- ]*?)"\s*/>'
        Replace = '<AppIcon name="$1" class="$2" />'
    },
    @{
        Find    = '<i\s+class="pi\s+pi-([a-z][a-z0-9-]*)\s+((?!pi-)[a-z][a-z0-9- ]*?)"\s*></i>'
        Replace = '<AppIcon name="$1" class="$2" />'
    }
)

$changedCount = 0
$fileCount = 0

foreach ($target in $targets) {
    $files = Get-ChildItem -Path $target -Recurse -Filter '*.vue'
    foreach ($file in $files) {
        $path = $file.FullName
        if ($excludePaths -contains $path) { continue }

        # ReadAllText is the cross-PowerShell-version way to slurp a file
        # into a single string. `Get-Content -Raw` doesn't exist in older
        # PowerShell editions, and the line-array default would break our
        # multi-line regex matches.
        $content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
        if (-not $content) { continue }

        $original = $content
        # `$matches` is a PowerShell automatic variable populated by -match,
        # so we use $hitCount to avoid the collision that crashes the loop.
        $hitCount = 0
        foreach ($p in $patterns) {
            $matchesInThisPattern = [regex]::Matches($content, $p.Find).Count
            $hitCount += $matchesInThisPattern
            $content = [regex]::Replace($content, $p.Find, $p.Replace)
        }

        if ($content -ne $original) {
            $fileCount++
            $changedCount += $hitCount
            # WriteAllText, like ReadAllText, is cross-version-safe and
            # preserves the original line endings without appending the
            # trailing newline that `Set-Content -NoNewline` sometimes drops.
            [System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))
            Write-Host "  [$hitCount] $($path.Substring($root.Length + 1))"
        }
    }
}

Write-Host ""
Write-Host "Sweep complete: $changedCount icon replacements across $fileCount files." -ForegroundColor Green
