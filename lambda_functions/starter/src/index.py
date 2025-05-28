import boto3
import json
import logging
import os

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

REGION = os.environ.get("AWS_REGION", "")
WORKER_FUNCTION_NAME = os.environ.get("WORKER_FUNCTION_NAME", "")

lambda_client = boto3.client("lambda", region_name=REGION)


def handler(event, context):
  logger.debug(event)

  event_body = event.get("body", {})

  if WORKER_FUNCTION_NAME:
    response = lambda_client.invoke(
      FunctionName=WORKER_FUNCTION_NAME,
      InvocationType="Event",
      Payload=json.dumps(event_body)
    )

    return {
      "statusCode": 200,
      "body": json.dumps({"message": "Worker function invoked."})
    }

  return {
    "statusCode": 500,
    "body": json.dumps({"error": "WORKER_FUNCTION_NAME is not set."})
  }
