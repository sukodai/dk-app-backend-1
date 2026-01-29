import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface EventBridgeStackProps extends cdk.StackProps {
  envName: string;
}

export class EventBridgeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EventBridgeStackProps) {
    super(scope, id, props);

    // 既存の Lambda 関数を参照（RefreshFirebaseToken.yml により事前にデプロイ済み）
    const lambdaFunctionName = 'AWS_AgileWorks-app_RefreshFirebaseToken3';
    const lambdaFunction = lambda.Function.fromFunctionName(
      this,
      'RefreshFirebaseTokenFunction',
      lambdaFunctionName,
    );

    // スケジュールルール: rate(50 minutes)
    const rule = new events.Rule(this, 'RefreshFirebaseTokenRule', {
      ruleName: 'AgileWorks-app_RefreshFirebaseToken3',
      description: 'AWMobileApp Expo',
      schedule: events.Schedule.rate(cdk.Duration.minutes(50)),
      enabled: true,
    });

    rule.addTarget(
      new targets.LambdaFunction(lambdaFunction, {
        retryAttempts: 2,
      }),
    );
  }
}
