# Quiz App

Eine responsive Quiz-App mit Bootstrap 5 und Vanilla JavaScript.

## Ueberblick

- Start-, Quiz- und Ergebnis-Screen
- Fragen werden aus JSON geladen
- Standard-Datei: `questions/questions.json`
- Eigene Fragen koennen per Dateiupload geladen werden
- Sound ist standardmaessig aus und kann per Icon ein-/ausgeschaltet werden
- Erfolgreicher JSON-Import wird als kurzes Bootstrap-Modal angezeigt

## Projektstruktur

- `index.html` - Layout und Bootstrap-Komponenten
- `style.css` - visuelles Finetuning
- `script.js` - Quiz-Logik, State, JSON-Validierung, Event-Handling
- `questions/` - Fragen-Dateien (`questions.json`, `questions-html.json`, `questions-css.json`, `questions-js.json`, `questions-php.json`)
- `img/`, `audio/` - Assets

## Schnellstart

1. Repository klonen
2. Im Projektordner einen lokalen Server starten
3. App im Browser oeffnen

Beispiel:

```bash
python -m http.server 8000
```

Dann aufrufen: `http://localhost:8000`

Hinweis: Bitte nicht per `file:///...` oeffnen, da sonst das Laden von JSON per `fetch()` blockiert sein kann.

## Fragenformat (JSON)

Es wird nur dieses Format unterstuetzt:

```json
[
  {
    "question": "Was ist HTML?",
    "answers": ["Programmiersprache", "Markup Language", "Datenbank", "Framework"],
    "correctIndex": 1
  }
]
```

Regeln:

- `question`: String
- `answers`: Array mit mindestens 2 Strings
- `correctIndex`: 0-basierter Index in `answers`

## Eigene Fragen laden

1. App starten
2. Im Start-Screen eine `.json` Datei auswaehlen
3. `Datei laden` klicken
4. Nach Erfolg erscheint ein kurzes Bootstrap-Modal
5. Mit `Quiz starten` das Quiz beginnen

## Standard-Fragen aendern

Die Default-Datei wird in `script.js` ueber `DEFAULT_QUESTIONS_URL` gesteuert.

Aktueller Wert:

```js
const DEFAULT_QUESTIONS_URL = "questions/questions.json";
```

## Technische Hinweise

- Keine Inline-`onclick` Handler, alles ueber `addEventListener`
- Strikte JSON-Validierung vor Uebernahme der Fragen
- Fehlerhafte JSON-Dateien werden als Alert angezeigt
- Fortschritt, Punkte und Ergebnis werden zentral im App-State verwaltet

## Troubleshooting

- JSON wird nicht geladen: Datei-Format und `correctIndex` pruefen
- Beim Start sind keine Fragen da: Pfad `questions/questions.json` und lokalen Server pruefen
- Kein Ton: Sound-Icon aktivieren (Sound ist standardmaessig aus)

## Deployment (GitHub Actions + Strato)

Workflow-Dateien:

- `.github/workflows/deploy-review.yml`
- `.github/workflows/deploy-staging.yml`
- `.github/workflows/deploy-production.yml`

Trigger:

- Review: bei PR/MR auf `main` (`opened`, `synchronize`, `reopened`)
- Staging: bei geschlossenem und gemergtem PR/MR auf `main`
- Production: nur manuell ueber `workflow_dispatch`

Ablauf:

1. PR auf `main`: zuerst automatischer Dry-Run (SFTP-Zielcheck), danach bei Erfolg Review-Deploy + Smoke-Test
2. Wird der PR gemerged und geschlossen, deployt der Workflow automatisch nach Staging (SFTP + Smoke-Test)
3. Wenn Staging passt, startest du `Deploy Production` manuell
4. Der Production-Workflow deployt zuerst erneut nach Staging (Sicherheitscheck)
5. Danach erfolgt der Deploy nach Production + Smoke-Test

Hinweis:

- Wenn du fuer das `production` Environment in GitHub Required Reviewers aktivierst, wird der letzte Schritt zusaetzlich manuell freigegeben.
- In Staging und Production wird vor jedem Upload automatisch ein SFTP-Pre-Check (Zielpfad/Verbindung) ausgefuehrt.
- Alle manuellen Deploy-Workflows haben den Input `dry_run`:
  - `dry_run: true` prueft nur SFTP-Verbindung + Zielpfad (kein Upload, kein Smoke-Test)
  - `dry_run: false` fuehrt den echten Deploy aus

Benötigte GitHub Secrets:

- `STRATO_SFTP_HOST`
- `STRATO_SFTP_PORT`
- `STRATO_SFTP_USER`
- `STRATO_SFTP_PASSWORD`

Benötigte GitHub Repository Variables:

- `REVIEW_SFTP_PATH`
- `STAGING_SFTP_PATH`
- `PRODUCTION_SFTP_PATH`
- `REVIEW_SMOKE_TEST_URL`
- `STAGING_SMOKE_TEST_URL`
- `PRODUCTION_SMOKE_TEST_URL`
- `SMOKE_TEST_GREP`
