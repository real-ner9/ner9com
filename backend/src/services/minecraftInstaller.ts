import { minecraftServer } from './minecraft'

/**
 * The "Download" button on /minecraft: a Windows .bat that sets a player's TLauncher up for the
 * server. It installs the Fabric profile (shows up in TLauncher's version list), puts exactly
 * these mods into .minecraft\mods (other jars go to a backup folder) and adds the server to the
 * game's server list. Nothing is hosted here: files come from Mojang, Fabric and Modrinth and are
 * checked by SHA-1. Content mods must match the server's (/root/projects/minecraft on the VPS).
 */

const LOADER = '0.20.1'
const GAME = '1.21.1'
const PROFILE = `fabric-loader-${LOADER}-${GAME}`

const VANILLA_JSON =
  'https://piston-meta.mojang.com/v1/packages/82ba6501da174a665c1787775f946487422f2432/1.21.1.json'
const FABRIC_JSON = `https://meta.fabricmc.net/v2/versions/loader/${GAME}/${LOADER}/profile/json`

const MODS = [
  {
    file: 'fabric-api-0.116.17+1.21.1.jar',
    url: 'https://cdn.modrinth.com/data/P7dR8mSH/versions/Mys3P7lK/fabric-api-0.116.17%2B1.21.1.jar',
    sha1: '810b2b0195371a012906241d8b85a32a1d6de53c'
  },
  {
    file: 'sodium-fabric-0.8.13+mc1.21.1.jar',
    url: 'https://cdn.modrinth.com/data/AANobbMI/versions/SMxNOGZ6/sodium-fabric-0.8.13%2Bmc1.21.1.jar',
    sha1: '003c114c85ca88ef3362e018deb6aca0c682d6a1'
  },
  {
    file: 'lithium-fabric-0.15.4+mc1.21.1.jar',
    url: 'https://cdn.modrinth.com/data/gvQqBUqZ/versions/N08Z8wog/lithium-fabric-0.15.4%2Bmc1.21.1.jar',
    sha1: '7d82a004403b7780d4443d8e40361a55cfd0ae63'
  },
  {
    file: 'ferritecore-7.0.3-fabric.jar',
    url: 'https://cdn.modrinth.com/data/uXXizFIs/versions/sOzRw3CG/ferritecore-7.0.3-fabric.jar',
    sha1: 'a8a6a34fcda177da2828cedef44e0e538cf78aad'
  }
]

/** Names of the mods in the pack, for the page. */
export const packMods = () => MODS.map((mod) => mod.file.replace(/\.jar$/, ''))
export const packProfile = PROFILE

/** A PowerShell single-quoted string. */
const ps = (value: string) => `'${value.replace(/'/g, "''")}'`

// The .bat finds the "##PS" marker in itself and runs the rest as PowerShell, read as UTF-8 so
// the Russian messages survive; the marker is split on the command line so it only matches once.
const BAT_HEADER = `@echo off
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=[IO.File]::ReadAllText('%~f0',[Text.Encoding]::UTF8); & ([ScriptBlock]::Create($s.Substring($s.IndexOf('#'+'#PS'))))"
echo.
pause
exit /b
`

