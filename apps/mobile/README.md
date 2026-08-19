# Re:Drive Mobile

Expo SDK 54、React Native、TypeScriptで構築するRe:Driveのモバイルアプリです。

## セットアップ

`apps/mobile`で依存関係と環境変数を準備します。

```bash
cd apps/mobile
cp .env.example .env.local
npm install
```

## 起動

```bash
npm start
```

表示されたQRコードをExpo Goで読み取るか、ターミナルで`i`または`a`を押してシミュレーターを起動します。実機からローカルAPIへ接続する場合、`.env`の`EXPO_PUBLIC_API_BASE_URL`には`localhost`ではなく開発PCのLAN IPを指定してください。

## 検証

```bash
npm run lint
npm run typecheck
```
