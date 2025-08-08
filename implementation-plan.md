# Cosense n8nノード実装計画

## 概要

Cosense MCP Serverの機能をn8nノードとして実装する計画書です。Cosense（旧Scrapbox）のページ管理と検索機能をn8nのワークフローから利用できるようにします。

## 実装する機能

### 1. ページ取得（Get Page）
- **説明**: 指定したタイトルのページを取得
- **パラメータ**:
  - `projectName`: プロジェクト名（必須）
  - `pageTitle`: ページタイトル（必須）
- **レスポンス**: ページのタイトル、内容（lines配列）、メタデータ

### 2. ページ一覧（List Pages）
- **説明**: プロジェクト内のページ一覧を取得
- **パラメータ**:
  - `projectName`: プロジェクト名（必須）
  - `limit`: 取得件数の上限（オプション、デフォルト: 100）
  - `skip`: スキップする件数（オプション、デフォルト: 0）
- **レスポンス**: ページタイトルとメタデータの配列

### 3. ページ検索（Search Pages）
- **説明**: キーワードでページを検索
- **パラメータ**:
  - `projectName`: プロジェクト名（必須）
  - `query`: 検索クエリ（必須）
  - `limit`: 取得件数の上限（オプション、デフォルト: 50）
- **レスポンス**: 検索結果のページ配列

### 4. 行挿入（Insert Lines）
- **説明**: ページ内の指定した行の後にテキストを挿入
- **パラメータ**:
  - `projectName`: プロジェクト名（必須）
  - `pageTitle`: ページタイトル（必須）
  - `lineNumber`: 挿入位置の行番号（必須）
  - `text`: 挿入するテキスト（必須）
- **レスポンス**: 更新後のページ情報

### 5. ページ作成（Create Page）
- **説明**: 新しいページを作成
- **パラメータ**:
  - `projectName`: プロジェクト名（必須）
  - `pageTitle`: ページタイトル（必須）
  - `content`: ページの内容（必須）
- **レスポンス**: 作成されたページ情報

## 技術仕様

### APIエンドポイント

基本URL: `https://scrapbox.io/api/`

- **ページ取得**: `GET /pages/:projectname/:pagetitle`
- **ページ一覧**: `GET /pages/:projectname`
- **タイトル検索**: `GET /pages/:projectname/search/titles?q=:query`
- **全文検索**: `GET /pages/:projectname/search/query?q=:query`
- **ページ更新**: `POST /pages/:projectname/:pagetitle` (要認証)

### 認証

Cosenseは2つの認証方式をサポート：

#### 1. Cookieベースのセッション認証
- **必要な情報**: 
  - `COSENSE_SID`: セッションID（connect.sid）
- **実装方法**: HTTPリクエストのCookieヘッダーに`connect.sid={COSENSE_SID}`を設定
- **用途**: すべてのAPI操作（読み取り・書き込み）
- **取得方法**: ブラウザでCosenseにログイン後、開発者ツールでCookieを確認

#### 2. Service Account認証（Business Planのみ）
- **必要な情報**:
  - `SERVICE_ACCOUNT_KEY`: Service Account Access Key
- **実装方法**: HTTPリクエストのヘッダーに`x-service-account-access-key: {SERVICE_ACCOUNT_KEY}`を設定
- **用途**: Private Projectのデータ読み取り専用
- **制限事項**:
  - 同一Project内のAPIのみアクセス可能
  - 読み取り専用（書き込み不可）
  - Business Planでのみ利用可能
- **取得方法**: Project設定画面のService Accountsタブから発行

## ファイル構成

```
n8n-nodes-cosense/
├── credentials/
│   └── CosenseApi.credentials.ts    # 認証情報の定義 ✅
├── nodes/
│   ├── Cosense/
│   │   ├── Cosense.node.ts         # ノードのメイン実装 ✅
│   │   ├── CosenseApiClient.ts     # API通信のクライアント ✅
│   │   ├── cosense.svg             # ノードアイコン ✅
│   │   └── __tests__/
│   │       ├── Cosense.node.test.ts # ノードのユニットテスト ✅
│   │       └── CosenseApiClient.test.ts # APIクライアントのテスト ✅
├── .eslintignore                    # ESLint除外設定 ✅
├── jest.config.js                   # Jest設定 ✅
└── implementation-plan.md          # この計画書
```

## 実装ステップ

### フェーズ1: 基礎実装（読み取り専用）✅ 完了
1. **認証情報クラスの作成** ✅
   - `CosenseApi.credentials.ts`の実装
   - プロジェクト名とセッションIDの保存

