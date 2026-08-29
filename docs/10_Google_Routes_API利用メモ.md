# 10｜Google Routes API利用メモ

## この文書の目的

Phase 0の`POST /api/v1/routes/preview`で、現在の固定座標を実際の道路に沿った座標へ置き換えるための私用メモです。

この段階では、モバイルへ返す形式を次のまま維持します。

```json
{
  "coordinates": [
    { "latitude": 35.6812, "longitude": 139.7671 }
  ]
}
```

FastAPIがGoogle Routes APIを呼び、Googleから返るencoded polylineを復号して、この`coordinates`へ変換します。モバイルはGoogleのAPIキーやレスポンス形式を知りません。

## Routes APIとは

Google Maps Platformが提供する経路計算APIです。今回使う`Compute Routes`は、出発地・目的地・任意の経由地から経路を計算し、距離、所要時間、道路に沿った線、案内単位などを返します。

もう一つの`Compute Route Matrix`は、複数の出発地と目的地の組み合わせについて距離・時間を比較するものです。Phase 0の1本の周回ルート生成には不要です。

役割分担は次のとおりです。

- Google Routes API：走行可能な道路に沿った経路を計算する
- Re:Drive API：経由地を決め、Googleの結果をアプリ用の形式へ変換する
- 将来のRe:Drive評価処理：右左折や道路特性などから運転しやすさを評価する

Routes API自体が「ペーパードライバー向け」と判定してくれるわけではありません。

## Route / Leg / Step / Polyline

- `Route`：出発地から目的地までの経路全体。候補経路を比較する単位
- `Leg`：出発地、経由地、目的地など、停止地点間の区間
- `Step`：右左折や直進など、ナビゲーション案内に近い単位
- `Polyline`：経路が地図上で通る形を表す点列

構造のイメージは次のとおりです。

```text
Route
├── Polyline（ルート全体の形）
└── Leg（地点間の区間）
    └── Step（案内・操作の単位）
        └── Polyline（Stepの形）
```

Phase 0の地図描画で必要なのは、まず`Route`全体の`polyline.encodedPolyline`だけです。将来、右左折などを評価するときに`legs.steps`を追加取得します。

## Encoded Polylineとは

緯度・経度の点列を短い文字列へ圧縮した形式です。前の点との差分を使う非可逆圧縮で、通常は小数点以下5桁相当の精度を扱います。

```text
Routes API
  → encodedPolyline（文字列）
  → FastAPIで復号
  → [{ latitude, longitude }, ...]
  → モバイルでPolyline表示
```

Pythonでは実績のあるPolylineライブラリを使うか、Googleのアルゴリズム仕様に沿った小さな復号処理を持ちます。独自実装する場合は、負数、文字列中のバックスラッシュ、壊れた入力、空の結果をテストします。

## 今回の周回ルートの作り方

Routes APIは、希望時間だけを渡して自動的に周回ルートを作るAPIではありません。Re:Drive側で現在地を基準に経由地を作ります。

Phase 0では次の単純な方式で十分です。

1. 現在地を`origin`と`destination`の両方にする
2. 現在地から固定距離・固定方角に2〜3個の経由地を作る
3. 経由地を`intermediates`として順番に渡す
4. `travelMode`は`DRIVE`にする
5. 高速道路・有料道路・フェリーは可能な範囲で回避する

緯度1度と経度1度の距離は場所によって異なるため、単純な緯度経度加算は「固定距離」の生成としては不正確です。方位角と距離から球面上の到達点を計算する方法にすると、場所が変わっても経由地の大きさを揃えやすくなります。

注意点：

- 経由地は最寄りの走行可能な道路へスナップされる
- `avoidHighways`などは絶対禁止ではなく、合理的な範囲で避ける指定
- 海、山、私有地付近では経路が作れない、または大きく迂回する場合がある
- 経由地を増やすほど不自然な経路や料金区分の変化に注意が必要
- Phase 0では同じ入力から同じ経由地を作り、再現しやすくする

通常の中間地点は停止地点としてLegを分割します。通過点として扱う`via: true`もありますが、Phase 0ではレスポンスのLegを利用しないため、まず通常の中間地点で単純に実装します。

## Compute Routesのリクエスト

エンドポイントは次のREST APIです。

```text
POST https://routes.googleapis.com/directions/v2:computeRoutes
```

ヘッダー：

```http
Content-Type: application/json
X-Goog-Api-Key: <server-side API key>
X-Goog-FieldMask: routes.polyline.encodedPolyline
```

リクエスト例：

```json
{
  "origin": {
    "location": {
      "latLng": {
        "latitude": 35.6812,
        "longitude": 139.7671
      }
    }
  },
  "destination": {
    "location": {
      "latLng": {
        "latitude": 35.6812,
        "longitude": 139.7671
      }
    }
  },
  "intermediates": [
    {
      "location": {
        "latLng": {
          "latitude": 35.6912,
          "longitude": 139.7771
        }
      }
    }
  ],
  "travelMode": "DRIVE",
  "routingPreference": "TRAFFIC_UNAWARE",
  "computeAlternativeRoutes": false,
  "routeModifiers": {
    "avoidTolls": true,
    "avoidHighways": true,
    "avoidFerries": true
  },
  "polylineQuality": "HIGH_QUALITY",
  "polylineEncoding": "ENCODED_POLYLINE",
  "languageCode": "ja",
  "units": "METRIC"
}
```

