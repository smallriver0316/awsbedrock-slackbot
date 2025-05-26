#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AwsbedrockSlackbotStack } from '../lib/awsbedrock-slackbot-stack';

const app = new cdk.App();
new AwsbedrockSlackbotStack(app, 'AwsbedrockSlackbotStack', {
  env: {
    account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION,
  },
});
