# Deploy Workflows

Dieses Projekt nutzt drei Deploy-Workflows:

- `deploy-review.yml`: PR auf `main` -> Dry-Run-Check, danach Review-Deploy + Smoke-Test
- `deploy-staging.yml`: gemergter PR auf `main` -> Staging-Deploy + Smoke-Test
- `deploy-production.yml`: manuell -> zuerst Staging-Check/Deploy, danach Production-Deploy

## Dry-Run

Alle manuellen Workflows haben den Input `dry_run`.

- `dry_run: true` -> nur SFTP-Check (kein Upload, kein Smoke-Test)
- `dry_run: false` -> normaler Deploy

## Required Secrets

- `STRATO_SFTP_HOST`
- `STRATO_SFTP_PORT`
- `STRATO_SFTP_USER`
- `STRATO_SFTP_PASSWORD`

## Required Variables

- `REVIEW_SFTP_PATH`
- `STAGING_SFTP_PATH`
- `PRODUCTION_SFTP_PATH`
- `REVIEW_SMOKE_TEST_URL`
- `STAGING_SMOKE_TEST_URL`
- `PRODUCTION_SMOKE_TEST_URL`
- `SMOKE_TEST_GREP`
