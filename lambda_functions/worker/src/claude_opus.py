import boto3
import os
import logging
from slack_sdk import WebClient


logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

MODEL_ID = os.environ.get("CLAUDE_OPUS_INFERENCE_PROFILE_ARN", "")
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

        if MODEL_ID == "":
            logger.error("Model ID is not set in the environment variables.")
            raise Exception("Model ID is not set in the environment variables.")

        response = bedrock_runtime.converse(
          modelId=MODEL_ID,
          messages=[{
            "role": "user",
            "content": [{"text": input_text}]}],
          inferenceConfig={"maxTokens": 512, "temperature": 0.5, "topP": 0.9},
        )
        logger.debug(f"Response from Bedrock: {response}")

        response_text = response["output"]["message"]["content"][0]["text"]
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