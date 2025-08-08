# Cosense (Scrapbox) REST API 実装計画

## 現在の実装状況

### 実装済みのAPI

#### ページ情報API
- ✅ GET `/api/pages/:projectname/:pagetitle` - ページ取得
- ✅ GET `/api/pages/:projectname/:pagetitle/text` - ページテキスト取得（getPageで統合）
- ✅ GET `/api/pages/:projectname/search/titles` - タイトル検索
- ✅ GET `/api/code/:projectname/:pagetitle/:filename` - コードブロック取得（getCodeBlocksとして実装）

#### 検索API
- ✅ GET `/api/pages/:projectname/search/query` - フルテキスト検索

#### プロジェクト情報API
- ✅ GET `/api/pages/:projectname` - プロジェクト内のページ一覧

#### データエクスポート/インポート
- ✅ GET `/api/page-data/export/:projectname.json` - プロジェクトデータエクスポート（exportPagesとして実装）
- ✅ POST `/api/page-data/import/:projectname.json` - プロジェクトデータインポート（importPagesとして実装）

#### その他（部分的に実装）
- ⚠️ WebSocket経由のページ作成・編集機能（REST APIではない）

## 未実装のAPI

### ページ情報API
1. **GET `/api/pages/:projectname/:pagetitle/icon`**
   - ページアイコンの取得
   - 実装優先度: 中

2. **GET `/api/table/:projectname/:pagetitle/:filename.csv`**
   - テーブルデータのCSV形式での取得
   - 実装優先度: 高

3. **GET `/api/page-snapshots/:projectname/:pageid`**
   - ページスナップショット一覧の取得
   - 実装優先度: 中
   - 注意: page IDが必要（現在の実装はtitleベース）

4. **GET `/api/page-snapshots/:projectname/:pageid/:timestampid`**
   - 特定スナップショットの取得
   - 実装優先度: 中
   - 注意: 現在getSnapshotとして部分実装あり、改善が必要

5. **GET `/api/commits/:projectname/:pageid`**
   - ページのコミット履歴取得
   - 実装優先度: 中

6. **GET `/api/deleted-pages/:projectname/:pageid`**
   - 削除されたページの情報取得
   - 実装優先度: 低

### 検索API
1. **GET `/api/projects/search/query`**
   - プロジェクトの検索
   - 実装優先度: 低

2. **GET `/api/projects/search/watch-list`**
   - ウォッチリストの検索
   - 実装優先度: 低

### プロジェクト情報API
1. **GET `/api/projects/:projectname`**
   - プロジェクト詳細情報の取得
   - 実装優先度: 高

2. **GET `/api/stream/:projectname/`**
   - プロジェクトストリーム（更新情報）の取得
   - 実装優先度: 中

3. **GET `/api/feed/:projectname`**
   - プロジェクトフィードの取得
   - 実装優先度: 低

4. **GET `/api/projects/:projectname/notifications`**
   - 通知情報の取得
   - 実装優先度: 低

5. **GET `/api/projects/:projectname/invitations`**
   - 招待情報の取得
   - 実装優先度: 低

6. **GET `/api/project-backup/:projectname/list`**
   - バックアップ一覧の取得
   - 実装優先度: 中

7. **GET `/api/project-backup/:projectname/:backupId.json`**
   - 特定バックアップの取得
   - 実装優先度: 中

### ユーザー情報API
1. **GET `/api/users/me`**
   - 現在のユーザー情報取得
   - 実装優先度: 高

2. **GET `/api/projects`**
   - ユーザーが参加しているプロジェクト一覧
   - 実装優先度: 高

3. **GET `/api/gcs/:projectname/usage`**
   - プロジェクトのストレージ使用状況
   - 実装優先度: 低

### 内部/ユーティリティAPI
1. **GET `/api/settings`**
   - 設定情報の取得
   - 実装優先度: 低

2. **GET `/api/google-map/static-map`**
   - Google Maps静的マップの取得
   - 実装優先度: 低

3. **GET `/logout`**
   - ログアウト
   - 実装優先度: 低

## 実装計画

### フェーズ1: 高優先度API（1週目）
1. **ユーザー・プロジェクト情報API**
   - GET `/api/users/me`
   - GET `/api/projects`
   - GET `/api/projects/:projectname`

2. **テーブルデータAPI**
   - GET `/api/table/:projectname/:pagetitle/:filename.csv`

### フェーズ2: 中優先度API（2週目）
1. **履歴・スナップショットAPI**
   - GET `/api/page-snapshots/:projectname/:pageid`
   - GET `/api/commits/:projectname/:pageid`
   - 既存のgetSnapshot/getTimestampIdsの改善

2. **バックアップAPI**
   - GET `/api/project-backup/:projectname/list`
   - GET `/api/project-backup/:projectname/:backupId.json`

3. **その他の情報API**
   - GET `/api/pages/:projectname/:pagetitle/icon`
   - GET `/api/stream/:projectname/`

### フェーズ3: 低優先度API（3週目）
1. **通知・招待API**
   - GET `/api/projects/:projectname/notifications`
   - GET `/api/projects/:projectname/invitations`

2. **検索拡張API**
   - GET `/api/projects/search/query`
   - GET `/api/projects/search/watch-list`

3. **その他のAPI**
   - GET `/api/deleted-pages/:projectname/:pageid`
   - GET `/api/feed/:projectname`
   - GET `/api/gcs/:projectname/usage`
   - GET `/api/settings`
   - GET `/api/google-map/static-map`

## 技術的考慮事項

### 認証
- 一部のAPIはCSRFトークンが必要
- Service Account認証では一部APIが制限される可能性がある

### ページIDの取得
- 現在の実装はページタイトルベース
- 一部APIはページIDが必要なため、ID取得機能の実装が必要

### レート制限
- 既存のレート制限対応（リトライ機能）を継続使用

### エラーハンドリング
- 各APIの特有のエラーケースに対応
- ユーザーフレンドリーなエラーメッセージの提供

## テスト計画

1. **単体テスト**
   - 各API関数のテスト
   - エラーケースのテスト

2. **統合テスト**
   - 実際のScrapboxプロジェクトでのテスト
   - 認証タイプ別のテスト

3. **パフォーマンステスト**
   - 大量データ処理のテスト
   - レート制限の検証