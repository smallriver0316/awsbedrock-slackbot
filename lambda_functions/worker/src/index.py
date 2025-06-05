import boto3
import json
import logging
import os
from botocore.config import Config
from slack_sdk import WebClient

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

REGION = os.environ.get("AWS_REGION", "")
STAGE = os.environ.get("STAGE", "")

ssm = boto3.client("ssm", region_name=REGION)

param = ssm.get_parameter(
    Name=f"/bedrock-slackbot/{STAGE}/STABLE_IMAGE_ULTRA/SLACK_BOT_TOKEN",
    WithDecryption=True,
)

SLACK_BOT_TOKEN = param["Parameter"]["Value"]
slack_client = WebClient(token=SLACK_BOT_TOKEN)


def handler(event, context):
  logger.debug(event)

  try:
    channel_id = event.get("channel_id", None)
    input_text = event.get("input_text", None)

    if channel_id is None or input_text is None:
      logger.error(f"Invalid request: {json.dumps(event)}")
      raise Exception("channel_id or input_text is None!")

    result = slack_client.chat_postMessage(
      channel=channel_id,
      text="Your message accepted!"
    )

    logger.debug(result)
  except Exception as e:
    logger.error(e)
    if channel_id is not None:
      slack_client.chat_postMessage(
        channel=channel_id,
        text=f"Error occured: {e}"
      )
