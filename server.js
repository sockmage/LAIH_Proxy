import express from 'express';
import axios from 'axios';
import cors from 'cors';
import multer from 'multer';
import qs from 'querystring';

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const upload = multer();

app.post('/chat', async (req, res) => {
  // Логируем входящий запрос
  console.log('--- Incoming /chat request ---');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      req.body,
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    // Логируем ответ OpenAI
    console.log('--- OpenAI response ---');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    res.json(response.data);
  } catch (error) {
    // Логируем ошибку
    console.error('--- OpenAI error ---');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error('Error:', error.message);
      res.status(500).json({ error: 'Unknown error', message: error.message });
    }
  }
});

// Новый endpoint для загрузки PDF-файлов
app.post('/chat/pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    // Преобразуем PDF в base64
    const base64Pdf = req.file.buffer.toString('base64');
    // Формируем JSON-запрос для vision
    const openaiRequest = {
      model: req.body.model || 'gpt-4o',
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
    // Логируем сформированный запрос
    console.log('--- /chat/pdf OpenAI request ---');
    console.log(JSON.stringify(openaiRequest, null, 2));
    // Отправляем запрос в OpenAI
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      openaiRequest,
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    // Логируем ответ OpenAI
    console.log('--- OpenAI response ---');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    res.json(response.data);
  } catch (error) {
    // Логируем ошибку
    console.error('--- OpenAI error ---');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error('Error:', error.message);
      res.status(500).json({ error: 'Unknown error', message: error.message });
    }
  }
});

// Endpoint для TTS (Text-to-Speech) через OpenAI
app.post('/tts', async (req, res) => {
  /*
    Ожидается body:
    {
      "input": "Текст для озвучивания",
      "voice": "sora" // или arbor, sol, maple, ember, breeze, vale, juniper, spruce, cove
    }
  */
  const { input, voice } = req.body;
  if (!input || !voice) {
    return res.status(400).json({ error: 'Missing input or voice' });
  }
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/audio/speech',
      {
        model: 'tts-1',
        input,
        voice
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer' // Получаем аудиофайл
      }
    );
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': 'inline; filename="speech.mp3"'
    });
    res.send(response.data);
  } catch (error) {
    console.error('--- OpenAI TTS error ---');
    if (error.response) {
      console.error('Status:', error.response.status);
      // Декодируем Buffer в строку для читаемого лога
      let errorText = '';
      if (Buffer.isBuffer(error.response.data)) {
        errorText = error.response.data.toString('utf8');
      } else if (typeof error.response.data === 'object' && error.response.data.type === 'Buffer') {
        errorText = Buffer.from(error.response.data.data).toString('utf8');
      } else {
        errorText = JSON.stringify(error.response.data, null, 2);
      }
      console.error('Data:', errorText);
      res.status(error.response.status).send(errorText);
    } else {
      console.error('Error:', error.message);
      res.status(500).json({ error: 'Unknown error', message: error.message });
    }
  }
});

// Endpoint для анализа изображений (GPT-4 Vision)
app.post('/chat/vision', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const base64Image = req.file.buffer.toString('base64');
    const openaiRequest = {
      model: 'gpt-4o',
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
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      openaiRequest,
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('--- OpenAI Vision error ---');
    if (error.response) {
      let errorText = '';
      if (Buffer.isBuffer(error.response.data)) {
        errorText = error.response.data.toString('utf8');
      } else if (typeof error.response.data === 'object' && error.response.data.type === 'Buffer') {
        errorText = Buffer.from(error.response.data.data).toString('utf8');
      } else {
        errorText = JSON.stringify(error.response.data, null, 2);
      }
      console.error('Data:', errorText);
      res.status(error.response.status).send(errorText);
    } else {
      console.error('Error:', error.message);
      res.status(500).json({ error: 'Unknown error', message: error.message });
    }
  }
});

// Endpoint для генерации изображений (DALL·E 3)
app.post('/image/generate', async (req, res) => {
  try {
    const { prompt, n = 1, size = '1024x1024' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'No prompt provided' });
    }
    const openaiRequest = {
      model: 'dall-e-3',
      prompt,
      n,
      size
    };
    const response = await axios.post(
      'https://api.openai.com/v1/images/generations',
      openaiRequest,
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('--- OpenAI DALL·E error ---');
    if (error.response) {
      let errorText = '';
      if (Buffer.isBuffer(error.response.data)) {
        errorText = error.response.data.toString('utf8');
      } else if (typeof error.response.data === 'object' && error.response.data.type === 'Buffer') {
        errorText = Buffer.from(error.response.data.data).toString('utf8');
      } else {
        errorText = JSON.stringify(error.response.data, null, 2);
      }
      console.error('Data:', errorText);
      res.status(error.response.status).send(errorText);
    } else {
      console.error('Error:', error.message);
      res.status(500).json({ error: 'Unknown error', message: error.message });
    }
  }
});

// Healthcheck endpoint для Railway
app.get('/', (req, res) => res.send('OK'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
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