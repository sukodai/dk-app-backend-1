#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as fs from 'fs';
import * as path from 'path';
import { IamStack } from '../lib/iam-stack';
import { LambdaStack } from '../lib/lambda-stack';
import { ApiGatewayStack } from '../lib/api-gateway-stack';
import { EventBridgeStack } from '../lib/eventbridge-stack';

const app = new cdk.App();

// 環境設定の読み込み
const envName = process.env.CDK_ENV || app.node.tryGetContext('env') || 'dev';
const configPath = path.join(__dirname, '../../config', `${envName}.json`);

if (!fs.existsSync(configPath)) {
  throw new Error(`Config file not found: ${configPath}`);
}

interface EnvConfig {
  envName: string;
  account: string;
  region: string;
  description: string;
}

const config: EnvConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// 環境設定
const env: cdk.Environment = {
  account: config.account,
  region: config.region,
};

// スタック名のプレフィックス
const prefix = `${config.envName}-infra`;

// タグ設定
const tags: { [key: string]: string } = {
  Environment: config.envName,
  ManagedBy: 'CDK',
  Project: 'aws-infra',
};

// IAM Stack
const iamStack = new IamStack(app, `${prefix}-iam`, {
  env,
  envName: config.envName,
  description: `IAM resources for ${config.description}`,
  tags,
});

// Lambda Stack
const lambdaStack = new LambdaStack(app, `${prefix}-lambda`, {
  env,
  envName: config.envName,
  description: `Lambda functions for ${config.description}`,
  tags,
});

// API Gateway Stack (depends on Lambda)
const apiGatewayStack = new ApiGatewayStack(app, `${prefix}-api`, {
  env,
  envName: config.envName,
  lambdaFunction: lambdaStack.sampleFunction,
  description: `API Gateway for ${config.description}`,
  tags,
});
apiGatewayStack.addDependency(lambdaStack);

// EventBridge Stack
const eventBridgeStack = new EventBridgeStack(app, `${prefix}-eventbridge`, {
  env,
  envName: config.envName,
  lambdaFunction: lambdaStack.sampleFunction,
  description: `EventBridge rules for ${config.description}`,
  tags,
});
eventBridgeStack.addDependency(lambdaStack);

app.synth();
