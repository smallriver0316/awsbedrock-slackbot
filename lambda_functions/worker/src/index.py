import boto3
import logging
import os
from slack_sdk import WebClient
from claude_sonnet import invoke_model as invoke_claude_sonnet
from stable_image_ultra import invoke_model as invoke_stable_image_ultra

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

REGION = os.environ.get("AWS_REGION", "")
STAGE = os.environ.get("STAGE", "")

ssm = boto3.client("ssm", region_name=REGION)


def create_slack_client(model: str | None) -> WebClient:
  if not model:
    raise Exception("Model name is not provided!")

  param = ssm.get_parameter(
    Name=f"/bedrock-slackbot/{STAGE}/{model.upper()}/SLACK_BOT_TOKEN",
    WithDecryption=True,
  )

  SLACK_BOT_TOKEN = param["Parameter"]["Value"]
  return WebClient(token=SLACK_BOT_TOKEN)


def handler(event, context) -> None:
  logger.debug(event)

  try:
    model = event.get("model", None)
    slack_client = create_slack_client(model)

    channel_id = event.get("channel_id", None)
    input_text = event.get("input_text", None)

    match model:
      case "claude_sonnet":
        invoke_claude_sonnet(channel_id, input_text, slack_client)
      case "stable_image_ultra":
        invoke_stable_image_ultra(channel_id, input_text, slack_client)
      case _:
        logger.error(f"Invalid model: {model}")
  except Exception as e:
    logger.error(f"Error occurred: {e}")
