@echo off
REM run-prod.bat - Loads .env (if present) and starts a production build + server
REM Usage: open PowerShell or cmd, cd to repo root and run: run-prod.bat

SETLOCAL

REM If a .env file exists, import its key=value pairs into the environment for this session.
IF EXIST ".env" (
  echo Loading environment variables from .env
  powershell -NoProfile -Command "Get-Content -Raw '.env' | Foreach-Object { $_ -split '\r?\n' } | ForEach-Object { if ($_ -and -not ($_ -match '^\s*#')) { $p = $_ -split '=',2; if ($p.Length -eq 2) { setx.exe $p[0] $p[1] /M > $null 2>&1 } } }"
  REM setx writes to machine/user environment — we also set them in-process for this shell
  for /f "usebackq tokens=* delims=" %%L in (`powershell -NoProfile -Command "Get-Content -Raw '.env' | Out-String"`) do (
    for /f "tokens=1* delims==" %%A in ("%%L") do (
      if not "%%A"=="" (
        set "%%A=%%B"
      )
    )
  )
) ELSE (
  echo No .env found — ensure required environment variables are set.
)

echo Installing dependencies (skip if already installed)...
pnpm install --frozen-lockfile

echo Building production assets...
pnpm run build
IF %ERRORLEVEL% NEQ 0 (
  echo Build failed with code %ERRORLEVEL% && EXIT /B %ERRORLEVEL%
)

echo Starting production server...
pnpm run start

ENDLOCAL

echo Server exited with code %ERRORLEVEL%
pause

@echo off
REM run-prod.bat - sets environment variables for production and starts the app
REM Edit the variables below before running in a non-dev environment.

REM ---------- Required environment variables ----------
SET VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
SET DYNAMODB_TABLE_NAME=aolfclub-entities
SET AWS_REGION=us-east-1
SET AUTH_SECRET=replace-with-32+char-secret
SET AUTH_URL=https://your-auth-domain.example.com
SET GITHUB_CLIENT_ID=your-github-client-id
SET GITHUB_CLIENT_SECRET=your-github-client-secret

REM ---------- Optional (local/test) ----------
REM If you're running a local DynamoDB instance, set DYNAMODB_ENDPOINT and credentials.
REM For production using AWS IAM roles, omit these and the SDK will use the role.
REM Uncomment and edit if using DynamoDB local:
REM SET DYNAMODB_ENDPOINT=http://localhost:8000
REM SET AWS_ACCESS_KEY_ID=local
REM SET AWS_SECRET_ACCESS_KEY=local

REM ---------- Start the app ----------



pause
necho Server exited with code %ERRORLEVEL%pnpm run startnecho Starting production server...