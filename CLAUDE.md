# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### CDK Infrastructure
```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch for changes
npm run watch

# Run tests
npm run test

# Deploy to AWS (requires AWS credentials and CDK bootstrap)
export AWS_PROFILE=<profile>
export CDK_DEPLOY_ACCOUNT=<account-id>
export CDK_DEPLOY_REGION=<region>
cdk synth
cdk deploy
cdk deploy -c stage=<stage-name>
```

### Lambda Functions
```bash
# Install Python dependencies for starter function
cd lambda_functions/starter/
pipenv requirements > requirements.txt
pip install -r requirements.txt -t src/

# Install Python dependencies for worker function  
cd lambda_functions/worker/
pipenv requirements > requirements.txt
pip install -r requirements.txt -t src/
```

## Architecture Overview

This is a serverless Slack bot that integrates with AWS Bedrock AI models using a two-lambda pattern:

### Request Flow
1. **Slack Event** → **API Gateway** → **Starter Lambda** → **Worker Lambda** → **Bedrock** → **Slack Response**

### Key Components

**Starter Lambda** (`lambda_functions/starter/src/`):
- Handles Slack webhook events via API Gateway
- Validates Slack signatures using SSM-stored secrets
- Routes requests by endpoint to determine model type
- Asynchronously invokes Worker Lambda with parsed parameters
- Uses Slack Bolt framework for event handling

**Worker Lambda** (`lambda_functions/worker/src/`):
- Processes AI model requests independently 
- Calls AWS Bedrock APIs with user input
- Posts generated content back to Slack channels
- Handles errors by posting error messages to Slack

**Configuration Pattern**:
- Slack credentials stored in AWS SSM Parameter Store per model/stage
- Model-specific routing via API Gateway endpoints (`/stable_image_ultra`)
- Environment-based configuration using `STAGE` parameter

### Model Integration Pattern

Adding new AI models requires:
1. **CDK Stack**: Add SSM parameters for new model's Slack credentials
2. **API Gateway**: Add new resource endpoint in `lib/awsbedrock-slackbot-stack.ts`
3. **Starter Lambda**: Add endpoint mapping in `endpoint2model()` function
4. **Worker Lambda**: Add model case in `handler()` match statement
5. **Model Module**: Create new module following `stable_image_ultra.py` pattern

### Key Files
- `lib/awsbedrock-slackbot-stack.ts`: CDK infrastructure definition
- `config/slack_config.ts`: Slack app credentials (not committed to prod)
- `lambda_functions/starter/src/slack_app.py`: Slack event handling logic
- `lambda_functions/worker/src/stable_image_ultra.py`: Model-specific implementation

### Security Model
- Slack webhook signature verification in starter lambda
- AWS IAM roles with least-privilege access to Bedrock and SSM
- Secrets stored in SSM Parameter Store with encryption
- No hardcoded credentials in lambda code

### Deployment Requirements
- AWS CDK CLI and Node.js for infrastructure
- Python 3.12 and pipenv for lambda functions
- Slack app configuration with proper OAuth scopes (`chat:write`, `files:write`)
- AWS Bedrock model access permissions in target region