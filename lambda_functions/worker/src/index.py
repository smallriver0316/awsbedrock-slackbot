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
    msg_body = event.get("body", {}) if event is not None else {}
    channel_id = msg_body.get("channel_id", None)
    input_text = msg_body.get("input_text", None)

    if channel_id is None or input_text is None:
      logger.error(f"Invalid request: {json.dumps(msg_body)}")
      raise Exception("channel_id or input_text is None!")

    result = slack_client.chat_postMessage(
      channel=channel_id,
      text="Your message accepted!"
    )

    logger.debug(result)
  except Exception as e:
    logger.error(e)
    slack_client.chat_postMessage(
      channel=channel_id,
      text=f"Error occured: {e}"
    )
