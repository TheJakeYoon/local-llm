import express from 'express';
import ollama from 'ollama';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Main chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, model = 'llama3.1', stream = false, messages } = req.body;

    // Validate request - support both single message and messages array
    if (!message && !messages) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: message or messages'
      });
    }

    // Prepare messages array
    let chatMessages = [];
    if (messages && Array.isArray(messages)) {
      // Use provided messages array
      chatMessages = messages;
    } else {
      // Single message format
      chatMessages = [
        {
          role: 'user',
          content: message
        }
      ];
    }

    // Prepare request to Ollama
    const chatRequest = {
      model: model,
      messages: chatMessages,
      stream: stream
    };

    // Call Ollama API using official SDK
    const response = await ollama.chat(chatRequest);

    // Return response in JSON format
    res.json({
      success: true,
      model: model,
      response: response.message?.content || response.message,
      done: response.done,
      created_at: response.created_at,
      total_duration: response.total_duration,
      load_duration: response.load_duration,
      prompt_eval_count: response.prompt_eval_count,
      prompt_eval_duration: response.prompt_eval_duration,
      eval_count: response.eval_count,
      eval_duration: response.eval_duration
    });

  } catch (error) {
    console.error('Error calling Ollama:', error.message);
    console.error(error.stack);
    
    // Handle errors from Ollama SDK
    if (error.message && (error.message.includes('connect') || error.message.includes('ECONNREFUSED'))) {
      // Connection error
      res.status(503).json({
        success: false,
        error: 'Ollama service unavailable',
        message: 'Could not connect to Ollama. Make sure Ollama is running and accessible.',
        host: OLLAMA_HOST
      });
    } else if (error.message && error.message.includes('model')) {
      // Model not found error
      res.status(404).json({
        success: false,
        error: 'Model not found',
        message: error.message
      });
    } else {
      // Other errors
      res.status(500).json({
        success: false,
        error: 'Error calling Ollama',
        message: error.message || 'Unknown error occurred'
      });
    }
  }
});

// Get available models endpoint
app.get('/api/models', async (req, res) => {
  try {
    const response = await ollamaClient.list();
    res.json({
      success: true,
      models: response.models || []
    });
  } catch (error) {
    console.error('Error fetching models:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error fetching models',
      message: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📡 Ollama host: ${OLLAMA_HOST}`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log(`💬 Chat endpoint: POST http://localhost:${PORT}/api/chat`);
  console.log(`📋 Models endpoint: GET http://localhost:${PORT}/api/models`);
});