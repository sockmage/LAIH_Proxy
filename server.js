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
      model: req.body.model || 'gpt-4-vision-preview',
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

// Новый endpoint для поиска фото по запросу
app.get('/image/search', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'No query provided' });
  }
  try {
    // Используем DuckDuckGo Images API (неофициальный)
    const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
    // Получаем токен vqd
    const tokenRes = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const vqdMatch = tokenRes.data.match(/vqd='([\d-]+)'/);
    if (!vqdMatch) {
      return res.status(500).json({ error: 'Failed to get vqd token from DuckDuckGo' });
    }
    const vqd = vqdMatch[1];
    // Получаем изображения
    const apiUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}`;
    const imgRes = await axios.get(apiUrl, { headers: { 'Referer': searchUrl } });
    if (imgRes.data && imgRes.data.results && imgRes.data.results.length > 0) {
      return res.json({ image: imgRes.data.results[0].image });
    } else {
      return res.status(404).json({ error: 'No images found' });
    }
  } catch (error) {
    console.error('Image search error:', error.message);
    return res.status(500).json({ error: 'Image search failed', message: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
