from flask import Flask, request, jsonify
from flask_cors import CORS
import g4f
from g4f import Provider
import logging
import warnings
import datetime
import json
import re
import base64
from urllib.parse import urlparse
from jsonschema import validate, ValidationError
import asyncio
from concurrent.futures import ThreadPoolExecutor
import argparse

# Add argument parsing for dynamic port assignment
parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=5000)
args = parser.parse_args()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# Suppress Flask development server warnings
warnings.filterwarnings('ignore', message='This is a development server.')

app = Flask(__name__)
CORS(app)  # Enable CORS

# Add provider configuration
PROVIDER_CONFIGS = {
    'PRIMARY': [
        Provider. Blackbox,
        Provider. DarkAI,
        Provider.ChatGptt,
        Provider. FreeGpt,
    ],
    'FALLBACK': [
        Provider.DarkAI,
        Provider.PollinationsAI,
        Provider.Blackbox,
    ]
}

class ProviderManager:
    def __init__(self):
        self.primary_providers = PROVIDER_CONFIGS['PRIMARY']
        self.fallback_providers = PROVIDER_CONFIGS['FALLBACK']
        self.current_provider_index = 0
        self.fallback_index = 0
        self.executor = ThreadPoolExecutor(max_workers=4)

    def get_next_provider(self):
        """Rotate through providers"""
        provider = self.primary_providers[self.current_provider_index]
        self.current_provider_index = (self.current_provider_index + 1) % len(self.primary_providers)
        return provider

    def get_fallback_provider(self):
        """Get next fallback provider"""
        provider = self.fallback_providers[self.fallback_index]
        self.fallback_index = (self.fallback_index + 1) % len(self.fallback_providers)
        return provider

    def try_provider(self, provider, messages, config):
        """Synchronous provider attempt"""
        try:
            response = g4f.ChatCompletion.create(
                model="gpt-4o",
                provider=provider,
                messages=messages,
                temperature=config['temperature'],
                max_tokens=config['max_tokens'],
                stream=False
            )
            return response
        except Exception as e:
            logging.error(f"Provider {provider.__name__} failed: {str(e)}")
            return None

    def create_completion(self, messages, config):
        """Synchronous completion with fallbacks"""
        errors = []
        
        # Try primary providers
        for _ in range(len(self.primary_providers)):
            provider = self.get_next_provider()
            response = self.try_provider(provider, messages, config)
            if response:
                return response
            errors.append(f"{provider.__name__}: failed")

        # Try fallback providers
        for provider in self.fallback_providers:
            response = self.try_provider(provider, messages, config)
            if response:
                return response
            errors.append(f"{provider.__name__}: failed")

        raise Exception(f"All providers failed: {'; '.join(errors)}")

# Initialize provider manager
provider_manager = ProviderManager()

# Disable Flask logging except for errors
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

# Add model configuration constants
GPT_MODELS = {
    "gpt-4": "gpt-4o",
    "gpt-3.5": "gpt-3.5-turbo",
    "claude": "claude-v2",
    "gemini": "google/gemini-pro"
}

DEFAULT_CONFIG = {
    "temperature": 0.7,
    "max_tokens": 1000,
    "top_p": 1.0,
    "frequency_penalty": 0.0,
    "presence_penalty": 0.0,
    "stop": None,
    "model": GPT_MODELS["gpt-4"],
    "stream": False
}

def validate_config(config):
    """Validate and merge with default configuration"""
    validated = DEFAULT_CONFIG.copy()
    if config:
        for key in DEFAULT_CONFIG:
            if key in config:
                validated[key] = config[key]
    return validated

def extract_json_from_response(content):
    """Extract JSON from response content"""
    try:
        # Try direct JSON parsing first
        return json.loads(content)
    except:
        # Try to find JSON in markdown blocks
        pattern = r'```(?:json)?\s*([\s\S]*?)\s*```'
        matches = re.findall(pattern, content)
        if matches:
            try:
                return json.loads(matches[0])
            except:
                pass
    return {"content": content}

def validate_image_url(url):
    """Validate image URL or base64"""
    if url.startswith('data:'):
        raise ValueError("Direct base64 images are not supported")
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except:
        return False

def process_function_call(messages, function_name, args):
    """Handle function calling in messages"""
    try:
        return {
            "role": "assistant",
            "content": None,
            "function_call": {
                "name": function_name,
                "arguments": json.dumps(args)
            }
        }
    except Exception as e:
        logging.error(f"Function call processing error: {str(e)}")
        raise