2. **ノード基本構造の実装** ✅
   - `Cosense.node.ts`の骨組み作成
   - 操作選択（Operation）のドロップダウン実装

3. **読み取り操作の実装** ✅
   - Get Page操作
   - List Pages操作
   - Search Pages操作（タイトル検索・全文検索）

### フェーズ2: 書き込み機能の追加 ✅ 完了
4. **書き込み操作の実装** ✅
   - Insert Lines操作
   - Create Page操作
   - エラーハンドリングの強化

5. **高度な機能の追加**
   - ページネーション対応
   - バッチ処理のサポート
   - レート制限の実装

### フェーズ3: 品質向上 ✅ 完了
6. **テストとドキュメント** ✅
   - ユニットテストの作成
   - 統合テストの実装
   - ドキュメントの充実（README.md作成）

7. **最適化とリファクタリング** ✅
   - パフォーマンスの最適化（レート制限とリトライロジック実装）
   - コードの整理（CosenseApiClientクラスの作成）
   - エラーメッセージの改善（詳細な説明とガイダンス追加）

## エラーハンドリング

- **認証エラー**: 401エラー時は認証情報の確認を促す
- **ページ不存在**: 404エラー時は明確なメッセージを表示
- **レート制限**: 429エラー時はリトライロジックを実装
- **ネットワークエラー**: タイムアウトと再試行の設定

## セキュリティ考慮事項

- セッションIDは機密情報として扱う
- HTTPSでの通信を強制
- 入力値のバリデーション実装
- XSS対策（HTMLエスケープ）

## 今後の拡張可能性

- WebSocket APIを使用したリアルタイム更新の監視
- ページの削除機能
- ページの移動・リネーム機能
- アイコンや画像のアップロード機能
- プロジェクト設定の管理機能

## 参考資料

- [Cosense MCP Server](https://github.com/takker99/cosense-mcp-server)
- [Scrapbox REST APIの一覧](https://scrapbox.io/scrapboxlab/Scrapbox_REST_API%E3%81%AE%E4%B8%80%E8%A6%A7)
- [@cosense/std JSR Package](https://jsr.io/@cosense/std)
- [n8n Node Development Documentation](https://docs.n8n.io/integrations/creating-nodes/)

## 進捗記録

### 2025-08-08
- **フェーズ1完了**: 読み取り専用機能の実装
  - 認証情報クラス（CosenseApi.credentials.ts）を作成
  - Cosenseノードの基本構造を実装
  - Get Page、List Pages、Search Pages（タイトル・全文）操作を実装
  - ユニットテストを作成
  - ESLintチェックをパス
  - TypeScriptビルドが成功
  - ノードアイコンを作成
  - エラーハンドリング（404、401）を実装
  - ページネーション対応（List Pages）
  - continueOnFailオプションのサポート

- **フェーズ2完了**: 書き込み機能の追加
  - CosenseApiClientクラスを作成（API通信の共通処理）
  - Create Page操作を実装（新規ページ作成）
  - Insert Lines操作を実装（既存ページへの行挿入）
  - APIクライアントのユニットテストを作成
  - Cosenseノードのテストを更新
  - 認証エラー、404エラー、409エラーの適切なハンドリング
  - 全テストが成功（21テスト）
  - ESLintチェックをパス
  - TypeScriptビルドが成功

- **Service Account認証のサポート追加**
  - 認証方式の選択オプションを追加（Session Cookie / Service Account）
  - CosenseApiCredentials.credentials.tsにService Account Access Keyフィールドを追加
  - CosenseApiClientでService Account認証ヘッダー（x-service-account-access-key）をサポート
  - Service Account使用時の書き込み操作制限を実装
  - Service Account認証のユニットテストを追加（3テスト）
  - 全テストが成功（24テスト）
  - ESLintチェックをパス
  - TypeScriptビルドが成功

- **フェーズ3完了**: 品質向上
  - 統合テストの実装（CosenseApiTestClientクラスとテストスイート作成）
  - README.mdの作成（インストール方法、使用方法、エラーハンドリング説明）
  - レート制限対応（429エラー時の自動リトライとエクスポネンシャルバックオフ）
  - エラーメッセージの改善（より具体的で実用的なメッセージとガイダンス）
  - コードのリファクタリング（APIクライアントの分離、重複コードの削除）
  - 全テストが成功
  - ESLintチェックをパス
  - TypeScriptビルドが成功