# ──────────────────────────────────────────────────────────────────────────────
#  JoinLerite — Setup & Launch Script
#  Verifica dependencias, instala se necessario, e inicia backend + frontend.
# ──────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Continue"
$ROOT = $PSScriptRoot
if (-not $ROOT) { $ROOT = Split-Path -Parent $MyInvocation.MyCommand.Definition }
$SERVER_DIR = Join-Path $ROOT "server"
$WEB_DIR    = Join-Path $ROOT "web"

# ── Helpers ───────────────────────────────────────────────────────────────────
function Write-Step { param($msg) Write-Host "`n[*] $msg" -ForegroundColor Cyan }
function Write-Ok   { param($msg) Write-Host "    [OK] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "    [!] $msg" -ForegroundColor Yellow }
function Write-Err  { param($msg) Write-Host "    [X] $msg" -ForegroundColor Red }

function Wait-AndExit {
    param([int]$code = 1)
    Write-Host ""
    Write-Host "Pressione Enter para fechar..." -ForegroundColor Yellow
    [void][System.Console]::ReadLine()
    exit $code
}

# ══════════════════════════════════════════════════════════════════════════════
#  1. Verificar pre-requisitos (Python e Node.js)
# ══════════════════════════════════════════════════════════════════════════════
Write-Step "Verificando pre-requisitos..."

# ── Python ────────────────────────────────────────────────────────────────────
$pythonPath = $null
foreach ($cmd in @("python", "python3", "py")) {
    try {
        $p = Get-Command $cmd -ErrorAction Stop
        $ver = & $p.Source --version 2>&1
        if ($ver -match "Python\s+3") {
            $pythonPath = $p.Source
            break
        }
    } catch { }
}

if (-not $pythonPath) {
    Write-Err "Python 3 nao encontrado. Instale em https://python.org"
    Wait-AndExit 1
}
Write-Ok "Python: $(& $pythonPath --version 2>&1)  [$pythonPath]"

# ── Node.js / npm (usar cmd /c para .cmd) ────────────────────────────────────
try {
    $nodeVer = cmd /c "node --version" 2>&1
    if ($LASTEXITCODE -ne 0) { throw "node falhou" }
    Write-Ok "Node.js: $nodeVer"
} catch {
    Write-Err "Node.js nao encontrado. Instale em https://nodejs.org"
    Wait-AndExit 1
}

try {
    $npmVer = cmd /c "npm --version" 2>&1
    if ($LASTEXITCODE -ne 0) { throw "npm falhou" }
    Write-Ok "npm: v$npmVer"
} catch {
    Write-Err "npm nao encontrado. Reinstale o Node.js."
    Wait-AndExit 1
}

# ══════════════════════════════════════════════════════════════════════════════
#  2. Dependencias Python (server/)
# ══════════════════════════════════════════════════════════════════════════════
Write-Step "Verificando dependencias Python (server/)..."

$pipPackages = @("pdfplumber", "flask", "flask_cors")
$missing = @()

foreach ($pkg in $pipPackages) {
    & $pythonPath -c "import $pkg" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Ok "$pkg"
    } else {
        Write-Warn "$pkg nao encontrado"
        $missing += $pkg
    }
}

if ($missing.Count -gt 0) {
    Write-Step "Instalando dependencias Python..."
    $reqFile = Join-Path $SERVER_DIR "requirements.txt"
    & $pythonPath -m pip install -r $reqFile --quiet
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Falha ao instalar dependencias Python."
        Wait-AndExit 1
    }
    Write-Ok "Dependencias Python instaladas."
} else {
    Write-Ok "Todas as dependencias Python ja estao instaladas."
}

# ══════════════════════════════════════════════════════════════════════════════
#  3. Dependencias Node.js (web/)
# ══════════════════════════════════════════════════════════════════════════════
Write-Step "Verificando dependencias Node.js (web/)..."

$nodeModules = Join-Path $WEB_DIR "node_modules"
if (Test-Path $nodeModules) {
    Write-Ok "node_modules existe."
} else {
    Write-Step "Instalando dependencias Node.js..."
    Push-Location $WEB_DIR
    cmd /c "npm install"
    $npmExitCode = $LASTEXITCODE
    Pop-Location
    if ($npmExitCode -ne 0) {
        Write-Err "Falha ao instalar dependencias Node.js."
        Wait-AndExit 1
    }
    Write-Ok "Dependencias Node.js instaladas."
}

# ══════════════════════════════════════════════════════════════════════════════
#  4. Iniciar servidores (usando Start-Process para processos reais do SO)
# ══════════════════════════════════════════════════════════════════════════════
$backendProc  = $null
$frontendProc = $null

