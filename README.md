# AWS Infrastructure with CDK

AWS CDK を使用してインフラをコードで管理し、GitHub Actions で手動デプロイを行います。

## 構成

```
├── cdk/
│   ├── bin/
│   │   ├── app.ts              # メインCDKアプリ
│   │   └── setup-oidc.ts       # OIDC認証セットアップ
│   ├── lib/
│   │   ├── iam-stack.ts        # IAMポリシー・ロール
│   │   ├── lambda-stack.ts     # Lambda関数
│   │   ├── api-gateway-stack.ts # API Gateway
│   │   ├── eventbridge-stack.ts # EventBridge
│   │   └── github-oidc-stack.ts # GitHub OIDC認証
│   ├── cdk.json
│   ├── package.json
│   └── tsconfig.json
├── .github/
│   └── workflows/
│       └── deploy.yml          # 手動デプロイワークフロー
├── config/
│   ├── dev.json                # 開発環境設定
│   ├── stg.json                # ステージング環境設定
│   └── prod.json               # 本番環境設定
└── lambda/                     # Lambda関数コード（オプション）
```

## 環境

| 環境 | AWSアカウント | 用途 |
|------|---------------|------|
| dev  | 767397709801  | 開発環境 |
| stg  | 370632987723  | ステージング環境 |
| prod | 123456789002  | 本番環境 |

## セットアップ手順

### 1. 依存関係のインストール

```bash
cd cdk
npm install
```

### 2. CDK Bootstrap（各アカウントで初回のみ）

```bash
# dev環境
aws-vault exec dev -- npx cdk bootstrap -c env=dev

# stg環境
aws-vault exec stg -- npx cdk bootstrap -c env=stg

# prod環境
aws-vault exec prod -- npx cdk bootstrap -c env=prod
```

### 3. GitHub OIDC認証のセットアップ（各アカウントで初回のみ）

GitHub リポジトリを作成後、各AWSアカウントでOIDC認証を設定します。

```bash
# dev環境
aws-vault exec dev -- npx cdk deploy \
  -c env=dev \
  -c githubOrg=YOUR_GITHUB_ORG \
  -c githubRepo=YOUR_REPO_NAME \
  -a "npx ts-node bin/setup-oidc.ts"

# stg環境
aws-vault exec stg -- npx cdk deploy \
  -c env=stg \
  -c githubOrg=YOUR_GITHUB_ORG \
  -c githubRepo=YOUR_REPO_NAME \
  -a "npx ts-node bin/setup-oidc.ts"

# prod環境
aws-vault exec prod -- npx cdk deploy \
  -c env=prod \
  -c githubOrg=YOUR_GITHUB_ORG \
  -c githubRepo=YOUR_REPO_NAME \
  -a "npx ts-node bin/setup-oidc.ts"
```

### 4. GitHub リポジトリの設定

1. **Environments の作成**
   - GitHub リポジトリの Settings → Environments で以下を作成:
     - `dev`
     - `stg`
     - `prod`
     - `prod-approval` （本番デプロイの承認用）

2. **Environment Variables の設定**
   - 各 Environment に `AWS_DEPLOY_ROLE_ARN` を設定:
     - `dev`: `arn:aws:iam::767397709801:role/dev-github-actions-deploy-role`
     - `stg`: `arn:aws:iam::370632987723:role/stg-github-actions-deploy-role`
     - `prod`: `arn:aws:iam::123456789002:role/prod-github-actions-deploy-role`

3. **Protection Rules の設定（推奨）**
   - `prod-approval` Environment に Required reviewers を追加

## ローカルでの操作

### 差分確認

```bash
cd cdk

# dev環境の差分
npm run diff:dev

# stg環境の差分
npm run diff:stg

# prod環境の差分
npm run diff:prod
```

### デプロイ（ローカルから）

```bash
cd cdk

# dev環境
aws-vault exec dev -- npm run deploy:dev

# stg環境
aws-vault exec stg -- npm run deploy:stg

# prod環境（確認プロンプトあり）
aws-vault exec prod -- npm run deploy:prod
```

### 削除

```bash
cd cdk

# dev環境
aws-vault exec dev -- npm run destroy:dev

# stg環境
aws-vault exec stg -- npm run destroy:stg

# prod環境は手動削除推奨
```

## GitHub Actions からのデプロイ

1. リポジトリの **Actions** タブを開く
2. **Deploy AWS Infrastructure** ワークフローを選択
3. **Run workflow** をクリック
4. 環境 (dev/stg/prod) とアクション (deploy/diff/destroy) を選択
5. **Run workflow** で実行

### 本番環境へのデプロイ

本番環境へのデプロイは追加の承認ステップが必要です：
1. `prod-approval` Environment で承認を待機
2. 承認者がApproveすると自動的にデプロイ実行

## スタック構成

| スタック | 説明 |
|----------|------|
| `{env}-infra-iam` | IAMロール・ポリシー |
| `{env}-infra-lambda` | Lambda関数 |
| `{env}-infra-api` | API Gateway |
| `{env}-infra-eventbridge` | EventBridgeルール・イベントバス |
| `{env}-github-oidc` | GitHub OIDC認証（初期セットアップ用） |

## カスタマイズ

### Lambda関数の追加

1. `lambda/` ディレクトリにコードを配置
2. `cdk/lib/lambda-stack.ts` で新しい関数を定義

### API エンドポイントの追加

`cdk/lib/api-gateway-stack.ts` でリソースとメソッドを追加

### EventBridge ルールの追加

`cdk/lib/eventbridge-stack.ts` で新しいルールを定義

## トラブルシューティング

### Bootstrap エラー

```
Error: This stack uses assets, so the toolkit stack must be deployed
```

→ `cdk bootstrap` を実行してください

### OIDC 認証エラー

```
Error: Not authorized to perform sts:AssumeRoleWithWebIdentity
```

→ GitHub リポジトリ名/組織名が正しく設定されているか確認

### 権限エラー

```
Error: User is not authorized to perform: xxx
```

→ デプロイロールの権限を確認・追加
