#Requires -Version 5.1
<#
.SYNOPSIS
    Downloads the latest SVG icons from nvigneux/Helldivers-2-Stratagems-icons-svg
    and copies them to public/icons/ named by stratagem ID.

.DESCRIPTION
    Run this script from the repo root whenever the upstream icon repo is updated:
        .\scripts\update-icons.ps1

    The script will:
      1. Download the repo as a ZIP from GitHub (no git required)
      2. Extract it to a temp folder
      3. Copy every known icon to public/icons/<stratagem-id>.svg
      4. Report any icon files in the repo that are not yet mapped
      5. Report any stratagems in stratagems.json that have no icon mapped
#>

# ── Config ────────────────────────────────────────────────────────────────────
$repoZipUrl = "https://github.com/nvigneux/Helldivers-2-Stratagems-icons-svg/archive/refs/heads/master.zip"
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptRoot
$outDir = Join-Path $projectRoot "public\icons"
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) "hd2-icons-$([System.Guid]::NewGuid().ToString('N').Substring(0,8))"

# ── Icon filename → stratagem ID(s) mapping ───────────────────────────────────
# Key   : relative path inside the repo zip  (folder\filename.svg)
# Value : one or more stratagem IDs from stratagems.json
$map = [ordered]@{
    "Borderline Justice\Hover Pack.svg"                            = @("lift-860-hover-pack")
    "Bridge\Grenadier Battlement.svg"                              = @("egl-21-grenadier-battlement")
    "Bridge\HMG Emplacement.svg"                                   = @("emg-101-hmg-emplacement")
    "Bridge\Orbital EMS Strike.svg"                                = @("orbital-ems-strike")
    "Bridge\Orbital Gas Strike.svg"                                = @("orbital-gas-strike")
    "Bridge\Orbital Precision Strike.svg"                          = @("orbital-precision-strike")
    "Bridge\Orbital Smoke Strike.svg"                              = @("orbital-smoke-strike")
    "Bridge\Shield Generator Relay.svg"                            = @("fx-12-shield-generator-relay")
    "Bridge\Tesla Tower.svg"                                       = @("arc-3-tesla-tower")
    "Chemical Agents\Guard Dog Breath.svg"                         = @("axtx-13-dog-breath")
    "Chemical Agents\Sterilizer.svg"                               = @("tx-41-sterilizer")
    "Control Group\Epoch.svg"                                      = @("plas-45-epoch")
    "Control Group\Laser Sentry.svg"                               = @("alas-98-laser-sentry")
    "Control Group\Warp Pack.svg"                                  = @("lift-182-warp-pack")
    "Dust Devils\Expendable Napalm.svg"                            = @("eat-700-expendable-napalm")
    "Dust Devils\Solo Silo.svg"                                    = @("ms-11-solo-silo")
    "Dust Devils\Speargun.svg"                                     = @("s-11-speargun")
    "Engineering Bay\Anti-Personnel Minefield.svg"                 = @("md-6-anti-personnel-minefield")
    "Engineering Bay\Anti-Tank Mines.svg"                          = @("md-17-anti-tank-mines")
    "Engineering Bay\Arc Thrower.svg"                              = @("arc-3-arc-thrower")
    "Engineering Bay\Ballistic Shield Backpack.svg"                = @("sh-20-ballistic-shield-backpack")
    "Engineering Bay\Gas Mine.svg"                                 = @("md-8-gas-mines")
    "Engineering Bay\Grenade Launcher.svg"                         = @("gl-21-grenade-launcher")
    "Engineering Bay\Guard Dog Rover.svg"                          = @("axlas-5-rover")
    "Engineering Bay\Incendiary Mines.svg"                         = @("md-i4-incendiary-mines")
    "Engineering Bay\Laser Cannon.svg"                             = @("las-98-laser-cannon")
    "Engineering Bay\Quasar Cannon.svg"                            = @("las-99-quasar-cannon")
    "Engineering Bay\Shield Generator Pack.svg"                    = @("sh-32-shield-generator-pack")
    "Engineering Bay\Supply Pack.svg"                              = @("b-1-supply-pack")
    "Force of Law\GL-52 De-Escalator.svg"                          = @("gl-52-de-escalator")
    "Force of Law\Guard Dog K-9.svg"                               = @("axarc-3-k-9")
    "General Stratagems\Reinforce.svg"                             = @("reinforce")
    "General Stratagems\Resupply.svg"                              = @("resupply")
    "General Stratagems\SOS Beacon.svg"                            = @("sos-beacon")
    "Hangar\Eagle 110MM Rocket Pods.svg"                           = @("eagle-110mm-rocket-pods")
    "Hangar\Eagle 500KG Bomb.svg"                                  = @("eagle-500kg-bomb")
    "Hangar\Eagle Airstrike.svg"                                   = @("eagle-airstrike")
    "Hangar\Eagle Cluster Bomb.svg"                                = @("eagle-cluster-bomb")
    "Hangar\Eagle Napalm Airstrike.svg"                            = @("eagle-napalm-airstrike")
    "Hangar\Eagle Smoke Strike.svg"                                = @("eagle-smoke-strike")
    "Hangar\Eagle Strafing Run.svg"                                = @("eagle-strafing-run")
    "Hangar\Fast Recon Vehicle.svg"                                = @("m-102-fast-recon-vehicle")
    "Hangar\Jump Pack.svg"                                         = @("lift-850-jump-pack")
    "Masters of Ceremony\One True Flag.svg"                        = @("cqc-1-one-true-flag")
    "Orbital Cannons\Orbital 120MM HE Barrage.svg"                 = @("orbital-120mm-he-barrage")
    "Orbital Cannons\Orbital 380MM HE Barrage.svg"                 = @("orbital-380mm-he-barrage")
    "Orbital Cannons\Orbital Airburst Strike.svg"                  = @("orbital-airburst-strike")
    "Orbital Cannons\Orbital Gatling Barrage.svg"                  = @("orbital-gatling-barrage")
    "Orbital Cannons\Orbital Laser.svg"                            = @("orbital-laser")
    "Orbital Cannons\Orbital Napalm Barrage.svg"                   = @("orbital-napalm-barrage")
    "Orbital Cannons\Orbital Railcannon Strike.svg"                = @("orbital-railcannon-strike")
    "Orbital Cannons\Orbital Walking Barrage.svg"                  = @("orbital-walking-barrage")
    "Patriotic Administration Center\Airburst Rocket Launcher.svg" = @("rl-77-airburst-rocket-launcher")
    "Patriotic Administration Center\Anti-Materiel Rifle.svg"      = @("apw-1-anti-materiel-rifle")
    "Patriotic Administration Center\Autocannon.svg"               = @("ac-8-autocannon")
    "Patriotic Administration Center\Commando.svg"                 = @("mls-4x-commando")
    "Patriotic Administration Center\Expendable Anti-Tank.svg"     = @("eat-17-expendable-anti-tank", "eat-411-leveller")
    "Patriotic Administration Center\Flamethrower.svg"             = @("flam-40-flamethrower")
    "Patriotic Administration Center\Heavy Machine Gun.svg"        = @("mg-206-heavy-machine-gun")
    "Patriotic Administration Center\Machine Gun.svg"              = @("mg-43-machine-gun")
    "Patriotic Administration Center\Railgun.svg"                  = @("rs-422-railgun")
    "Patriotic Administration Center\Recoilless Rifle.svg"         = @("gr-8-recoilless-rifle")
    "Patriotic Administration Center\Spear.svg"                    = @("faf-14-spear")
    "Patriotic Administration Center\StA-X3 W.A.S.P. Launcher.svg" = @("sta-x3-wasp-launcher")
    "Patriotic Administration Center\Stalwart.svg"                 = @("m-105-stalwart")
    "Python Commandos\Defoliation Tool.svg"                        = @("cqc-9-defoliation-tool")
    "Python Commandos\Guard Dog Hot Dog.svg"                       = @("axflam-75-hot-dog")
    "Python Commandos\Maxigun.svg"                                 = @("m-1000-maxigun")
    "Redacted Regiment\C4 Pack.svg"                                = @("bmd-c4-pack")
    "Robotics Workshop\Autocannon Sentry.svg"                      = @("aac-8-autocannon-sentry")
    "Robotics Workshop\Emancipator Exosuit.svg"                    = @("exo-49-emancipator-exosuit")
    "Robotics Workshop\EMS Mortar Sentry.svg"                      = @("am-23-ems-mortar-sentry")
    "Robotics Workshop\Gatling Sentry.svg"                         = @("ag-16-gatling-sentry")
    "Robotics Workshop\Guard Dog.svg"                              = @("axar-23-guard-dog")
    "Robotics Workshop\Machine Gun Sentry.svg"                     = @("amg-43-machine-gun-sentry")
    "Robotics Workshop\Mortar Sentry.svg"                          = @("am-12-mortar-sentry")
    "Robotics Workshop\Patriot Exosuit.svg"                        = @("exo-45-patriot-exosuit")
    "Robotics Workshop\Rocket Sentry.svg"                          = @("amls-4x-rocket-sentry")
    "Servants of Freedom\Hellbomb Portable.svg"                    = @("b-100-portable-hellbomb")
    "Siege Breakers\Bastion MK XVI.svg"                            = @("td-220-bastion-mk-xvi")
    "Siege Breakers\CQC-20.svg"                                    = @("cqc-20-breaching-hammer")
    "Siege Breakers\EAT-411.svg"                                   = @("eat-411-leveller")
    "Siege Breakers\GL-28.svg"                                     = @("gl-28-belt-fed-grenade-launcher")
    "Urban Legends\Anti-Tank Emplacement.svg"                      = @("eat-12-anti-tank-emplacement")
    "Urban Legends\Directional Shield.svg"                         = @("sh-51-directional-shield")
    "Urban Legends\Flame Sentry.svg"                               = @("aflam-40-flame-sentry")
}

