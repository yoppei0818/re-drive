# Re:Drive API

FastAPIで構築するRe:Driveのバックエンドです。Phase 0では、起動確認用のヘルスチェックとモバイル連携確認用の仮ルートを提供します。

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

## 仮の周回ルート

`POST /api/v1/routes/preview` に現在地を送ると、その地点を始点・終点とする固定形状の座標配列を返します。Google Routes APIにはまだ接続しません。

```json
{
  "origin": {
    "latitude": 35.6812,
    "longitude": 139.7671
  }
}
```

## 検証

```bash
pytest
ruff check .
```
