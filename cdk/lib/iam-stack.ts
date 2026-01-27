import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface IamStackProps extends cdk.StackProps {
  envName: string;
}

export class IamStack extends cdk.Stack {
  public readonly lambdaExecutionRole: iam.Role;

  constructor(scope: Construct, id: string, props: IamStackProps) {
    super(scope, id, props);

    const { envName } = props;

    // Lambda実行用のIAMロール
    this.lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      roleName: `${envName}-lambda-execution-role`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: `Lambda execution role for ${envName} environment`,
    });

    // CloudWatch Logsへの書き込み権限
    this.lambdaExecutionRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
    );

    // カスタムポリシー例: DynamoDBへのアクセス
    const dynamoDbPolicy = new iam.Policy(this, 'DynamoDbPolicy', {
      policyName: `${envName}-lambda-dynamodb-policy`,
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'dynamodb:GetItem',
            'dynamodb:PutItem',
            'dynamodb:UpdateItem',
            'dynamodb:DeleteItem',
            'dynamodb:Query',
            'dynamodb:Scan',
          ],
          resources: [
            `arn:aws:dynamodb:${this.region}:${this.account}:table/${envName}-*`,
          ],
        }),
      ],
    });
    this.lambdaExecutionRole.attachInlinePolicy(dynamoDbPolicy);

    // カスタムポリシー例: S3へのアクセス
    const s3Policy = new iam.Policy(this, 'S3Policy', {
      policyName: `${envName}-lambda-s3-policy`,
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            's3:GetObject',
            's3:PutObject',
            's3:DeleteObject',
            's3:ListBucket',
          ],
          resources: [
            `arn:aws:s3:::${envName}-*`,
            `arn:aws:s3:::${envName}-*/*`,
          ],
        }),
      ],
    });
    this.lambdaExecutionRole.attachInlinePolicy(s3Policy);

    // EventBridge用のIAMロール
    const eventBridgeRole = new iam.Role(this, 'EventBridgeRole', {
      roleName: `${envName}-eventbridge-role`,
      assumedBy: new iam.ServicePrincipal('events.amazonaws.com'),
      description: `EventBridge role for ${envName} environment`,
    });

    eventBridgeRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['lambda:InvokeFunction'],
        resources: [`arn:aws:lambda:${this.region}:${this.account}:function:${envName}-*`],
      })
    );

    // AgileWorks-app3_Administer マネージドポリシー
    const agileWorksApp3Policy = new iam.ManagedPolicy(this, 'AgileWorksApp3AdministerPolicy', {
      managedPolicyName: 'AgileWorks-app3_Administer',
      description: 'AWMobileApp Expo',
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'ssm:GetParameter',
            'ssm:PutParameter',
            'logs:CreateLogStream',
            'logs:CreateLogGroup',
            'logs:PutLogEvents',
            'dynamodb:BatchGetItem',
            'dynamodb:ConditionCheckItem',
            'dynamodb:GetItem',
            'dynamodb:GetRecords',
            'dynamodb:Scan',
            'dynamodb:Query',
          ],
          resources: [
            'arn:aws:logs:*:*:*',
            `arn:aws:logs:ap-northeast-1:${this.account}:log-group:/aws/lambda/AWS_AgileWorks-app_PushNotification2:*`,
            `arn:aws:logs:ap-northeast-1:${this.account}:log-group:/aws/lambda/AWS_AgileWorks-app_Authorizer:*`,
            `arn:aws:logs:ap-northeast-1:${this.account}:log-group:/aws/lambda/AWS_AgileWorks-app_RefreshFirebaseToken2:*`,
            `arn:aws:logs:ap-northeast-1:${this.account}:log-group:/aws/lambda/AWS_AgileWorks-app_DeviceGroupManagement2:*`,
            `arn:aws:ssm:ap-northeast-1:${this.account}:parameter/AgileWorks-app/Firebase/PrivateKey2`,
            `arn:aws:ssm:ap-northeast-1:${this.account}:parameter/AgileWorks-app/Firebase/AccessToken2`,
            `arn:aws:dynamodb:ap-northeast-1:${this.account}:table/license_info2/*`,
            `arn:aws:dynamodb:ap-northeast-1:${this.account}:table/customer_license/*`,
          ],
        }),
      ],
    });

    // Outputs
    new cdk.CfnOutput(this, 'LambdaExecutionRoleArn', {
      value: this.lambdaExecutionRole.roleArn,
      description: 'Lambda execution role ARN',
      exportName: `${envName}-lambda-execution-role-arn`,
    });

    new cdk.CfnOutput(this, 'EventBridgeRoleArn', {
      value: eventBridgeRole.roleArn,
      description: 'EventBridge role ARN',
      exportName: `${envName}-eventbridge-role-arn`,
    });

    new cdk.CfnOutput(this, 'AgileWorksApp3PolicyArn', {
      value: agileWorksApp3Policy.managedPolicyArn,
      description: 'AgileWorks-app3_Administer policy ARN',
      exportName: `${envName}-agileworks-app3-policy-arn`,
    });
  }
}
