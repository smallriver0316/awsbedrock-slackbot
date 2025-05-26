import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
// import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import * as path from 'node:path';
// import { slackConfig } from '../config/slack_config';

export class AwsbedrockSlackbotStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const stage = this.node.tryGetContext('stage');
    const accountId = cdk.Stack.of(this).account;
    const region = cdk.Stack.of(this).region;

    // SSM parameters
    // new StringParameter(this, `SSMParameter4SlackBotToken-${stage}`, {
    //   parameterName: `/awsbedrock-slackbot/${stage}/SLACK_BOT_TOKEN`,
    //   stringValue: slackConfig.SLACK_BOT_TOKEN,
    // });
    // new StringParameter(this, `SSMParameter4SlackBotSigningSecret-${stage}`, {
    //   parameterName: `/awsbedrock-slackbot/${stage}/SLACK_BOT_SIGNING_SECRET`,
    //   stringValue: slackConfig.SLACK_SIGNING_SECRET,
    // });

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
        STAGE: stage
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

    const stableImageUltra11 = api.root.addResource('stable_image_ultra_v1_1');
    stableImageUltra11.addMethod('GET');
  }
}
