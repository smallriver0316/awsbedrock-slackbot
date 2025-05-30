import boto3
import json
import logging
import os
import re
from slack_bolt import App
from slack_bolt.adapter.aws_lambda import SlackRequestHandler

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

REGION = os.environ.get("AWS_REGION", "")
STAGE = os.environ.get("STAGE", "")
WORKER_FUNCTION_NAME = os.environ.get("WORKER_FUNCTION_NAME", "")

ssm = boto3.client("ssm", region_name=REGION)
lambda_client = boto3.client("lambda", region_name=REGION)

params = ssm.get_parameters_by_path(
  Path=f"/bedrock-slackbot/${STAGE}/",
  Recursive=True,
  WithDecryption=True
)

for param in params["Parameters"]:
    if param["Name"].endswith("STABLE_IMAGE_ULTRA/SLACK_BOT_TOKEN"):
        SLACK_BOT_TOKEN = param["Value"]
    if param["Name"].endswith("STABLE_IMAGE_ULTRA/SLACK_SIGNING_SECRET"):
        SLACK_SIGNING_SECRET = param["Value"]

app = App(
    token=SLACK_BOT_TOKEN,
    signing_secret=SLACK_SIGNING_SECRET,
    process_before_response=True)


@app.event("app_mention")
def handle_app_mention_events(event, say):
  logger.debug(event)

  channel_id = event.get("channel", "")
  input_text = re.sub("<@.+>", "", event.get("text", "")).strip()

  if not WORKER_FUNCTION_NAME:
    logger.error("Worker function name not found!")
    say("Worker function name not found!")
    return

  response = lambda_client.invoke(
    FunctionName=WORKER_FUNCTION_NAME,
    InvocationType="Event",
    Payload=json.dumps({
      "channel_id": channel_id,
      "input_text": input_text
    })
  )

  if response["StatusCode"] != 202:
    logger.error("Failed to invoke worker function!")
    say("Failed to invoke worker function!")


def handler(event, context):
  logger.debug(event)
  slack_handler = SlackRequestHandler(app=app)
  return slack_handler.handle(event, context)
