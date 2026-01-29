# Overview

Lambda関数の設定内容を記載してします。

# Lambda関数

名前: AWS_AgileWorks-app_RefreshFirebaseToken3
命名規則: dev, stg, prod とも共通

# コード

S3バケット名（GitHub Secretsに設定）: dk-mobileapp
コードソース: s3://dk-mobileapp/lambda-jar/aw_lambda-token-all.jar

# ランタイム設定

ランタイム: Java17
アーキテクチャ: x86_64
ハンドラ: jp.atled.cloud.lambda.mobileapp.RefreshTokenHandler::handleRequest

# トリガー

EventBridge（AgileWorks-app_RefreshFirebaseToken3）

# アクセス制限

実行ロール: AWS_AgileWorks-app3

# 環境変数

PrivateKey: /AgileWorks-app/Firebase/PrivateKey2
AccessToken: /AgileWorks-app/Firebase/AccessToken2
Scoped: https://www.googleapis.com/auth/firebase.messaging
