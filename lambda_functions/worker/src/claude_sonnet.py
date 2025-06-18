import boto3
import json
import os
import logging
from slack_sdk import WebClient


logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

MODEL_ID = "anthropic.claude-sonnet-4-20250514-v1:0"
REGION = os.environ.get("AWS_REGION", "")

bedrock_runtime = boto3.client("bedrock-runtime", region_name=REGION)


def invoke_model(
  channel_id: str | None,
  input_text: str | None,
  slack_client: WebClient) -> None:
    try:
        if channel_id is None or input_text is None:
            logger.error(f"Invalid request: channel ID={channel_id}, input text={input_text}")
            raise Exception(f"Invalid request: channel ID={channel_id}, input text={input_text}")

        response = bedrock_runtime.invoke_model(
          modelId=MODEL_ID,
          contentType="application/json",
          accept="application/json",
          body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 512,
            "temperature": 0.5,
            "messages": [
              {
                "role": "user",
                "content": [{"type": "text", "text": input_text}]
              }
            ]
          })
        )

        model_response = json.loads(response["body"].read())
        logger.debug(model_response)

        response_text = model_response["content"][0]["text"]
        result = slack_client.chat_postMessage(
          channel=channel_id,
          text=response_text
        )

        logger.debug(result)
    except Exception as e:
        logger.error(f"Error invoking model: {e}")
        if channel_id:
            slack_client.chat_postMessage(
              channel=channel_id,
              text=f"Error occurred: {e}",
            )
