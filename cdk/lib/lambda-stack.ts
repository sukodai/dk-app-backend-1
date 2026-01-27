import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';

export interface LambdaStackProps extends cdk.StackProps {
  envName: string;
}

export class LambdaStack extends cdk.Stack {
  public readonly sampleFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    const { envName } = props;

    // Lambda関数（サンプル - インラインコード）
    this.sampleFunction = new lambda.Function(this, 'SampleFunction', {
      functionName: `${envName}-sample-function`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Event:', JSON.stringify(event, null, 2));
          console.log('Environment:', '${envName}');

          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: 'Hello from ${envName} environment!',
              timestamp: new Date().toISOString(),
              event: event,
            }),
          };
        };
      `),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        ENV_NAME: envName,
        NODE_OPTIONS: '--enable-source-maps',
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      tracing: lambda.Tracing.ACTIVE,
    });

    // 本番用のLambda関数（ファイルからデプロイする場合の例）
    // ※ 実際のLambdaコードは lambda/ ディレクトリに配置
    // const mainFunction = new lambda.Function(this, 'MainFunction', {
    //   functionName: `${envName}-main-function`,
    //   runtime: lambda.Runtime.NODEJS_20_X,
    //   handler: 'index.handler',
    //   code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/main')),
    //   timeout: cdk.Duration.seconds(30),
    //   memorySize: 512,
    //   environment: {
    //     ENV_NAME: envName,
    //   },
    // });

    // Outputs
    new cdk.CfnOutput(this, 'SampleFunctionArn', {
      value: this.sampleFunction.functionArn,
      description: 'Sample Lambda function ARN',
      exportName: `${envName}-sample-function-arn`,
    });

    new cdk.CfnOutput(this, 'SampleFunctionName', {
      value: this.sampleFunction.functionName,
      description: 'Sample Lambda function name',
      exportName: `${envName}-sample-function-name`,
    });
  }
}