# ── Step 1: Download zip ──────────────────────────────────────────────────────
Write-Host "`n[1/4] Downloading icon repo..." -ForegroundColor Cyan
$zipPath = Join-Path $tempDir "icons.zip"
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

try {
    Invoke-WebRequest -Uri $repoZipUrl -OutFile $zipPath -UseBasicParsing
}
catch {
    Write-Error "Download failed: $_"
    exit 1
}
Write-Host "      Downloaded to $zipPath"

# ── Step 2: Extract zip ───────────────────────────────────────────────────────
Write-Host "[2/4] Extracting..." -ForegroundColor Cyan
$extractDir = Join-Path $tempDir "extracted"
Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force

# The zip contains a single root folder like "Helldivers-2-Stratagems-icons-svg-master"
$repoRoot = Get-ChildItem -Directory $extractDir | Select-Object -First 1 -ExpandProperty FullName
Write-Host "      Repo root: $repoRoot"

# ── Step 3: Copy mapped icons ─────────────────────────────────────────────────
Write-Host "[3/4] Copying icons to public/icons/..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$copied = 0
$notFound = @()

foreach ($entry in $map.GetEnumerator()) {
    # The key uses backslash; build the source path under the extracted repo root
    $srcFile = Join-Path $repoRoot $entry.Key
    if (Test-Path $srcFile) {
        foreach ($id in $entry.Value) {
            $dest = Join-Path $outDir "$id.svg"
            Copy-Item $srcFile $dest -Force
            $copied++
        }
    }
    else {
        $notFound += $entry.Key
    }
}

