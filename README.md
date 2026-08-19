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

## 想定するリポジトリ構成

```text
re-drive/
├── apps/
│   ├── mobile/       # React Native + Expo + TypeScript
│   └── api/          # FastAPI + Python
├── supabase/         # migration、RLSなど
├── docs/             # プロダクト・技術ドキュメント
└── README.md
```

アプリケーション資材は今後追加します。現時点では、実装の前提となる仕様と方針を`docs/`で管理します。

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
