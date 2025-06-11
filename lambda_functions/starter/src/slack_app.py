import boto3
import json
import logging
import os
import re
from slack_bolt import App

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

REGION = os.environ.get("AWS_REGION", "")
STAGE = os.environ.get("STAGE", "")
WORKER_FUNCTION_NAME = os.environ.get("WORKER_FUNCTION_NAME", "")

ssm = boto3.client("ssm", region_name=REGION)
lambda_client = boto3.client("lambda", region_name=REGION)


class SlackApp:
  def __init__(self, model_name: str):
    logger.debug(f"model: {model_name} is called.")
    self.model_name = model_name

    params = ssm.get_parameters_by_path(
      Path=f"/bedrock-slackbot/{STAGE}/",
      Recursive=True,
      WithDecryption=True
    )

    SLACK_BOT_TOKEN = None
    SLACK_SIGNING_SECRET = None

    for param in params["Parameters"]:
        if param["Name"].endswith(f"{self.model_name.upper()}/SLACK_BOT_TOKEN"):
            SLACK_BOT_TOKEN = param["Value"]
        if param["Name"].endswith(f"{self.model_name.upper()}/SLACK_BOT_SIGNING_SECRET"):
            SLACK_SIGNING_SECRET = param["Value"]

    if not SLACK_BOT_TOKEN or not SLACK_SIGNING_SECRET:
        raise ValueError("Required Slack credentials not found in SSM parameters")

    self.app = App(
        token=SLACK_BOT_TOKEN,
        signing_secret=SLACK_SIGNING_SECRET,
        process_before_response=True)

    self.app.event("app_mention")(self.handle_app_mention_events)


  def handle_app_mention_events(self, event, say):
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
        "model": self.model_name,
        "channel_id": channel_id,
        "input_text": input_text
      })
    )

    if response["StatusCode"] != 202:
      logger.error("Failed to invoke worker function!")
      say("Failed to invoke worker function!")
