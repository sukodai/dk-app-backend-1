import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface EventBridgeStackProps extends cdk.StackProps {
  envName: string;
  lambdaFunction: lambda.Function;
}

export class EventBridgeStack extends cdk.Stack {
  public readonly eventBus: events.EventBus;

  constructor(scope: Construct, id: string, props: EventBridgeStackProps) {
    super(scope, id, props);

    const { envName, lambdaFunction } = props;

    // カスタムイベントバス
    this.eventBus = new events.EventBus(this, 'EventBus', {
      eventBusName: `${envName}-event-bus`,
    });

    // スケジュールルール（毎日午前9時 JST = 午前0時 UTC）
    const dailyScheduleRule = new events.Rule(this, 'DailyScheduleRule', {
      ruleName: `${envName}-daily-schedule`,
      description: `Daily scheduled event for ${envName} environment`,
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '0',
        day: '*',
        month: '*',
        year: '*',
      }),
      enabled: envName !== 'prod', // 本番は無効化（必要に応じて有効化）
    });

    dailyScheduleRule.addTarget(
      new targets.LambdaFunction(lambdaFunction, {
        event: events.RuleTargetInput.fromObject({
          source: 'scheduled-event',
          type: 'daily',
          environment: envName,
        }),
      })
    );

    // カスタムイベントルール
    const customEventRule = new events.Rule(this, 'CustomEventRule', {
      ruleName: `${envName}-custom-event-rule`,
      description: `Custom event rule for ${envName} environment`,
      eventBus: this.eventBus,
      eventPattern: {
        source: [`${envName}.app`],
        detailType: ['OrderCreated', 'OrderUpdated', 'OrderDeleted'],
      },
    });

    customEventRule.addTarget(
      new targets.LambdaFunction(lambdaFunction, {
        retryAttempts: 3,
        maxEventAge: cdk.Duration.hours(1),
      })
    );

    // エラー通知用ルール（デッドレターキュー的な使い方）
    const errorEventRule = new events.Rule(this, 'ErrorEventRule', {
      ruleName: `${envName}-error-event-rule`,
      description: `Error event rule for ${envName} environment`,
      eventBus: this.eventBus,
      eventPattern: {
        source: [`${envName}.app`],
        detailType: ['Error', 'Warning'],
      },
    });

    errorEventRule.addTarget(
      new targets.LambdaFunction(lambdaFunction, {
        event: events.RuleTargetInput.fromObject({
          type: 'error-notification',
          originalEvent: events.EventField.fromPath('$'),
        }),
      })
    );

    // アーカイブ設定（イベントの保存）
    const archive = new events.Archive(this, 'EventArchive', {
      archiveName: `${envName}-event-archive`,
      description: `Event archive for ${envName} environment`,
      eventPattern: {
        source: [{ prefix: `${envName}` }] as any,
      },
      sourceEventBus: this.eventBus,
      retention: cdk.Duration.days(envName === 'prod' ? 90 : 30),
    });

    // Outputs
    new cdk.CfnOutput(this, 'EventBusArn', {
      value: this.eventBus.eventBusArn,
      description: 'Custom EventBus ARN',
      exportName: `${envName}-event-bus-arn`,
    });

    new cdk.CfnOutput(this, 'EventBusName', {
      value: this.eventBus.eventBusName,
      description: 'Custom EventBus name',
      exportName: `${envName}-event-bus-name`,
    });

    new cdk.CfnOutput(this, 'ArchiveName', {
      value: archive.archiveName,
      description: 'Event archive name',
      exportName: `${envName}-event-archive-name`,
    });
  }
}
