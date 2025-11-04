# Local LLM Express API

A TypeScript Express.js API server that acts as a proxy to Ollama's chat API.

## Prerequisites

- Node.js (v18 or higher)
- Ollama installed and running locally (default: http://localhost:11434)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Build the TypeScript code:
```bash
npm run build
```

## Usage

1. Make sure Ollama is running on your machine
2. Start the Express server:
```bash
npm start
```

For development with auto-reload (TypeScript):
```bash
npm run dev
```

To type-check without building:
```bash
npm run type-check
```

The server will start on `http://localhost:3000` by default.

## API Endpoints

### POST /api/chat

Send a chat message to the LLM and receive a response.

**Request Body (Simple format):**
```json
{
  "message": "Hello, how are you?",
  "model": "llama3.1",
  "system": "You are a helpful assistant."
}
```

**Request Body (Advanced format with conversation history):**
```json
{
  "messages": [
    { "role": "user", "content": "What is the capital of France?" },
    { "role": "assistant", "content": "The capital of France is Paris." },
    { "role": "user", "content": "What is its population?" }
  ],
  "model": "llama3.1",
  "system": "You are a geography expert."
}
```

**Parameters:**
- `message` (optional): A single user message (for simple requests)
- `messages` (optional): Array of message objects with `role` and `content` (for conversation history)
- `model` (optional): The Ollama model to use (default: "llama3.1")
- `system` (optional): System prompt to set the assistant's behavior
- `stream` (optional): Whether to stream the response (default: false)

**Note:** Either `message` or `messages` must be provided.

**Response:**
```json
{
  "success": true,
  "model": "llama3.1",
  "response": "I'm doing well, thank you for asking!",
  "message": {
    "role": "assistant",
    "content": "I'm doing well, thank you for asking!"
  },
  "done": true,
  "created_at": "2024-01-01T00:00:00.000Z",
  "total_duration": 1234567890,
  "load_duration": 123456,
  "prompt_eval_count": 10,
  "prompt_eval_duration": 123456789,
  "eval_count": 25,
  "eval_duration": 987654321
}
```

**Example using curl (simple):**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the capital of France?"}'
```

**Example using curl (with conversation history):**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello!"},
      {"role": "assistant", "content": "Hi there! How can I help?"},
      {"role": "user", "content": "Tell me a joke"}
    ],
    "model": "llama3.1"
  }'
```

### GET /api/models

Get a list of available Ollama models.

**Response:**
```json
{
  "success": true,
  "models": [
    {
      "name": "llama3.1",
      "modified_at": "2024-01-01T00:00:00.000Z",
      "size": 1234567890,
      "digest": "sha256:..."
    }
  ]
}
```

### GET /health

Health check endpoint to verify the server is running.

**Response:**
```json
{
  "status": "ok",
  "message": "Server is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Environment Variables

- `PORT`: Server port (default: 3000)
- `OLLAMA_HOST`: Ollama API host URL (default: http://localhost:11434)

Example:
```bash
PORT=4000 OLLAMA_HOST=http://localhost:11434 npm start
```

