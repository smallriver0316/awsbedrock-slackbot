import json
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


def handler(event, context):
  logger.debug(event)

  event_body = event.get("body", {})

  return {
    "statusCode": 200,
    "body": json.dumps(event_body)
  }
