# 使用本机 Arduino AVR core 编译/链接，不上传、不修改 IDE 配置。
$ErrorActionPreference = 'Stop'
$packageRoot = Join-Path $env:USERPROFILE 'AppData\Local\Arduino15\packages\arduino'
$corePackage = Get-ChildItem (Join-Path $packageRoot 'hardware\avr') -Directory | Sort-Object Name -Descending | Select-Object -First 1
$compilerPackage = Get-ChildItem (Join-Path $packageRoot 'tools\avr-gcc') -Directory | Sort-Object Name -Descending | Select-Object -First 1
if (!$corePackage -or !$compilerPackage) { throw 'Install Arduino AVR Boards in Arduino IDE first.' }
$coreDir = Join-Path $corePackage.FullName 'cores\arduino'
$variantDir = Join-Path $corePackage.FullName 'variants\standard'
$spiDir = Join-Path $corePackage.FullName 'libraries\SPI\src'
$binDir = Join-Path $compilerPackage.FullName 'bin'
$buildDir = Join-Path $PSScriptRoot '.build'
New-Item -ItemType Directory -Force -Path $buildDir | Out-Null
$common = @('-Os','-g','-ffunction-sections','-fdata-sections','-flto','-mmcu=atmega328p','-DF_CPU=16000000L','-DARDUINO=10819','-DARDUINO_AVR_UNO','-DARDUINO_ARCH_AVR',"-I$coreDir","-I$variantDir","-I$spiDir","-I$PSScriptRoot")
$objects = @()
$sources = @(Get-ChildItem $coreDir -File | Where-Object { $_.Extension -in '.c','.cpp','.S' })
$sources += Get-Item (Join-Path $spiDir 'SPI.cpp')
$sources += Get-Item (Join-Path $PSScriptRoot 'InteractivePiano.ino')
foreach ($source in $sources) {
    $object = Join-Path $buildDir ($source.Name + '.o')
    $flags = $common + @('-c','-o',$object)
    if ($source.Extension -in '.cpp','.ino') {
        $compiler = Join-Path $binDir 'avr-g++.exe'
        $flags += @('-std=gnu++11','-fpermissive','-fno-exceptions','-fno-threadsafe-statics','-x','c++')
    } else {
        $compiler = Join-Path $binDir 'avr-gcc.exe'
        if ($source.Extension -eq '.S') { $flags += @('-x','assembler-with-cpp') }
        else { $flags += '-std=gnu11' }
    }
    & $compiler @flags $source.FullName
    if ($LASTEXITCODE -ne 0) { throw "Compilation failed: $($source.Name)" }
    $objects += $object
}
$elf = Join-Path $buildDir 'InteractivePiano.elf'
& (Join-Path $binDir 'avr-gcc.exe') '-Os' '-flto' '-fuse-linker-plugin' '-Wl,--gc-sections' '-mmcu=atmega328p' '-o' $elf @objects '-lm'
if ($LASTEXITCODE -ne 0) { throw 'Link failed.' }
& (Join-Path $binDir 'avr-size.exe') '-C' '--mcu=atmega328p' $elf
if ($LASTEXITCODE -ne 0) { throw 'Size check failed.' }
Write-Output 'UNO compilation and linking passed. No firmware was uploaded.'
