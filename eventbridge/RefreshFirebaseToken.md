# Overview

EventBride の設定内容を記載しています。

# ルールの詳細

ルール名: AgileWorks-app_RefreshFirebaseToken3
説明: AWMobileApp Expo
命名規則: dev, stg, prod とも共通

# イベントスケジュール

スケジュール式: rate(50 minutes)

# ターゲット

ターゲット名: AWS_AgileWorks-app_RefreshFirebaseToken3
タイプ: Lambda関数

# ターゲットに指定された Lambda関数のデプロイ状況

RefreshFirebaseToken.yml により　GitHub Actions を使い　各環境（dev, stg, prod）に 事前に　deploy 済みを想定しています。
GitHub Actions の実行時、ターゲットの Lambda関数がない場合は、エラーで終了させてください。
