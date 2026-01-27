import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface GitHubOidcStackProps extends cdk.StackProps {
  envName: string;
  githubOrg: string;
  githubRepo: string;
}

/**
 * GitHub OIDC認証用のスタック
 * 各AWSアカウントに一度だけデプロイする必要があります
 */
export class GitHubOidcStack extends cdk.Stack {
  public readonly deployRole: iam.Role;

  constructor(scope: Construct, id: string, props: GitHubOidcStackProps) {
    super(scope, id, props);

    const { envName, githubOrg, githubRepo } = props;

    // GitHub OIDC Provider
    // Note: アカウントに既にOIDCプロバイダーが存在する場合はこの部分をコメントアウト
    const oidcProvider = new iam.OpenIdConnectProvider(this, 'GitHubOidcProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
      thumbprints: [
        '6938fd4d98bab03faadb97b34396831e3780aea1',
        '1c58a3a8518e8759bf075b76b750d4f2df264fcd',
      ],
    });

    // デプロイ用IAMロール
    this.deployRole = new iam.Role(this, 'GitHubActionsDeployRole', {
      roleName: `${envName}-github-actions-deploy-role`,
      description: `GitHub Actions deploy role for ${envName} environment`,
      assumedBy: new iam.FederatedPrincipal(
        oidcProvider.openIdConnectProviderArn,
        {
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          },
          StringLike: {
            'token.actions.githubusercontent.com:sub': `repo:${githubOrg}/${githubRepo}:*`,
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
      maxSessionDuration: cdk.Duration.hours(1),
    });

    // CDKデプロイに必要な権限
    // 本番環境では最小権限の原則に従って調整してください
    this.deployRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('PowerUserAccess')
    );

    // IAM操作権限（CDKでIAMリソースを作成するために必要）
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'iam:CreateRole',
          'iam:DeleteRole',
          'iam:GetRole',
          'iam:PassRole',
          'iam:UpdateRole',
          'iam:TagRole',
          'iam:UntagRole',
          'iam:AttachRolePolicy',
          'iam:DetachRolePolicy',
          'iam:PutRolePolicy',
          'iam:DeleteRolePolicy',
          'iam:GetRolePolicy',
          'iam:CreatePolicy',
          'iam:DeletePolicy',
          'iam:GetPolicy',
          'iam:GetPolicyVersion',
          'iam:CreatePolicyVersion',
          'iam:DeletePolicyVersion',
          'iam:ListPolicyVersions',
          'iam:TagPolicy',
          'iam:UntagPolicy',
        ],
        resources: ['*'],
      })
    );

    // CDK Bootstrap権限
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'cloudformation:*',
          'ssm:GetParameter',
        ],
        resources: ['*'],
      })
    );

    // S3権限（CDK Bootstrapバケット用）
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:*',
        ],
        resources: [
          `arn:aws:s3:::cdk-*-${this.account}-${this.region}`,
          `arn:aws:s3:::cdk-*-${this.account}-${this.region}/*`,
        ],
      })
    );

    // Outputs
    new cdk.CfnOutput(this, 'DeployRoleArn', {
      value: this.deployRole.roleArn,
      description: 'GitHub Actions deploy role ARN',
      exportName: `${envName}-github-actions-deploy-role-arn`,
    });

    new cdk.CfnOutput(this, 'OidcProviderArn', {
      value: oidcProvider.openIdConnectProviderArn,
      description: 'GitHub OIDC provider ARN',
      exportName: `${envName}-github-oidc-provider-arn`,
    });
  }
}
