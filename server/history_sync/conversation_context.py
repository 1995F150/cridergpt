"""Model-independent text context; saved history remains untouched."""
import json


def text_context(history, latest, limit=4):
    def usable(message):
        if not isinstance(message.get('content'), str) or not message['content'].strip():
            return False
        metadata = message.get('metadata', {})
        if 'metadata_json' in message:
            try:
                metadata = json.loads(message['metadata_json'] or '{}')
            except (ValueError, TypeError):
                return False
        if not isinstance(metadata, dict):
            return False
        return not (
            metadata.get('incomplete') or metadata.get('model_output_incomplete')
            or metadata.get('images') or metadata.get('image_url')
            or metadata.get('answer_origin') in {'pipeline_error', 'image_model'}
            or metadata.get('finish_reason') in {
                'image_complete', 'internal_inference_error', 'transport_interruption',
                'client_cancelled', 'server_timeout', 'token_limit', 'context_length_exceeded'
            }
        )

    pairs = []
    # Examine original adjacency: dropping an invalid turn first could join
    # an older question to the wrong assistant response.
    for user, assistant in zip(history, history[1:]):
        if user.get('role') == 'user' and assistant.get('role') == 'assistant' and usable(user) and usable(assistant):
            pairs.append([{'role': item['role'], 'content': item['content']} for item in (user, assistant)])
    return [item for pair in pairs[-limit:] for item in pair] + [{'role': 'user', 'content': latest}]
