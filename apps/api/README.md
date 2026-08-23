# Re:Drive API

FastAPIで構築するRe:Driveのバックエンドです。Phase 0では、起動確認用のヘルスチェックとGoogle Routes APIで生成するプレビュールートを提供します。

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

## 道路に沿ったプレビュー周回ルート

Google CloudでRoutes APIを有効にし、サーバー用APIキーを`.env`へ設定します。

```dotenv
GOOGLE_MAPS_API_KEY=your-server-side-api-key
```

`POST /api/v1/routes/preview` に現在地を送ると、固定方角・固定距離の経由地を使ってGoogle Routes APIで周回経路を計算し、道路に沿った座標配列を返します。

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