function script() {
  const { address } = minecraftServer()
  const mods = MODS.map(
    (mod) => `  @{ File = ${ps(mod.file)}; Url = ${ps(mod.url)}; Sha1 = ${ps(mod.sha1)} }`
  ).join("\n")
  return `##PS
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Version = ${ps(PROFILE)}
$Address = ${ps(address)}
$Mods = @(
${mods}
)

function Fail($text) { Write-Host ''; Write-Host $text -ForegroundColor Red; exit 1 }
function Get-File($url, $path) { Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $path }
function Sha1($path) { (Get-FileHash -Algorithm SHA1 -LiteralPath $path).Hash.ToLower() }

Write-Host 'Ставлю всё для сервера ner9 (Minecraft ${GAME}, Fabric)' -ForegroundColor Cyan
$mc = Join-Path $env:APPDATA '.minecraft'
if (-not (Test-Path $mc)) {
  Fail 'Не нашёл папку .minecraft. Установи TLauncher, запусти его один раз и открой этот файл снова.'
}

try {
  Write-Host '- профиль Fabric'
  $base = Join-Path $mc 'versions\\${GAME}'
  if (-not (Test-Path (Join-Path $base '${GAME}.json'))) {
    New-Item -ItemType Directory -Force $base | Out-Null
    Get-File ${ps(VANILLA_JSON)} (Join-Path $base '${GAME}.json')
  }
  $dir = Join-Path $mc "versions\\$Version"
  New-Item -ItemType Directory -Force $dir | Out-Null
  Get-File ${ps(FABRIC_JSON)} (Join-Path $dir "$Version.json")

  Write-Host '- моды'
  $modsDir = Join-Path $mc 'mods'
  New-Item -ItemType Directory -Force $modsDir | Out-Null
  $wanted = $Mods | ForEach-Object { $_.File }
  $others = Get-ChildItem -LiteralPath $modsDir -Filter *.jar | Where-Object { $wanted -notcontains $_.Name }
  if ($others) {
    $backup = Join-Path $mc ('mods-backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
    New-Item -ItemType Directory -Force $backup | Out-Null
    $others | Move-Item -Destination $backup
    Write-Host "  чужие моды перенёс в $backup"
  }
  foreach ($mod in $Mods) {
    $path = Join-Path $modsDir $mod.File
    if ((Test-Path $path) -and (Sha1 $path) -eq $mod.Sha1) { continue }
    Write-Host "  $($mod.File)"
    Get-File $mod.Url $path
    if ((Sha1 $path) -ne $mod.Sha1) { Remove-Item $path; Fail "Файл $($mod.File) скачался битым. Запусти установку ещё раз." }
  }
} catch {
  Fail "Не получилось скачать файлы: $($_.Exception.Message)"
}

# The server list is servers.dat: uncompressed NBT, a root compound with a "servers" list of
# compounds { name, ip }. The new entry goes at the end of that list.
function Nbt-String([string]$text) {
  $bytes = [Text.Encoding]::UTF8.GetBytes($text)
  [byte[]](@([byte](($bytes.Length -shr 8) -band 255), [byte]($bytes.Length -band 255)) + $bytes)
}
function Nbt-Entry {
  [byte[]](@(8) + (Nbt-String 'name') + (Nbt-String 'ner9') + @(8) + (Nbt-String 'ip') + (Nbt-String $Address) + @(0))
}
function Read-Int([byte[]]$b, [int]$i) { ([int]$b[$i] -shl 24) -bor ([int]$b[$i + 1] -shl 16) -bor ([int]$b[$i + 2] -shl 8) -bor [int]$b[$i + 3] }
function Skip-Payload([byte[]]$b, [int]$i, [int]$type) {
  switch ($type) {
    1 { return $i + 1 } 2 { return $i + 2 } 3 { return $i + 4 } 4 { return $i + 8 }
    5 { return $i + 4 } 6 { return $i + 8 }
    7 { return $i + 4 + (Read-Int $b $i) }
    8 { return $i + 2 + (([int]$b[$i] -shl 8) -bor [int]$b[$i + 1]) }
    9 {
      $inner = [int]$b[$i]; $count = Read-Int $b ($i + 1); $i += 5
      for ($n = 0; $n -lt $count; $n++) { $i = Skip-Payload $b $i $inner }
      return $i
    }
    10 {
      while ($b[$i] -ne 0) {
        $tag = [int]$b[$i]; $i += 1
        $i += 2 + (([int]$b[$i] -shl 8) -bor [int]$b[$i + 1])
        $i = Skip-Payload $b $i $tag
      }
      return $i + 1
    }
    11 { return $i + 4 + 4 * (Read-Int $b $i) }
    12 { return $i + 4 + 8 * (Read-Int $b $i) }
  }
  throw "unknown NBT tag $type"
}

function Add-Server {
  $file = Join-Path $mc 'servers.dat'
  $entry = Nbt-Entry
  if (-not (Test-Path $file)) {
    $list = [byte[]](@(9) + (Nbt-String 'servers') + @(10, 0, 0, 0, 1))
    [IO.File]::WriteAllBytes($file, [byte[]](@(10, 0, 0) + $list + $entry + @(0)))
    return
  }
  $b = [IO.File]::ReadAllBytes($file)
  if ([Text.Encoding]::UTF8.GetString($b).Contains($Address)) { return }
  if ($b[0] -ne 10) { throw 'servers.dat is not NBT' }
  Copy-Item $file "$file.bak" -Force
  $i = 3 + (([int]$b[1] -shl 8) -bor [int]$b[2])
  while ($b[$i] -ne 0) {
    $tag = [int]$b[$i]
    $nameLength = ([int]$b[$i + 1] -shl 8) -bor [int]$b[$i + 2]
    $name = [Text.Encoding]::UTF8.GetString($b, $i + 3, $nameLength)
    $payload = $i + 3 + $nameLength
    if ($tag -eq 9 -and $name -eq 'servers') {
      $inner = [int]$b[$payload]; $count = Read-Int $b ($payload + 1)
      if ($inner -ne 10 -and $count -gt 0) { throw 'unexpected servers list' }
      $end = Skip-Payload $b $payload 9
      $count += 1
      $head = [byte[]]@(10, (($count -shr 24) -band 255), (($count -shr 16) -band 255), (($count -shr 8) -band 255), ($count -band 255))
      $out = [byte[]]($b[0..($payload - 1)] + $head + $b[($payload + 5)..($end - 1)] + $entry + $b[$end..($b.Length - 1)])
      [IO.File]::WriteAllBytes($file, $out)
      return
    }
    $i = Skip-Payload $b $payload $tag
  }
  # No "servers" list yet: add one before the root's end.
  $list = [byte[]](@(9) + (Nbt-String 'servers') + @(10, 0, 0, 0, 1) + $entry)
  [IO.File]::WriteAllBytes($file, [byte[]]($b[0..($i - 1)] + $list + $b[$i..($b.Length - 1)]))
}

Write-Host '- сервер в списке серверов'
try { Add-Server } catch { Write-Host "  не вышло добавить сам, добавь вручную: $Address" -ForegroundColor Yellow }

Write-Host ''
Write-Host 'Готово!' -ForegroundColor Green
Write-Host "1. В TLauncher выбери версию $Version (если её нет в списке, возьми Fabric ${GAME})."
Write-Host "2. Нажми «Войти в игру», затем «Сетевая игра», сервер ner9 ($Address)."
Write-Host '3. При входе бот на ner9.com спросит в Telegram «Это ты?», нажми «Это я».'
`
}

/** The installer as served: CRLF line ends, which cmd.exe expects. */
export const installerBat = () => `${BAT_HEADER}${script()}`.replace(/\r?\n/g, '\r\n')