Write-Host "      Copied $copied icon(s) to $outDir"

# ── Step 4: Audit + auto-match ────────────────────────────────────────────────
Write-Host "[4/4] Auditing and auto-matching..." -ForegroundColor Cyan

# Load all stratagem IDs from stratagems.json
$stratagems = (Get-Content (Join-Path $projectRoot "data\stratagems.json") |
    ConvertFrom-Json).stratagems
$stratagemIds = $stratagems | Select-Object -ExpandProperty id

# Files in the repo not yet covered by the explicit $map
$allRepoSvgs = Get-ChildItem -Recurse $repoRoot -Filter "*.svg" |
ForEach-Object { $_.FullName.Substring($repoRoot.Length + 1) }

$mappedKeys = $map.Keys | ForEach-Object { $_ }
$unmappedRepo = $allRepoSvgs | Where-Object { $mappedKeys -notcontains $_ }

# Helper: normalise a string to kebab-case (same logic the IDs use)
function ConvertTo-KebabCase([string]$s) {
    $s = $s.ToLower()
    # Replace any run of non-alphanumeric characters with a hyphen
    $s = [System.Text.RegularExpressions.Regex]::Replace($s, '[^a-z0-9]+', '-')
    $s = $s.Trim('-')
    return $s
}

$autoMatched = @()
$stillUnmapped = @()

foreach ($relPath in $unmappedRepo) {
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($relPath)
    $candidate = ConvertTo-KebabCase $baseName

    # Try exact match first, then prefix/suffix/contains
    $matchedId = $stratagemIds | Where-Object { $_ -eq $candidate } | Select-Object -First 1
    if (-not $matchedId) {
        $matchedId = $stratagemIds | Where-Object { $_ -like "*$candidate*" -or $candidate -like "*$_*" } | Select-Object -First 1
    }

    if ($matchedId) {
        $srcFile = Join-Path $repoRoot $relPath
        $dest = Join-Path $outDir "$matchedId.svg"
        Copy-Item $srcFile $dest -Force
        $copied++
        $autoMatched += [PSCustomObject]@{ File = $relPath; Id = $matchedId }
    }
    else {
        $stillUnmapped += $relPath
    }
}

if ($autoMatched.Count -gt 0) {
    Write-Host "`n  [+] Auto-matched $($autoMatched.Count) new icon(s):" -ForegroundColor Green
    $autoMatched | ForEach-Object { Write-Host "      $($_.File)  ->  $($_.Id)" -ForegroundColor Green }
}

if ($stillUnmapped.Count -gt 0) {
    Write-Host "`n  [!] Repo SVGs not mapped and no auto-match found (manual entry in `$map needed):" -ForegroundColor Yellow
    $stillUnmapped | ForEach-Object { Write-Host "      $_" -ForegroundColor Yellow }
}

# Stratagems still without an icon after everything above
$noIcon = $stratagemIds | Where-Object { -not (Test-Path (Join-Path $outDir "$_.svg")) }

if ($noIcon.Count -gt 0) {
    Write-Host "`n  [!] Stratagems still missing an icon:" -ForegroundColor Yellow
    $noIcon | ForEach-Object { Write-Host "      $_" -ForegroundColor Yellow }
}
else {
    Write-Host "      All stratagems have an icon." -ForegroundColor Green
}

if ($notFound.Count -gt 0) {
    Write-Host "`n  [!] Mapped keys not found in downloaded repo:" -ForegroundColor Red
    $notFound | ForEach-Object { Write-Host "      $_" -ForegroundColor Red }
}

# ── Cleanup ───────────────────────────────────────────────────────────────────
Remove-Item -Recurse -Force $tempDir
Write-Host "`nDone. Temp files cleaned up." -ForegroundColor Green
