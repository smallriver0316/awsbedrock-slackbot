# AWS Bedrock Slack bot

This is slack bot backend to access Amazon Bedrock from Slack.

## Setup

```bash
$ cdk --version
2.1016.1 (build 6de56b2)

$ pipenv --version
pipenv, version 2024.0.1
```

## How to deploy

### Create Slack app

At first, create slack account and the workspace beforehand.

* Access to [https://api.slack.com/apps](https://api.slack.com/apps).
* Create New App from scratch.
* Enter your app name and select your slack workspace.
* Move to the menu of OAuth & Permissions and create bot token.
  * Add `chat:write` and `files:write` as an OAuth Scope.
  * Then you can get Bot User OAuth Token.

Copy the Signing Secret and Bot User OAuth Token for deployment of AWS services.

About the settings of this app, also refer to slack_manifest.yml here.

### Install python packages for lambda functions

Install python packages by following commands before deployment.

requirements.txt exists in each function's directory. So if need to update it, execute `pipenv requirements > requirements.txt`.

```bash
cd lambda_functions/starter/
pipenv requirements > requirements.txt
pip install -r requirements.txt -t src/

cd ../worker/
pipenv requirements > requirements.txt
pip install -r requirements.txt -t src/
```

### Deploy services

Set the slack secret and token to config/slack_config.ts.

```ts
export const slackConfig = {
  `<MODEL_NAME>`: {
    SLACK_BOT_TOKEN: '<bot user oauth token>',
    SLACK_SIGNING_SECRET: '<signing secret>',
  }
};
```

Then execute deployment.

```bash
# setting environment variables is necessary at every time
export AWS_PROFILE=<Your target profile>
export CDK_DEPLOY_ACCOUNT=<Your account id>
export CDK_DEPLOY_REGION=<Your target region>

# cdk bootstrap is necessary only at first
cdk synth
cdk bootstrap

# deploy stack
cdk deploy
# deploy with stage name(default is dev)
cdk deploy -c stage=<stage name>
```

### Set Event Subscription

* Copy the URL of API Gateway which you deployed in AWS console.
* Go back to the slack app setting page and move to the Event Subscriptions menu.
* Enable Events and set the URL as Request URL.
  * Then the subscription will be verified automatically.
* Select which bot events to subscribe from "Subscribe bot events".
  * Select `app_mention:read`.
* Install your app.
* Integrate your app on Slack desktop app.

Then you can communicate with your chat bot!

## FYI: AWS CDK's useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template
