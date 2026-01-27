import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface ApiGatewayStackProps extends cdk.StackProps {
  envName: string;
  lambdaFunction: lambda.Function;
}

export class ApiGatewayStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: ApiGatewayStackProps) {
    super(scope, id, props);

    const { envName, lambdaFunction } = props;

    // アクセスログ用のロググループ
    const accessLogGroup = new logs.LogGroup(this, 'ApiAccessLogs', {
      logGroupName: `/aws/apigateway/${envName}-api-access-logs`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // REST API
    this.api = new apigateway.RestApi(this, 'Api', {
      restApiName: `${envName}-api`,
      description: `API Gateway for ${envName} environment`,
      deployOptions: {
        stageName: envName,
        accessLogDestination: new apigateway.LogGroupLogDestination(accessLogGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
          caller: true,
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: true,
        }),
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: envName !== 'prod',
        tracingEnabled: true,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
      },
      endpointTypes: [apigateway.EndpointType.REGIONAL],
    });

    // Lambda統合
    const lambdaIntegration = new apigateway.LambdaIntegration(lambdaFunction, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
    });

    // /health エンドポイント
    const healthResource = this.api.root.addResource('health');
    healthResource.addMethod('GET', lambdaIntegration);

    // /api エンドポイント
    const apiResource = this.api.root.addResource('api');

    // /api/v1
    const v1Resource = apiResource.addResource('v1');

    // /api/v1/items
    const itemsResource = v1Resource.addResource('items');
    itemsResource.addMethod('GET', lambdaIntegration);
    itemsResource.addMethod('POST', lambdaIntegration);

    // /api/v1/items/{id}
    const itemResource = itemsResource.addResource('{id}');
    itemResource.addMethod('GET', lambdaIntegration);
    itemResource.addMethod('PUT', lambdaIntegration);
    itemResource.addMethod('DELETE', lambdaIntegration);

    // APIキー（オプション）
    const apiKey = this.api.addApiKey('ApiKey', {
      apiKeyName: `${envName}-api-key`,
      description: `API Key for ${envName} environment`,
    });

    // 使用量プラン
    const usagePlan = this.api.addUsagePlan('UsagePlan', {
      name: `${envName}-usage-plan`,
      description: `Usage plan for ${envName} environment`,
      throttle: {
        rateLimit: 100,
        burstLimit: 200,
      },
      quota: {
        limit: 10000,
        period: apigateway.Period.DAY,
      },
    });

    usagePlan.addApiKey(apiKey);
    usagePlan.addApiStage({
      stage: this.api.deploymentStage,
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'API Gateway URL',
      exportName: `${envName}-api-url`,
    });

    new cdk.CfnOutput(this, 'ApiId', {
      value: this.api.restApiId,
      description: 'API Gateway ID',
      exportName: `${envName}-api-id`,
    });

    new cdk.CfnOutput(this, 'ApiKeyId', {
      value: apiKey.keyId,
      description: 'API Key ID',
      exportName: `${envName}-api-key-id`,
    });
  }
}
