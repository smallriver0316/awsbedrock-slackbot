import base64
import boto3
import json
import os
import logging
from datetime import datetime
from slack_sdk import WebClient


logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

MODEL_ID = "stability.stable-image-ultra-v1:1"
REGION = os.environ.get("AWS_REGION", "")
STAGE = os.environ.get("STAGE", "")

bedrock_runtime = boto3.client("bedrock-runtime", region_name=REGION)
ssm = boto3.client("ssm", region_name=REGION)

param = ssm.get_parameter(
    Name=f"/bedrock-slackbot/{STAGE}/STABLE_IMAGE_ULTRA/SLACK_BOT_TOKEN",
    WithDecryption=True,
)

SLACK_BOT_TOKEN = param["Parameter"]["Value"]
slack_client = WebClient(token=SLACK_BOT_TOKEN)


def invoke_model(channel_id: str | None, input_text: str | None) -> None:
  try:
    if channel_id is None or input_text is None:
      logger.error(f"Invalid request: channel ID={channel_id}, input text={input_text}")
      raise Exception(f"Invalid request: channel ID={channel_id}, input text={input_text}")

    current_dt = datetime.now()

    response = bedrock_runtime.invoke_model(
        modelId=MODEL_ID,
        contentType="application/json",
        accept="application/json",
        body=json.dumps(
            {
              "prompt": input_text,
              "mode": "text-to-image",
              "aspect_ratio": "16:9",
              "output_format": "png",
            }
        )
    )

    output_body = json.loads(response["body"].read().decode("utf-8"))
    base64_output_image = output_body["images"][0]
    image_data = base64.b64decode(base64_output_image)

    result = slack_client.files_upload_v2(
      channel=channel_id,
      content=image_data,
      filename=f"{current_dt.strftime('%Y-%m-%dT%H:%M:%S')}.png",
      title=f"Input text: {input_text}",
      initial_comment="Generated image from Stable Image Ultra",
    )

    logger.debug(result)
  except Exception as e:
    logger.error(f"Error invoking model: {e}")
    if channel_id:
      slack_client.chat_postMessage(
          channel=channel_id,
          text=f"Error occurred: {e}",
      )
