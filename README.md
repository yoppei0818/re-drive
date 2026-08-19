# Re:Drive

<p align="center">
  <img src="docs/assets/re-drive-logo.png" alt="Re:Drive ロゴ" width="480">
</p>

> 久しぶりの運転を、ちょうどいい練習から。

Re:Driveは、ペーパードライバーが無理なく運転を再開するための、モバイル向け運転練習ルート提案アプリです。現在地、希望運転時間、避けたい道路などの条件から、出発地点へ戻る周回ルートを最大3案提案します。

## MVP

**現在地 + 運転時間 + 避けたい道路 → 難易度付き練習ルート3案**

- 運転前に条件を設定し、複数のルートを比較・選択する
- Google Maps Platformでルートを計算する
- 練習難易度を決定論的なルールで評価する
- 所要時間、距離、右左折などの特徴と注意点を表示する
- 実際のナビゲーションはGoogle Mapsアプリへ引き渡す

Re:Driveはルートの安全性を保証しません。「安全なルート」ではなく、ルートに含まれる操作の複雑さを「練習難易度」として提示します。また、運転中の操作を求めない設計を原則とします。

## 技術スタック

| 領域 | 採用候補 | 役割 |
| --- | --- | --- |
| Mobile | React Native + Expo + TypeScript | iOS / Androidアプリ |
| Backend | FastAPI + Python + Pydantic | ルート生成、評価、外部API連携 |
| Auth / DB | Supabase Auth + PostgreSQL | 認証、設定、保存、履歴 |
| Map | Google Maps Platform | Routes、Places、Geocoding |
| AI | OpenAI API または Amazon Bedrock | 評価理由・注意点の説明補助 |
| Navigation | Google Maps URLs | 外部ナビへの経路引き渡し |

AIによる説明生成はMVPコアの後に導入します。地理的事実はGoogle Maps Platform、難易度は決定論的ルール、説明はAIという責務分担を維持します。

## リポジトリ構成

```text
re-drive/
├── apps/
│   ├── mobile/       # React Native + Expo + TypeScript
│   └── api/          # FastAPI + Python
├── supabase/         # migration、RLSなど
├── docs/             # プロダクト・技術ドキュメント
└── README.md
```

MobileとAPIは、それぞれのディレクトリで依存関係と環境変数を管理します。SupabaseはPhase 2まで導入しません。

## 開発環境のセットアップ

前提：Node.js 20.19以上、Python 3.11以上、実機確認時はExpo Go。

### Mobile

```bash
cd apps/mobile
cp .env.example .env.local
npm install
npm start
```

### API

```bash
cd apps/api
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e '.[dev]'
uvicorn re_drive_api.main:app --reload --env-file .env
```

起動後は<http://127.0.0.1:8000/api/v1/health>でヘルスチェック、<http://127.0.0.1:8000/docs>でOpenAPIドキュメントを確認できます。

### 検証コマンド

```bash
npm --prefix apps/mobile run lint
npm --prefix apps/mobile run typecheck
apps/api/.venv/bin/pytest apps/api
apps/api/.venv/bin/ruff check apps/api
```

## ドキュメント

1. [企画概要・プロダクト方針](docs/01_企画概要・プロダクト方針.md)
2. [機能要件・MVPスコープ](docs/02_機能要件・MVPスコープ.md)
3. [技術スタック・選定理由](docs/03_技術スタック・選定理由.md)
4. [システム構成・処理フロー](docs/04_システム構成・処理フロー.md)
5. [DB設計](docs/05_DB設計.md)
6. [API設計](docs/06_API設計.md)
7. [実装ロードマップ](docs/07_実装ロードマップ.md)
8. [運用・安全・プライバシー方針](docs/08_運用・安全・プライバシー方針.md)
9. [画面設計・UI・UX](docs/09_画面設計・UI・UX.md)

## 開発順序

最初はPhase 0として、以下の技術検証を行います。

1. Expoで現在地を取得する
2. 地図に現在地とPolylineを表示する
3. FastAPIからGoogle Routes APIを呼ぶ
4. 固定の経由地を含む周回ルートをGoogle Mapsへ渡す
5. API利用量と概算コストを確認する

詳細は[実装ロードマップ](docs/07_実装ロードマップ.md)を参照してください。

## ドキュメントの位置づけ

企画や共有の入口は[Notionのプロジェクトページ](https://app.notion.com/p/3c147fcd2fdb802c9b52c562bfcfd36e)、実装と同期して更新する仕様はこのリポジトリの`docs/`を正とします。両者に差異が生じた場合は、実装に関する判断ではリポジトリ側のドキュメントを優先します。
