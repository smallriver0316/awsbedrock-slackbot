import logging
from stable_image_ultra import invoke_model as invoke_stable_image_ultra

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


def handler(event, context) -> None:
  logger.debug(event)

  model = event.get("model", None)
  channel_id = event.get("channel_id", None)
  input_text = event.get("input_text", None)

  match model:
    case "stable_image_ultra":
      invoke_stable_image_ultra(channel_id, input_text)
    case _:
      logger.error(f"Invalid model: {model}")