`X-Goog-FieldMask`は必須です。必要なフィールドだけを列挙し、`*`は開発時の確認以外では使いません。Phase 0ではPolylineだけを要求し、距離や所要時間が必要になった時点で`routes.distanceMeters`や`routes.duration`を追加します。

## レスポンスの扱い

最小レスポンスのイメージ：

```json
{
  "routes": [
    {
      "polyline": {
        "encodedPolyline": "..."
      }
    }
  ]
}
```

FastAPIでは次を検証します。

- `routes`が存在し、1件以上ある
- 先頭Routeに`polyline.encodedPolyline`がある
- Polylineを1点以上の座標へ復号できる
- 復号後の緯度が`-90..90`、経度が`-180..180`に収まる

Googleのレスポンスをそのままモバイルへ透過せず、既存のPydanticモデル`PreviewRouteResponse`へ詰め替えます。これにより外部APIの変更をFastAPI内へ閉じ込められます。

## 設定とAPIキー

Google Cloud側では、プロジェクトへ請求先を設定し、Routes APIを有効化してAPIキーを作成します。

ローカルでは`apps/api/.env`に保存します。

```dotenv
GOOGLE_MAPS_API_KEY=...
```

守ること：

- `.env`をGitへコミットしない
- モバイルの`EXPO_PUBLIC_`変数へ入れない
- APIキーをログや例外レスポンスへ含めない
- Routes APIだけを許可するAPI制限を設定する
- デプロイ先が固定送信元IPを持つ場合は、IPアドレス制限も設定する
- モバイル用Maps SDKのキーとは分ける
- 不正利用を早期検知するため、割り当て、予算、アラートを設定する

サーバー間通信ではAPIキーを`X-Goog-Api-Key`ヘッダーへ設定し、HTTPSだけを使用します。

## タイムアウト・エラー・リトライ

外部APIは成功を前提にしません。最低限、次を区別します。

| 事象 | FastAPIでの扱い | リトライ |
| --- | --- | --- |
| 接続失敗・タイムアウト | 外部サービス一時障害 | 少数回のみ候補 |
| Googleの`429` | 割り当て超過・レート制限 | `Retry-After`を尊重し限定的に |
| Googleの`5xx` | 外部サービス一時障害 | exponential backoffで限定的に |
| Googleの`400` | リクエストまたは経由地生成の不備 | 原則しない |
| Googleの`401`/`403` | APIキー、API有効化、制限の設定不備 | しない |
| `routes`が空 | その地点・条件で経路なし | 同じ条件ではしない |
| 不正なPolyline | 外部レスポンス変換失敗 | 原則しない |

実装上の方針：

- HTTPクライアントに明示的な接続・読み取りタイムアウトを設定する
- ユーザーを長く待たせない短い総時間上限を設ける
- retryはタイムアウト、`429`、一部`5xx`だけに絞る
- 複数層でretryしてリクエスト数を増幅させない
- 外部の詳細エラーやAPIキーをクライアントへ返さない
- ログには内部リクエストID、GoogleのHTTPステータス、処理時間を残す
- 正確な現在地や完全なPolylineを通常ログへ残さない

Phase 0では、モバイルの既存実装を壊さない範囲で、FastAPIの`502 Bad Gateway`または`504 Gateway Timeout`へ変換するのが分かりやすいです。将来、共通エラー形式を実装するときに安定したエラーコードへ置き換えます。

## 課金と利用量

Routes APIは従量課金です。2026年8月時点の公式価格表では、`Compute Routes Essentials`は月10,000回の無料利用枠があり、その後の最初の100,000回までは1,000回あたり5米ドルです。価格や無料枠は変更され得るため、実装時・公開前に公式価格表を再確認します。

今回のPhase 0では`TRAFFIC_UNAWARE`と基本機能に留め、Essentialsを意図します。`TRAFFIC_AWARE`、`TRAFFIC_AWARE_OPTIMAL`などの高度な機能は上位SKUを発生させます。フィールドを増やすだけでなく、指定する機能がどのSKUを発生させるか確認が必要です。

コスト管理：

- 開発用と本番用のGoogle Cloudプロジェクトまたはキーを分ける
- 1ユーザー操作あたりの外部API呼び出し回数を把握する
- FastAPI側でrate limitを設ける
- Google Cloudで日次割り当て、予算、アラートを設定する
- retry分も呼び出し回数へ含めて見積もる

## テスト方針

自動テストでは実際のGoogle APIを呼びません。HTTPクライアントを差し替え、次を確認します。

- 正しいURL、ヘッダー、リクエストJSONを送る
- APIキーをヘッダーへ設定する
- encoded polylineを既存の`coordinates`形式へ変換する
- 正常な周回経路で先頭付近と末尾付近が現在地になる
- タイムアウトを`504`へ変換する
- Googleの`4xx`、`5xx`、空Route、不正Polylineを適切なエラーへ変換する
- APIキー未設定時に起動時または呼び出し時に明確に失敗する
- エラーレスポンスへAPIキーやGoogleの生レスポンスを含めない