def validate_response_format(response_format):
    """Validate and process response format configuration"""
    if not response_format or 'type' not in response_format:
        return None
        
    if response_format['type'] == 'json_schema':
        try:
            schema = response_format.get('json_schema', {}).get('schema', {})
            strict = response_format.get('json_schema', {}).get('strict', False)
            return {
                'schema': schema,
                'strict': strict,
                'name': response_format.get('json_schema', {}).get('name', 'response')
            }
        except Exception as e:
            logging.error(f"Invalid JSON schema: {str(e)}")
            raise ValueError("Invalid JSON schema format")
    return None

def validate_json_response(content, schema):
    """Validate response against JSON schema"""
    try:
        if isinstance(content, str):
            content = json.loads(content)
        validate(instance=content, schema=schema)
        return content
    except ValidationError as e:
        logging.error(f"JSON Schema validation error: {str(e)}")
        return None
    except Exception as e:
        logging.error(f"JSON parsing error: {str(e)}")
        return None

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        if not request.is_json:
            logging.error("Request Content-Type is not application/json")
            return jsonify({
                'success': False,
                'error': 'Content-Type must be application/json'
            }), 400

        data = request.get_json(force=True, silent=True)
        if not data:
            logging.error("Failed to parse JSON data")
            return jsonify({
                'success': False,
                'error': 'Invalid JSON data'
            }), 400

        if 'message' not in data:
            logging.error("No message field in request")
            return jsonify({
                'success': False,
                'error': 'Message field is required'
            }), 400

        # Extract message and configuration
        message = data.get('message', '')
        config = validate_config(data.get('config', {}))
        system_prompt = data.get('system_prompt', 'You are a helpful AI assistant.')

        # Construct messages array
        messages = message

        # Add conversation history if provided
        if 'conversation' in data:
            messages[1:1] = data['conversation']

        logging.info(f"Processing message with config: {config}")
        
        # Extract configuration
        config = validate_config(data.get('config', {}))
        messages = data.get('message', [])
        structured_outputs = data.get('structured_outputs', False)
        function_name = data.get('function_name')
        function_args = data.get('args')
        
        # Validate messages structure
        if not isinstance(messages, list):
            return jsonify({'success': False, 'error': 'Messages must be an array'}), 400

        # Process image URLs if present
        for message in messages:
            if isinstance(message.get('content'), list):
                for content in message['content']:
                    if content.get('type') == 'image_url':
                        image_url = content.get('image_url', {}).get('url')
                        if not validate_image_url(image_url):
                            return jsonify({'success': False, 'error': 'Invalid image URL'}), 400

        # Handle function calling
        if function_name and function_args:
            function_response = process_function_call(messages, function_name, function_args)
            return jsonify({
                'success': True,
                'choices': [{
                    'message': function_response
                }]
            })

        # Extract schema configuration
        response_format = data.get('response_format')
        schema_config = validate_response_format(response_format)
        
        # Modify system message if JSON schema is required
        if schema_config:
            schema_instruction = f"""
            You must respond with a valid JSON object that follows this schema:
            {json.dumps(schema_config['schema'], indent=2)}
            The response must be strictly valid JSON with no additional text or markdown.
            """
            messages.insert(0, {
                "role": "system",
                "content": schema_instruction
            })

        try:
            response = provider_manager.create_completion(messages, config)
            
            if isinstance(response, str):
                content = response
            else:
                content = response

            # Validate against schema if required
            if schema_config:
                validated_content = validate_json_response(content, schema_config['schema'])
                if not validated_content and schema_config['strict']:
                    raise ValueError("Response failed schema validation")
                content = validated_content or content

            result = {
                'success': True,
                'choices': [{
                    'message': {
                        'content': content,
                        'role': 'assistant'
                    }
                }],
                'schema_validated': bool(schema_config and validated_content),
                'timestamp': datetime.datetime.utcnow().isoformat()
            }

            return jsonify(result)

        except Exception as e:
            logging.error(f"Provider error: {str(e)}")
            raise

    except Exception as e:
        logging.exception("Error in chat endpoint")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.datetime.utcnow().isoformat()
        }), 500

# Add model information endpoint
@app.route('/api/models', methods=['GET'])
def get_models():
    return jsonify({
        'success': True,
        'models': GPT_MODELS,
        'default_config': DEFAULT_CONFIG
    })

# Add provider status endpoint
@app.route('/api/providers/status', methods=['GET'])
def get_provider_status():
    status = {
        'primary': [p.__name__ for p in PROVIDER_CONFIGS['PRIMARY']],
        'fallback': [p.__name__ for p in PROVIDER_CONFIGS['FALLBACK']],
        'current': provider_manager.get_next_provider().__name__
    }
    return jsonify(status)

if __name__ == '__main__':
    print(f"Starting GPT service on port {args.port}...")
    app.run(port=args.port, debug=False)