try {
    Write-Step "Iniciando backend (Flask :5000)..."
    $backendProc = Start-Process -FilePath $pythonPath -ArgumentList "app.py" `
        -WorkingDirectory $SERVER_DIR -PassThru -WindowStyle Hidden
    Write-Ok "Backend iniciado (PID: $($backendProc.Id))"

    Write-Step "Iniciando frontend (Vite :3000)..."
    $frontendProc = Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c cd /d `"$WEB_DIR`" && npm run dev" `
        -PassThru -WindowStyle Hidden
    Write-Ok "Frontend iniciado (PID: $($frontendProc.Id))"

    # ── Aguardar servidores ficarem prontos ────────────────────────────────────
    Write-Step "Aguardando servidores ficarem prontos..."

    $maxWait = 5
    $elapsed = 0
    $backendReady  = $false
    $frontendReady = $false

    while ($elapsed -lt $maxWait -and (-not $backendReady -or -not $frontendReady)) {
        Start-Sleep -Seconds 1
        $elapsed++

        # Checar se os processos morreram
        if (-not $backendReady -and $backendProc.HasExited) {
            Write-Host ""
            Write-Err "Backend encerrou prematuramente (exit code: $($backendProc.ExitCode))"
            break
        }
        if (-not $frontendReady -and $frontendProc.HasExited) {
            Write-Host ""
            Write-Err "Frontend encerrou prematuramente (exit code: $($frontendProc.ExitCode))"
            break
        }

        $pending = @()
        if (-not $backendReady)  { $pending += "backend" }
        if (-not $frontendReady) { $pending += "frontend" }
        Write-Host "`r    Aguardando $($pending -join ', ')... ${elapsed}/${maxWait}s  " -NoNewline -ForegroundColor DarkGray

        if (-not $backendReady) {
            try {
                $null = Invoke-WebRequest -Uri "http://localhost:5000/api/files" -UseBasicParsing -TimeoutSec 1 -ErrorAction Stop
                $backendReady = $true
                Write-Host ""
                Write-Ok "Backend respondendo na porta 5000"
            } catch { }
        }

        if (-not $frontendReady) {
            try {
                $null = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 1 -ErrorAction Stop
                $frontendReady = $true
                Write-Host ""
                Write-Ok "Frontend respondendo na porta 3000"
            } catch { }
        }
    }

    Write-Host ""
    if (-not $backendReady)  { Write-Warn "Backend pode ainda estar carregando." }
    if (-not $frontendReady) { Write-Warn "Frontend pode ainda estar carregando." }

    # ── Abrir navegador ───────────────────────────────────────────────────────
    Write-Step "Abrindo navegador em http://localhost:3000 ..."
    Start-Process "http://localhost:3000"

    # ── Painel de controle ────────────────────────────────────────────────────
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Magenta
    Write-Host "  JoinLerite esta rodando!" -ForegroundColor Magenta
    Write-Host "  Frontend:  http://localhost:3000" -ForegroundColor Magenta
    Write-Host "  Backend:   http://localhost:5000" -ForegroundColor Magenta
    Write-Host "" -ForegroundColor Magenta
    Write-Host "  Comandos: 'close' para encerrar | 'status' para verificar" -ForegroundColor Yellow
    Write-Host "================================================================" -ForegroundColor Magenta
    Write-Host ""

    # ── Loop principal ────────────────────────────────────────────────────────
    while ($true) {
        $line = Read-Host "JoinLerite"
        $cmd = $line.Trim().ToLower()

        if ($cmd -eq "close" -or $cmd -eq "exit" -or $cmd -eq "quit" -or $cmd -eq "sair" -or $cmd -eq "fechar") {
            Write-Step "Encerrando projeto..."
            break
        }

        if ($cmd -eq "status") {
            $bs = if ($backendProc.HasExited)  { "PARADO (exit: $($backendProc.ExitCode))" } else { "Rodando (PID $($backendProc.Id))" }
            $fs = if ($frontendProc.HasExited) { "PARADO (exit: $($frontendProc.ExitCode))" } else { "Rodando (PID $($frontendProc.Id))" }
            Write-Host "  Backend:  $bs" -ForegroundColor Cyan
            Write-Host "  Frontend: $fs" -ForegroundColor Cyan
            continue
        }

        # Checar saude dos processos
        if ($backendProc.HasExited) {
            Write-Err "Backend encerrou inesperadamente."
            break
        }
        if ($frontendProc.HasExited) {
            Write-Err "Frontend encerrou inesperadamente."
            break
        }

        if ($cmd -ne "") {
            Write-Warn "Comando desconhecido. Use 'close' para sair ou 'status' para verificar."
        }
    }

} catch {
    Write-Host ""
    Write-Err "Erro inesperado: $_"
    Write-Host $_.ScriptStackTrace -ForegroundColor DarkGray
} finally {
    # ── Encerrar processos ────────────────────────────────────────────────────
    Write-Step "Encerrando servidores..."

    foreach ($proc in @($backendProc, $frontendProc)) {
        if ($proc -and -not $proc.HasExited) {
            try {
                # taskkill /T mata a arvore inteira de processos filhos
                & taskkill /PID $proc.Id /T /F 2>&1 | Out-Null
            } catch {
                try { $proc.Kill() } catch { }
            }
        }
    }

    # Limpar processos residuais nas portas
    Write-Host "    Limpando processos nas portas..." -ForegroundColor DarkGray
    foreach ($port in @(5000, 3000)) {
        try {
            $pids = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
                Select-Object -ExpandProperty OwningProcess -Unique
            foreach ($p in $pids) {
                Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
            }
        } catch { }
    }

    Write-Ok "Servidores encerrados. Ate mais!"
    Write-Host ""
    Write-Host "Pressione Enter para fechar..." -ForegroundColor Yellow
    [void][System.Console]::ReadLine()
}
