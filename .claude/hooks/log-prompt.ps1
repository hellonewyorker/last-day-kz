# Хук UserPromptSubmit: дописывает каждый промт с датой и временем в prompts-raw.log
# Claude Code передаёт на stdin JSON вида {"prompt": "...", "session_id": "...", ...}
# Ошибки не блокируют отправку промта — хук просто молча выходит.

try {
    $utf8 = New-Object System.Text.UTF8Encoding($false)

    # Читаем stdin именно как UTF-8, иначе кириллица и казахские буквы превратятся в «кракозябры»
    $reader = New-Object System.IO.StreamReader([Console]::OpenStandardInput(), $utf8)
    $raw = $reader.ReadToEnd()
    if (-not $raw) { exit 0 }

    $data = $raw | ConvertFrom-Json
    $prompt = [string]$data.prompt
    if (-not $prompt) { exit 0 }

    # Корень проекта: переменная от Claude Code или папка на два уровня выше скрипта
    $root = $env:CLAUDE_PROJECT_DIR
    if (-not $root) { $root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent }
    $log = Join-Path $root 'prompts-raw.log'

    $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $entry = "=== $stamp ===`r`n$($prompt.TrimEnd())`r`n`r`n"
    [System.IO.File]::AppendAllText($log, $entry, $utf8)
} catch {
    # не мешаем работе, если что-то пошло не так
}
exit 0
