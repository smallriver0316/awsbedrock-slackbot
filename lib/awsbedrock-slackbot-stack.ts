import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import * as path from 'node:path';
import { slackConfig } from '../config/slack_config';

export class AwsbedrockSlackbotStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const stage = this.node.tryGetContext('stage') || 'dev';
    const accountId = cdk.Stack.of(this).account;
    const region = cdk.Stack.of(this).region;

    // Bedrock Inference Profile
    const inferenceProfileForClaudeSonnet = new bedrock.CfnApplicationInferenceProfile(this, `ApplicationInferenceProfileForClaudeSonnet-${stage}`, {
      inferenceProfileName: `awsbedrock-slack-bot-inf-profile-${stage}`,
      description: 'Bedrock Application Inference Profile for Claude Sonnet',
      modelSource: {
        copyFrom: `arn:aws:bedrock:${region}:${accountId}:inference-profile/us.anthropic.claude-sonnet-4-20250514-v1:0`
      },
      tags: [{
        key: 'AppName',
        value: 'awsbedrock-slackbot'
      }, {
        key: 'Stage',
        value: stage
      }, {
        key: 'Model',
        value: 'claude-sonnet-4'
      }]
    });

    const inferenceProfileForClaudeOpus = new bedrock.CfnApplicationInferenceProfile(this, `ApplicationInferenceProfileForClaudeOpus-${stage}`, {
      inferenceProfileName: `awsbedrock-slack-bot-opus-inf-profile-${stage}`,
      description: 'Bedrock Application Inference Profile for Claude Opus',
      modelSource: {
        copyFrom: `arn:aws:bedrock:${region}:${accountId}:inference-profile/us.anthropic.claude-opus-4-20250514-v1:0`
      },
      tags: [{
        key: 'AppName',
        value: 'awsbedrock-slackbot'
      }, {
        key: 'Stage',
        value: stage
      }, {
        key: 'Model',
        value: 'claude-opus-4'
      }]
    });

    // SSM parameters
    // Stable Image Ultra v1:1
    new StringParameter(this, `StableImageUltraSlackBotToken-${stage}`, {
      parameterName: `/bedrock-slackbot/${stage}/STABLE_IMAGE_ULTRA/SLACK_BOT_TOKEN`,
      stringValue: slackConfig.STABLE_IMAGE_ULTRA.SLACK_BOT_TOKEN,
      description: 'Slack bot token for the app to access Stable Image Ultra',
    });
    new StringParameter(this, `StableImageUltraSlackBotSigningSecret-${stage}`, {
      parameterName: `/bedrock-slackbot/${stage}/STABLE_IMAGE_ULTRA/SLACK_BOT_SIGNING_SECRET`,
      stringValue: slackConfig.STABLE_IMAGE_ULTRA.SLACK_SIGNING_SECRET,
      description: 'Slack bot signing secret for the app to access Stable Image Ultra'
    });
    // claude4 sonnet
    new StringParameter(this, `ClaudeSonnetSlackBotToken-${stage}`, {
      parameterName: `/bedrock-slackbot/${stage}/CLAUDE_SONNET/SLACK_BOT_TOKEN`,
      stringValue: slackConfig.CLAUDE_SONNET.SLACK_BOT_TOKEN,
      description: 'Slack bot token for the app to access Claude Sonnet',
    });
    new StringParameter(this, `ClaudeSonnetSlackBotSigningSecret-${stage}`, {
      parameterName: `/bedrock-slackbot/${stage}/CLAUDE_SONNET/SLACK_BOT_SIGNING_SECRET`,
      stringValue: slackConfig.CLAUDE_SONNET.SLACK_SIGNING_SECRET,
      description: 'Slack bot signing secret for the app to access Claude Sonnet'
    });
    // claude4 opus
    new StringParameter(this, `ClaudeOpusSlackBotToken-${stage}`, {
      parameterName: `/bedrock-slackbot/${stage}/CLAUDE_OPUS/SLACK_BOT_TOKEN`,
      stringValue: slackConfig.CLAUDE_OPUS.SLACK_BOT_TOKEN,
      description: 'Slack bot token for the app to access Claude Opus',
    });
    new StringParameter(this, `ClaudeOpusSlackBotSigningSecret-${stage}`, {
      parameterName: `/bedrock-slackbot/${stage}/CLAUDE_OPUS/SLACK_BOT_SIGNING_SECRET`,
      stringValue: slackConfig.CLAUDE_OPUS.SLACK_SIGNING_SECRET,
      description: 'Slack bot signing secret for the app to access Claude Opus'
    });

    // lambda functions
    // IAM Role
    const workerLambdaRole = new iam.Role(this, `workerLambdaRole-${stage}`, {
      roleName: `awsbedrock-slackbot-worker-lambda-role-${stage}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        'worker-lambda-policy': new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['bedrock:InvokeModel'],
              resources: ['*'],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
              ],
              resources: [`arn:aws:logs:${region}:${accountId}:log-group:*:*`],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'ssm:GetParameters',
                'ssm:GetParameter',
                'ssm:GetParametersByPath',
              ],
              resources: [`arn:aws:ssm:${region}:${accountId}:parameter/bedrock-slackbot/${stage}/*`],
            }),
          ],
        }),
      },
    });

    // worker lambda
    const workerLambda = new lambda.Function(this, `WorkerLambda-${stage}`, {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda_functions/worker/src'), {
        exclude: ['Pipfile', 'Pipfile.lock', 'requirements.txt', '__pycache__'],
      }),
      role: workerLambdaRole,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      environment: {
        STAGE: stage,
        CLAUDE_SONNET_INFERENCE_PROFILE_ARN: inferenceProfileForClaudeSonnet.attrInferenceProfileArn,
        CLAUDE_OPUS_INFERENCE_PROFILE_ARN: inferenceProfileForClaudeOpus.attrInferenceProfileArn,
      },
    });

    // worker lambda log group
    new LogGroup(this, `WorkerLambdaLogGroup-${stage}`, {
      logGroupName: `/aws/lambda/${workerLambda.functionName}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // IAM Role
    const starterLambdaRole = new iam.Role(this, `StarterLambdaRole-${stage}`, {
      roleName: `awsbedrock-slackbot-starter-lambda-role-${stage}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        'starter-lambda-policy': new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['lambda:InvokeFunction'],
              resources: [`arn:aws:lambda:${region}:${accountId}:function:${workerLambda.functionName}`],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
              ],
              resources: [`arn:aws:logs:${region}:${accountId}:log-group:*:*`],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'ssm:GetParameters',
                'ssm:GetParameter',
                'ssm:GetParametersByPath',
              ],
              resources: [`arn:aws:ssm:${region}:${accountId}:parameter/bedrock-slackbot/${stage}/*`],
            }),
          ],
        }),
      },
    });

    // starter lambda
    const starterLambda = new lambda.Function(this, `StarterLambda-${stage}`, {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda_functions/starter/src'), {
        exclude: ['Pipfile', 'Pipfile.lock', 'requirements.txt', '__pycache__'],
      }),
      role: starterLambdaRole,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      environment: {
        STAGE: stage,
        WORKER_FUNCTION_NAME: workerLambda.functionName
      },
    });

    // starter lambda log group
    new LogGroup(this, `StarterLambdaLogGroup-${stage}`, {
      logGroupName: `/aws/lambda/${starterLambda.functionName}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // API Gateway
    const api = new apigateway.LambdaRestApi(this, `AwsbedrockSlackbotApi-${stage}`, {
      restApiName: 'awsbedrock-slackbot-api',
      handler: starterLambda,
      proxy: false,
      deployOptions: {
        stageName: 'v1',
      }
    });

    const stableImageUltra = api.root.addResource('stable_image_ultra');
    stableImageUltra.addMethod('POST');

    const claudeSonnet = api.root.addResource('claude_sonnet');
    claudeSonnet.addMethod('POST');

    const claudeOpus = api.root.addResource('claude_opus');
    claudeOpus.addMethod('POST');
  }
}
