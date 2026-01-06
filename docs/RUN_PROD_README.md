run-prod.bat - Usage

1. Edit the file `run-prod.bat` and replace placeholder values with your production values.
   - Do NOT commit secrets to version control.

2. (Optional) If you're using AWS IAM roles in production, remove `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` lines.

3. To run (Windows):

```powershell
cd path\to\aolf-club
.\run-prod.bat
```

4. The batch file runs `pnpm run start` which maps to `vinxi start` as defined in `package.json`.

Security notes:
- Keep secrets out of VCS; prefer using the hosting environment's secret manager (e.g., AWS Secrets Manager, Azure Key Vault).
- For CI/CD, inject secrets via environment configuration in your pipeline.

Troubleshooting:
- If the app fails because of missing env vars, inspect `src/server/config/index.ts` for required keys (AUTH_URL, AUTH_SECRET, GITHUB_CLIENT_ID/SECRET, etc.).
- To test locally, you can copy `.env.example` to `.env` and run locally with an env loader or set the variables in your shell.
