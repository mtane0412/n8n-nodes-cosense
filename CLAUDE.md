# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

このリポジトリは、n8n用のカスタムノードパッケージを開発するためのプロジェクトです。n8n-nodes-starterテンプレートをベースにしています。

## 開発コマンド

```bash
# 依存関係のインストール
npm install

# ビルド（TypeScriptコンパイル + アイコンコピー）
npm run build

# 開発モード（TypeScriptウォッチ）
npm run dev

# Lintチェック
npm run lint

# Lint自動修正
npm run lintfix

# コードフォーマット（Prettier）
npm run format

# パブリッシュ前の準備（ビルド + Lint）
npm run prepublishOnly
```

## アーキテクチャ

### ディレクトリ構造
- `credentials/` - 認証情報の定義（OAuth2、APIキーなど）
- `nodes/` - n8nノードの実装
- `dist/` - ビルド成果物（gitignore対象）

### n8nノードの構造
各ノードは以下のコンポーネントで構成されます：
- `*.node.ts` - ノードのメインロジック（INodeType実装）
- `*.node.json` - ノードのメタデータ（オプション）
- `*.svg` or `*.png` - ノードアイコン

### 重要な型定義
- `INodeType` - ノードの基本インターフェース
- `INodeExecutionData` - 実行時のデータ構造
- `ICredentialDataDecryptedObject` - 認証情報の型

## 開発ガイドライン

### TypeScript設定
- **Strict mode** が有効
- **Target**: ES2019
- すべての型注釈を明示的に記述すること

### ESLint設定
n8n専用のESLintプラグイン（`eslint-plugin-n8n-nodes-base`）により、n8nコミュニティノードの品質基準を満たすよう厳格にチェックされます。

### ノード開発時の注意点
1. ノード名は必ず大文字で始める（例：`ExampleNode`）
2. トリガーノードの場合は名前に`Trigger`サフィックスを付ける
3. 認証情報クラス名には`Api`または`OAuth2`サフィックスを付ける
4. エラーハンドリングは`NodeOperationError`を使用
5. すべてのパラメータには説明（description）を記述

### ローカルテスト
1. `npm link` でパッケージをリンク
2. n8nのカスタムノードディレクトリで `npm link n8n-nodes-<name>`
3. `n8n start` でn8nを起動してテスト

