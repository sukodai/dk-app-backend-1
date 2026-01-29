# Lambda 関数のアップロード方法

GitHub へ push 後、GitHubActions を利用し dev, stg, prod に設定する。

Job 1:
dev の認証情報で dev S3 からJARをダウンロード
↓ (GitHub Artifact で受け渡し)
Job 2:
stg/prod の認証情報でターゲットS3にアップロード → Lambda更新
