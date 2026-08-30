# 06｜API設計

## 共通仕様

- Base URL：`/api/v1`
- 認証：Supabase JWT Bearer
- データ形式：JSON
- 緯度経度、希望時間、列挙値はサーバー側で検証する
- 外部APIにはtimeoutと限定的なretryを設定する
- リクエストIDを付与して処理を追跡可能にする

## エンドポイント

### `POST /routes/preview`

Phase 1の条件入力から固定経由地の周回ルートを取得する検証用エンドポイントです。

```json
{
  "origin": {
    "latitude": 35.6812,
    "longitude": 139.7671
  },
  "target_duration_minutes": 45,
  "difficulty": "standard",
  "avoid": {
    "tolls": true,
    "highways": true
  }
}
```

- `target_duration_minutes` は `30`、`45`、`60` のいずれかとする
- `difficulty` は `easy`、`standard`、`challenge` のいずれかとする
- `avoid.tolls` と `avoid.highways` はGoogle Routes APIの回避条件へ反映する
- 希望時間と難易度は経路計画へ受け渡すが、固定経由地の形状にはまだ反映しない
- 不正な座標、列挙値、回避条件には `422` を返す

レスポンスは地図表示用の `coordinates` とGoogle Maps引き渡し用の
`google_maps_url` を返します。このエンドポイントは候補生成の実装後に
`POST /routes/generate` へ統合する想定です。

### `POST /routes/generate`

周回ルート候補を生成します。

```json
{
  "origin": {
    "latitude": 35.6812,
    "longitude": 139.7671
  },
  "target_duration_minutes": 30,
  "difficulty": "standard",
  "waypoints": [],
  "avoid": {
    "highways": true,
    "tolls": true,
    "ferries": true
  },
  "candidate_count": 3
}
```

レスポンスには以下を含めます。

- `route_id`
- 出発地、経由地、目的地
- encoded polyline
- 所要時間と距離
- 練習難易度
- 抽出した特徴量
- 評価理由と注意点

### `POST /routes/{route_id}/evaluate`

保存済みルートを指定バージョンのルールで再評価します。通常は`generate`内部で評価するため、管理・検証用途とします。

### `GET /routes/{route_id}`

ルート詳細を取得します。

### `POST /routes/{route_id}/save`

ルートをお気に入りへ保存します。

### `DELETE /routes/{route_id}/save`

ルートの保存を解除します。

### `GET /saved-routes`

本人の保存ルートをページングして取得します。

### `POST /driving-sessions`

走行開始前に運転セッションを作成します。二重作成を防ぐため、idempotency keyの利用を検討します。

### `PATCH /driving-sessions/{session_id}`

終了時刻、自己評価、メモを更新します。

### `GET /driving-sessions`

本人の運転履歴をページングして取得します。

### `GET /me/preferences`

本人の既定設定を取得します。

### `PUT /me/preferences`

既定の希望時間や回避条件を更新します。

## エラー形式

```json
{
  "error": {
    "code": "ROUTE_CANDIDATES_NOT_FOUND",
    "message": "条件に合うルートが見つかりませんでした",
    "retryable": true,
    "suggestions": [
      "希望時間を広げる",
      "回避条件を減らす"
    ]
  }
}
```

エラーコードはクライアント側で分岐可能な安定した値とし、表示文言とは分離します。

## スコアリング例

- 右折0〜3回：加点なし
- 右折4〜7回：`+1`
- 右折8回以上：`+2`
- 高速道路あり：`+3`
- 操作回数が多い：`+1`
- 希望時間との差が大きい：候補順位を下げる

最終スコアを1〜5へ正規化します。閾値と重みには`scoring_version`を付与し、同じ特徴量から同じ結果を再現できるようにします。

このルールは初期案であり、実走テスト前に確定しません。

## 非機能要件

- 外部APIのtimeoutと限定的なretry
- セッション作成時のidempotency
- リクエストIDによる追跡
- ユーザー単位のrate limit
- 座標や個人情報をログへ不用意に残さない
- 外部APIの失敗を内部エラー形式へ変換する

## 未決事項

- 認証前のルート生成を許可するか
- ページング方式（cursor / offset）
- APIバージョンと`scoring_version`の互換性方針
- 生成リクエストの最大時間と最大候補数
- APIレスポンスの正式なJSON Schema
