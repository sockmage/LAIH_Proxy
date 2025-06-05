import express from 'express';
import axios from 'axios';
import cors from 'cors';
import multer from 'multer';

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const upload = multer();

// Default models
const DEFAULT_CHAT_MODEL = 'gpt-4-turbo-preview';
const DEFAULT_VISION_MODEL = 'gpt-4-vision-preview';
const DEFAULT_TTS_MODEL = 'tts-1-hd';
const DEFAULT_DALLE_MODEL = 'dall-e-3';

// Helper function for error handling
const handleError = (error, res) => {
  console.error('--- OpenAI error ---');
  if (error.response) {
    console.error('Status:', error.response.status);
    console.error('Data:', JSON.stringify(error.response.data, null, 2));
    res.status(error.response.status).json(error.response.data);
  } else {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Unknown error', message: error.message });
  }
};

// Helper function for OpenAI API calls
const makeOpenAIRequest = async (endpoint, data) => {
  return axios.post(
    `https://api.openai.com/v1/${endpoint}`,
    data,
    {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
};

app.post('/chat', async (req, res) => {
  try {
    const requestBody = {
      ...req.body,
      model: req.body.model || DEFAULT_CHAT_MODEL
    };
    const response = await makeOpenAIRequest('chat/completions', requestBody);
    res.json(response.data);
  } catch (error) {
    handleError(error, res);
  }
});

app.post('/chat/pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const base64Pdf = req.file.buffer.toString('base64');
    const openaiRequest = {
      model: req.body.model || DEFAULT_VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: req.body.prompt || 'Что в этом PDF?' },
            {
              type: 'image_url',
              image_url: {
                url: `data:application/pdf;base64,${base64Pdf}`
              }
            }
          ]
        }
      ],
      max_tokens: parseInt(req.body.max_tokens) || 300
    };

    const response = await makeOpenAIRequest('chat/completions', openaiRequest);
    res.json(response.data);
  } catch (error) {
    handleError(error, res);
  }
});

app.post('/tts', async (req, res) => {
  const { input, voice, model = DEFAULT_TTS_MODEL } = req.body;
  if (!input || !voice) {
    return res.status(400).json({ error: 'Missing input or voice' });
  }
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/audio/speech',
      {
        model,
        input,
        voice
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': 'inline; filename="speech.mp3"'
    });
    res.send(response.data);
  } catch (error) {
    handleError(error, res);
  }
});

app.post('/chat/vision', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const base64Image = req.file.buffer.toString('base64');
    const openaiRequest = {
      model: req.body.model || DEFAULT_VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: req.body.prompt || 'Что на этом изображении?' },
            {
              type: 'image_url',
              image_url: {
                url: `data:${req.file.mimetype};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: parseInt(req.body.max_tokens) || 300
    };
    const response = await makeOpenAIRequest('chat/completions', openaiRequest);
    res.json(response.data);
  } catch (error) {
    handleError(error, res);
  }
});

app.post('/image/generate', async (req, res) => {
  try {
    const { prompt, n = 1, size = '1024x1024', model = DEFAULT_DALLE_MODEL } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'No prompt provided' });
    }
    const openaiRequest = {
      model,
      prompt,
      n,
      size
    };
    const response = await makeOpenAIRequest('images/generations', openaiRequest);
    res.json(response.data);
  } catch (error) {
    handleError(error, res);
  }
});

// Healthcheck endpoint для Railway
app.get('/', (req, res) => res.send('OK'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Глобальный обработчик необработанных ошибок
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

console.log('Lingro Proxy server starting...');
