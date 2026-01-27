#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as fs from 'fs';
import * as path from 'path';
import { GitHubOidcStack } from '../lib/github-oidc-stack';

/**
 * GitHub OIDC認証のセットアップ用スクリプト
 *
 * 使用方法:
 *   npx ts-node bin/setup-oidc.ts -c env=dev -c githubOrg=YOUR_ORG -c githubRepo=YOUR_REPO
 *
 * または:
 *   CDK_ENV=dev GITHUB_ORG=YOUR_ORG GITHUB_REPO=YOUR_REPO npx cdk deploy -a "npx ts-node bin/setup-oidc.ts"
 */

const app = new cdk.App();

// 環境設定の読み込み
const envName = process.env.CDK_ENV || app.node.tryGetContext('env') || 'dev';
const githubOrg = process.env.GITHUB_ORG || app.node.tryGetContext('githubOrg');
const githubRepo = process.env.GITHUB_REPO || app.node.tryGetContext('githubRepo');

if (!githubOrg || !githubRepo) {
  console.error('Error: GitHub organization and repository are required');
  console.error('Usage: npx cdk deploy -c env=dev -c githubOrg=YOUR_ORG -c githubRepo=YOUR_REPO -a "npx ts-node bin/setup-oidc.ts"');
  process.exit(1);
}

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

const env: cdk.Environment = {
  account: config.account,
  region: config.region,
};

new GitHubOidcStack(app, `${config.envName}-github-oidc`, {
  env,
  envName: config.envName,
  githubOrg,
  githubRepo,
  description: `GitHub OIDC setup for ${config.description}`,
  tags: {
    Environment: config.envName,
    ManagedBy: 'CDK',
    Purpose: 'github-oidc',
  },
});

app.synth();
