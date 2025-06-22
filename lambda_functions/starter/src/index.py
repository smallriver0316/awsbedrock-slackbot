import logging
from slack_bolt.adapter.aws_lambda import SlackRequestHandler
from slack_app import SlackApp

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


def endpoint2model(endpoint: str) -> str:
  match endpoint:
    case "/stable_image_ultra":
      return "stable_image_ultra"
    case "/claude_sonnet":
      return "claude_sonnet"
    case _:
      raise Exception(f"Request from invalid endpoint: {endpoint}!")


def handler(event, context):
  logger.debug(event)
  try:
    endpoint = event.get("resource","")
    model_name = endpoint2model(endpoint)
    slack_app = SlackApp(model_name)
    slack_handler = SlackRequestHandler(app=slack_app.app)
    return slack_handler.handle(event, context)
  except Exception as e:
    logger.error(f"Error occurred: {e}")