実機確認では次を確認します。

1. Google CloudでRoutes APIと請求を有効にする
2. `apps/api/.env`へ制限済みAPIキーを設定する
3. FastAPIを実機から到達可能なアドレスで起動する
4. 現在地からプレビューを生成する
5. Polylineが直線ではなく道路に沿っていることを確認する
6. 出発地点付近へ戻る周回になっていることを確認する
7. 高速道路・有料道路・フェリー回避が期待どおりか確認する
8. APIキー無効、通信断、タイムアウト時のモバイル表示を確認する

## 今回の実装順

1. 設定クラスで`GOOGLE_MAPS_API_KEY`とタイムアウトを読む
2. 現在地から決定的な固定経由地を生成する
3. Routes APIクライアントを`main.py`から分離して作る
4. `Compute Routes`を非同期HTTPクライアントで呼ぶ
5. encoded polylineを復号する
6. `PreviewRouteResponse.coordinates`へ変換する
7. 外部API例外をFastAPIのHTTPエラーへ変換する
8. モックを使ったユニット・APIテストを追加する
9. lint、ruff、pytestを実行する
10. 制限済みの実キーで実機確認する

## 次のStepとの境界

次の「Maps URLでGoogle Mapsへ経路を渡す」では、Google Maps URLの`origin`、`destination`、`waypoints`、`travelmode=driving`などを組み立てます。

Routes APIが返したencoded polylineをMaps URLへ直接渡すのではなく、Routes APIへ渡した出発地・経由地・目的地をGoogle Maps URLへ再利用する設計が基本です。同じ地点を渡しても、Google Mapsアプリ側の計算時刻や設定によって完全に同一の経路になる保証はない点に注意します。

### Maps URL連携の初期方針

Maps URLにはRoutes APIから取得したencoded polylineを直接渡せません。`PreviewRoutePlan`の出発地・3つの経由地・目的地を同じ順番で渡し、Google Maps側で経路を再計算します。

初期の保証範囲は「同じ経由地点を同じ順番で通る、概ね同じ周回ルート」とし、アプリ内Polylineとの完全一致は保証しません。モバイルでは次の注意書きをGoogle Maps起動ボタン付近へ表示します。

```text
交通状況などにより、Google Mapsで表示される経路が一部異なる場合があります。
```

差が生じる主な要因は次のとおりです。

- Re:DriveのPhase 0では`TRAFFIC_UNAWARE`を使用している
- Google Mapsは起動時の交通状況を考慮して経路を再計算する
- Google Maps側のユーザー設定や道路情報更新が影響する
- 緯度経度の地点が別の道路位置へスナップされる場合がある
- 起動後や走行中にGoogle Mapsが経路を再計算する場合がある

### 実機で比較する項目

- 全体の周回方向
- 通過する主要道路
- 大きな迂回の有無
- 距離と所要時間の差
- 将来の初心者向け評価へ影響しそうな道路変更の有無

差が許容できない場合は、その場で大規模な構成変更を行わず、次の順で検証します。

1. `TRAFFIC_AWARE_OPTIMAL`へ変更した場合の一致度と上位SKUの費用を比較する
2. 経由地の位置、方角、数を調整する
3. Maps URLによる引き渡し方式を再検討する
4. 必要な場合はGoogle Navigation SDKなど、同じ経路を扱える構成を検討する

`TRAFFIC_AWARE_OPTIMAL`は上位SKUになるため、料金を確認してから採用を判断します。

## 参考資料

共有資料は概念理解の入口として使用し、仕様・料金・セキュリティはGoogle公式資料を正とします。

- [共有資料：Polylineの説明](https://chatgpt.com/share/6a8b0e8b-4d20-83ee-98ae-6e501afdda52)
- [共有資料：Google Maps Routes APIの概要](https://chatgpt.com/share/6a8b0f1f-a9a4-83ee-be8b-bf48aab2318c)
- [Google公式：Get a route](https://developers.google.com/maps/documentation/routes/compute_route_directions)
- [Google公式：Compute Routes REST reference](https://developers.google.com/maps/documentation/routes/reference/rest/v2/TopLevel/computeRoutes)
- [Google公式：Choose fields to return](https://developers.google.com/maps/documentation/routes/choose_fields)
- [Google公式：Waypoint types and options](https://developers.google.com/maps/documentation/routes/waypoint-types)
- [Google公式：Encoded Polyline Algorithm Format](https://developers.google.com/maps/documentation/utilities/polylinealgorithm)
- [Google公式：Routes API web service best practices](https://developers.google.com/maps/documentation/routes/web-service-best-practices)
- [Google公式：API security best practices](https://developers.google.com/maps/api-security-best-practices)
- [Google公式：Routes API usage and billing](https://developers.google.com/maps/documentation/routes/usage-and-billing)
- [Google公式：Google Maps Platform pricing](https://developers.google.com/maps/billing-and-pricing/pricing)
