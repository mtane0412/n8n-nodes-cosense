# Cosense n8n Node 実装計画書

## 概要

本ドキュメントは、n8n用のCosense（Scrapbox）ノードの拡張実装計画を記述します。既存の実装を基に、利用可能なすべてのAPIエンドポイントに対応し、n8nのUXガイドラインに準拠した包括的なノードを開発します。

## 現状分析

### 実装済み機能

1. **認証方式**
   - Session Cookie認証（読み書き可能）
   - Service Account認証（読み取り専用、Business Plan限定）

2. **Page リソース操作**
   - Read: Get Page、List Pages、Search Pages
   - Write: Create Page、Insert Lines

3. **技術的特徴**
   - TypeScript strict mode
   - 適切なエラーハンドリング
   - レート制限対応（Exponential Backoff）
   - WebSocket API統合（書き込み操作）

### 未実装のAPIエンドポイント

@cosense/std パッケージの調査により、以下のAPIが利用可能であることが判明：

1. **ページ管理**
   - exportPages - プロジェクトの全ページをエクスポート
   - importPages - ページをプロジェクトにインポート
   - getSnapshot - ページの特定バージョンを取得（履歴機能）
   - getTimestampIds - ページのタイムスタンプIDを取得

2. **コンテンツ解析**
   - getCodeBlocks - ページ内のすべてのコードブロックを抽出

3. **セキュリティ・認証**
   - getCSRFToken - セキュアなリクエスト用のCSRFトークンを取得
   - getGyazoToken - Gyazoへの画像アップロード用OAuthトークンを取得

4. **外部連携**
   - getTweetInfo - 指定されたツイートの情報を取得
   - getWebPageTitle - ScrapboxサーバーでWebページのタイトルを取得

## 実装計画

### フェーズ1: 基盤強化（優先度：高）

#### 1.1 リソースタイプの拡張
現在の「Page」リソースに加えて、以下のリソースタイプを追加：

- **Project** - プロジェクト全体の操作
- **History** - 履歴・バージョン管理
- **Export/Import** - データの入出力
- **External** - 外部サービス連携

#### 1.2 既存機能の改善
- バッチ操作のサポート追加
- ページネーションの自動処理
- WebSocket接続のエラーハンドリング強化
- タイムアウト設定の追加

### フェーズ2: 新規API実装（優先度：高）

#### 2.1 プロジェクト操作
```typescript
// Export/Import リソース
- Export Pages: プロジェクトの全ページをJSON形式でエクスポート
- Import Pages: JSONデータからページをインポート
```

#### 2.2 履歴管理
```typescript
// History リソース
- Get Snapshot: ページの特定時点のスナップショットを取得
- Get Timestamp IDs: ページの変更履歴タイムスタンプ一覧を取得
```

#### 2.3 コンテンツ解析
```typescript
// Page リソース（拡張）
- Extract Code Blocks: ページ内のコードブロックを抽出
```

### フェーズ3: 高度な機能（優先度：中）

#### 3.1 セキュリティ強化
- CSRF Token取得機能の実装
- セキュアな書き込み操作のサポート

#### 3.2 外部サービス連携
- Gyazo画像アップロード統合
- Twitter情報取得機能
- Webページタイトル取得機能

### フェーズ4: ユーザビリティ向上（優先度：中）

#### 4.1 操作の簡素化
- よく使用される操作のプリセット作成
- 条件付きフィールドの最適化
- ヘルプテキストの充実

#### 4.2 エラーメッセージの改善
- より具体的なエラー内容の表示
- 解決方法の提案
- 日本語エラーメッセージのサポート

## 技術的実装詳細

### プロパティ構造の改善

```typescript
properties: [
  {
    displayName: 'Resource',
    name: 'resource',
    type: 'options',
    noDataExpression: true,
    options: [
      { name: 'Page', value: 'page' },
      { name: 'Project', value: 'project' },
      { name: 'History', value: 'history' },
      { name: 'Export/Import', value: 'exportImport' },
      { name: 'External', value: 'external' },
    ],
    default: 'page',
  },
  // リソースごとの操作を動的に表示
]
```

### エラーハンドリング戦略

1. **API固有のエラー**
   - 404: リソースが見つからない
   - 401/403: 認証・権限エラー
   - 429: レート制限（自動リトライ）
   - 500: サーバーエラー（詳細ログ）

2. **ユーザーフレンドリーなメッセージ**
   ```typescript
   throw new NodeOperationError(
     this.getNode(),
     `ページ "${pageTitle}" が見つかりませんでした。ページ名を確認してください。`,
     { itemIndex: i }
   );
   ```

### パフォーマンス最適化

1. **バッチ処理**
   - 複数ページの一括取得
   - 並列処理によるAPI呼び出しの最適化

2. **キャッシング**
   - プロジェクト情報のキャッシュ
   - 認証トークンの再利用

## テスト計画

### ユニットテスト
- 各API操作の正常系・異常系テスト
- 認証方式ごとのテスト
- エラーハンドリングのテスト

### 統合テスト
- n8nワークフロー内での動作確認
- 大量データ処理のパフォーマンステスト
- 実際のCosense APIとの連携テスト

## スケジュール

- **フェーズ1**: 1週間（基盤強化）
- **フェーズ2**: 2週間（新規API実装）
- **フェーズ3**: 1週間（高度な機能）
- **フェーズ4**: 1週間（ユーザビリティ向上）

合計: 5週間

## リスクと対策

1. **API仕様の変更**
   - 対策: @cosense/stdパッケージの定期的な更新確認

2. **レート制限**
   - 対策: 適切なリトライロジックとユーザーへの通知

3. **WebSocket接続の不安定性**
   - 対策: 再接続ロジックの実装、フォールバック機能

## まとめ

本実装計画により、Cosense n8nノードは以下を実現します：

1. Cosense APIの包括的なサポート
2. n8nベストプラクティスに準拠した高品質な実装
3. ユーザーフレンドリーなインターフェース
4. 堅牢なエラーハンドリングとパフォーマンス

これにより、n8nユーザーがCosenseをワークフローに統合する際の可能性が大幅に拡張されます。