詳細は[n8nドキュメント](https://docs.n8n.io/integrations/creating-nodes/test/run-node-locally/)を参照。

## n8nノード開発の詳細

### ノードタイプ

n8nには3つのノードタイプがあります：

1. **Regular Node（通常ノード）**
   - ワークフロー実行時に動作
   - `execute`メソッドを実装
   - 外部APIとの連携など、一般的な処理に使用

2. **Trigger Node（トリガーノード）**
   - ワークフロー開始時にアクティベート
   - イベント駆動型の処理に使用
   - 名前に`Trigger`サフィックスを付ける

3. **Webhook Node（Webhookノード）**
   - Webhookがトリガーされた時に呼び出される
   - 外部システムからのコールバック処理に使用

### INodeTypeインターフェース

カスタムノードは`INodeType`インターフェースを実装する必要があります：

```typescript
import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';

export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',           // UIに表示される名前
    name: 'myNode',                   // 内部で使用される名前（camelCase）
    group: ['transform'],             // ノードのグループ
    version: 1,                       // ノードのバージョン（通常は1）
    description: 'Node description',   // ノードの説明
    defaults: {
      name: 'My Node',                // デフォルトのノード名
    },
    inputs: [NodeConnectionType.Main],   // 入力接続
    outputs: [NodeConnectionType.Main],  // 出力接続
    usableAsTool: true,                  // AI Agentのツールとして使用可能
    properties: [
      // ユーザーが設定可能なプロパティ
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    // ノードの実行ロジック
  }
}
```

### ノードプロパティの定義

プロパティはユーザーが設定可能なパラメータを定義します：

```typescript
properties: [
  {
    displayName: 'Field Name',        // UIに表示される名前
    name: 'fieldName',               // 内部で使用される名前
    type: 'string',                  // データ型
    default: '',                     // デフォルト値
    placeholder: 'Enter value',      // プレースホルダー
    description: 'Field description', // 説明
    required: true,                  // 必須フィールド
    noDataExpression: false,         // 式の使用可否
  },
]
```

### データ型

利用可能なプロパティタイプ：
- `string` - テキスト入力
- `number` - 数値入力
- `boolean` - チェックボックス
- `options` - ドロップダウンリスト
- `collection` - 複数フィールドのグループ
- `fixedCollection` - 固定フィールドのコレクション
- `json` - JSON入力
- `color` - カラーピッカー
- `dateTime` - 日時選択

### executeメソッドの実装

`execute`メソッドはノードの主要なロジックを実装します：

```typescript
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const items = this.getInputData();
  const returnData: INodeExecutionData[] = [];

  for (let i = 0; i < items.length; i++) {
    try {
      // パラメータの取得
      const myParam = this.getNodeParameter('myParam', i) as string;
      
      // 処理の実装
      const result = await processData(myParam);
      
      // 結果の追加
      returnData.push({
        json: result,
        pairedItem: { item: i },
      });
    } catch (error) {
      // エラーハンドリング
      if (this.continueOnFail()) {
        returnData.push({
          json: { error: error.message },
          error,
          pairedItem: { item: i },
        });
      } else {
        throw new NodeOperationError(this.getNode(), error, {
          itemIndex: i,
        });
      }
    }
  }

  return [returnData];
}
```

### 認証情報の使用

ノードで認証が必要な場合：

```typescript
credentials: [
  {
    name: 'myApiCredentials',
    required: true,
  },
],
```

対応する認証情報ファイル（`MyApiCredentials.credentials.ts`）：

```typescript
import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MyApiCredentials implements ICredentialType {
  name = 'myApiCredentials';
  displayName = 'My API Credentials';
  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
    },
  ];
}
```

### HTTPリクエストの実装

n8nは組み込みのHTTPヘルパーを提供：

```typescript
requestDefaults: {
  baseURL: 'https://api.example.com',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
},
```

### エラーハンドリングのベストプラクティス

1. **NodeOperationError**を使用してコンテキスト情報を含める
2. `continueOnFail()`をチェックして、エラー時の動作を制御
3. `itemIndex`を含めて、どのアイテムでエラーが発生したか明確にする
4. エラーメッセージは具体的でユーザーフレンドリーに

### 開発のベストプラクティス

1. **命名規則**
   - ノードクラス名：PascalCase（例：`MyServiceNode`）
   - ノード名：camelCase（例：`myServiceNode`）
   - プロパティ名：camelCase

2. **UIデザイン**
   - 関連するプロパティはグループ化
   - 条件付き表示を活用して、必要な時だけオプションを表示
   - 明確で簡潔な説明を提供

3. **パフォーマンス**
   - バッチ処理をサポート
   - 大量データの処理時はページネーションを実装
   - 不要なAPIコールを避ける

4. **テスト**
   - エッジケースをカバー
   - エラーハンドリングをテスト
   - 異なるデータ型での動作を確認

### 2024年の新機能

- **AI Agent対応**: `usableAsTool: true`を設定することで、ノードをAI Agentのツールとして使用可能
- **改善されたエラーハンドリング**: より詳細なエラーコンテキストとスタックトレース
- **パフォーマンス最適化**: 大規模ワークフローでの実行速度向上

n8nには3つのノードタイプがあります：

1. **Regular Node（通常ノード）**
   - ワークフロー実行時に動作
   - `execute`メソッドを実装
   - 外部APIとの連携など、一般的な処理に使用

2. **Trigger Node（トリガーノード）**
   - ワークフロー開始時にアクティベート
   - イベント駆動型の処理に使用
   - 名前に`Trigger`サフィックスを付ける

3. **Webhook Node（Webhookノード）**
   - Webhookがトリガーされた時に呼び出される
   - 外部システムからのコールバック処理に使用

### INodeTypeインターフェース

カスタムノードは`INodeType`インターフェースを実装する必要があります：

```typescript
import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';

export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',           // UIに表示される名前
    name: 'myNode',                   // 内部で使用される名前（camelCase）
    group: ['transform'],             // ノードのグループ
    version: 1,                       // ノードのバージョン（通常は1）
    description: 'Node description',   // ノードの説明
    defaults: {
      name: 'My Node',                // デフォルトのノード名
    },
    inputs: [NodeConnectionType.Main],   // 入力接続
    outputs: [NodeConnectionType.Main],  // 出力接続
    usableAsTool: true,                  // AI Agentのツールとして使用可能
    properties: [
      // ユーザーが設定可能なプロパティ
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    // ノードの実行ロジック
  }
}
```

### ノードプロパティの定義

プロパティはユーザーが設定可能なパラメータを定義します：

```typescript
properties: [
  {
    displayName: 'Field Name',        // UIに表示される名前
    name: 'fieldName',               // 内部で使用される名前
    type: 'string',                  // データ型
    default: '',                     // デフォルト値
    placeholder: 'Enter value',      // プレースホルダー
    description: 'Field description', // 説明
    required: true,                  // 必須フィールド
    noDataExpression: false,         // 式の使用可否
  },
]
```

### データ型

利用可能なプロパティタイプ：
- `string` - テキスト入力
- `number` - 数値入力
- `boolean` - チェックボックス
- `options` - ドロップダウンリスト
- `collection` - 複数フィールドのグループ
- `fixedCollection` - 固定フィールドのコレクション
- `json` - JSON入力
- `color` - カラーピッカー
- `dateTime` - 日時選択

### executeメソッドの実装

`execute`メソッドはノードの主要なロジックを実装します：

```typescript
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const items = this.getInputData();
  const returnData: INodeExecutionData[] = [];

  for (let i = 0; i < items.length; i++) {
    try {
      // パラメータの取得
      const myParam = this.getNodeParameter('myParam', i) as string;
      
      // 処理の実装
      const result = await processData(myParam);
      
      // 結果の追加
      returnData.push({
        json: result,
        pairedItem: { item: i },
      });
    } catch (error) {
      // エラーハンドリング
      if (this.continueOnFail()) {
        returnData.push({
          json: { error: error.message },
          error,
          pairedItem: { item: i },
        });
      } else {
        throw new NodeOperationError(this.getNode(), error, {
          itemIndex: i,
        });
      }
    }
  }

  return [returnData];
}
```

### 認証情報の使用

ノードで認証が必要な場合：

```typescript
credentials: [
  {
    name: 'myApiCredentials',
    required: true,
  },
],
```

対応する認証情報ファイル（`MyApiCredentials.credentials.ts`）：

```typescript
import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MyApiCredentials implements ICredentialType {
  name = 'myApiCredentials';
  displayName = 'My API Credentials';
  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
    },
  ];
}
```

### HTTPリクエストの実装

n8nは組み込みのHTTPヘルパーを提供：

```typescript
requestDefaults: {
  baseURL: 'https://api.example.com',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
},
```

### エラーハンドリングのベストプラクティス

1. **NodeOperationError**を使用してコンテキスト情報を含める
2. `continueOnFail()`をチェックして、エラー時の動作を制御
3. `itemIndex`を含めて、どのアイテムでエラーが発生したか明確にする
4. エラーメッセージは具体的でユーザーフレンドリーに

### 開発のベストプラクティス

1. **命名規則**
   - ノードクラス名：PascalCase（例：`MyServiceNode`）
   - ノード名：camelCase（例：`myServiceNode`）
   - プロパティ名：camelCase

2. **UIデザイン**
   - 関連するプロパティはグループ化
   - 条件付き表示を活用して、必要な時だけオプションを表示
   - 明確で簡潔な説明を提供

3. **パフォーマンス**
   - バッチ処理をサポート
   - 大量データの処理時はページネーションを実装
   - 不要なAPIコールを避ける

4. **テスト**
   - エッジケースをカバー
   - エラーハンドリングをテスト
   - 異なるデータ型での動作を確認

### 2024年の新機能

- **AI Agent対応**: `usableAsTool: true`を設定することで、ノードをAI Agentのツールとして使用可能
- **改善されたエラーハンドリング**: より詳細なエラーコンテキストとスタックトレース
- **パフォーマンス最適化**: 大規模ワークフローでの実行速度向上