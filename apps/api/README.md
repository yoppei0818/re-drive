# Re:Drive API

FastAPIで構築するRe:Driveのバックエンドです。Phase 0の初期構築では、起動確認用のヘルスチェックだけを提供します。

## セットアップ

```bash
cd apps/api
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e '.[dev]'
```

## 起動

```bash
uvicorn re_drive_api.main:app --reload --env-file .env
```

- APIドキュメント: <http://127.0.0.1:8000/docs>
- ヘルスチェック: <http://127.0.0.1:8000/api/v1/health>

## 検証

```bash
pytest
ruff check .
```
