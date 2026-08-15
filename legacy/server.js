const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const OPENAI_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_KEY) console.warn('Warning: OPENAI_API_KEY not set. OpenAI endpoints will be disabled.');

// Prefer Hugging Face for free-generation by default (free tier token required)
const HUGGINGFACE_KEY = process.env.HUGGINGFACE_API_KEY;
if (!HUGGINGFACE_KEY) console.warn('Note: HUGGINGFACE_API_KEY not set. To use free text-to-image, set it in env.');

async function generateImages(prompt, n = 1, size = '1024x1024') {
  const url = 'https://api.openai.com/v1/images/generations';
  const res = await axios.post(
    url,
    { prompt, n, size },
    { headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' } }
  );
  const payload = res.data;
  const results = [];
  for (const item of payload.data) {
    if (item.b64_json) results.push(item.b64_json);
    else if (item.url) {
      const r = await axios.get(item.url, { responseType: 'arraybuffer' });
      results.push(Buffer.from(r.data, 'binary').toString('base64'));
    }
  }
  return results;
}

async function generateImagesHF(prompt, n = 1, size = '1024x1024') {
  if (!HUGGINGFACE_KEY) throw new Error('HUGGINGFACE_API_KEY not set');
  const model = 'stabilityai/stable-diffusion-2-1';
  const url = `https://api-inference.huggingface.co/models/${model}`;
  const results = [];
  for (let i = 0; i < n; i++) {
    const body = {
      inputs: prompt,
      options: { wait_for_model: true },
      parameters: { guidance_scale: 7.5 }
    };
    const res = await axios.post(url, body, {
      responseType: 'arraybuffer',
      headers: { Authorization: `Bearer ${HUGGINGFACE_KEY}`, Accept: 'image/png' }
    });
    results.push(Buffer.from(res.data, 'binary').toString('base64'));
  }
  return results;
}

app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, n } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });
    const imgs = await generateImages(prompt, n || 1);
    const dataUrls = imgs.map((b64) => `data:image/png;base64,${b64}`);
    res.json({ images: dataUrls });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Free/default generation via Hugging Face (preferred if HUGGINGFACE_API_KEY is set)
app.post('/api/generate-image-free', async (req, res) => {
  try {
    const { prompt, n } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });
    if (!HUGGINGFACE_KEY) return res.status(400).json({ error: 'HUGGINGFACE_API_KEY not configured on server' });
    const imgs = await generateImagesHF(prompt, n || 1);
    const dataUrls = imgs.map((b64) => `data:image/png;base64,${b64}`);
    res.json({ images: dataUrls });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/generate-video', async (req, res) => {
  try {
    const { prompt, frames = 8, fps = 4, size = '1024x1024' } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gen-'));

    for (let i = 0; i < frames; i++) {
      const p = `${prompt} (frame ${i + 1})`;
      const imgs = await generateImages(p, 1, size);
      const b64 = imgs[0];
      const filename = path.join(tmpDir, `img${String(i + 1).padStart(3, '0')}.png`);
      await fs.writeFile(filename, Buffer.from(b64, 'base64'));
    }

    const outPath = path.join(tmpDir, 'out.mp4');
    await new Promise((resolve, reject) => {
      const args = [
        '-y',
        '-framerate',
        String(fps),
        '-i',
        path.join(tmpDir, 'img%03d.png'),
        '-c:v',
        'libx264',
        '-r',
        '30',
        '-pix_fmt',
        'yuv420p',
        outPath,
      ];
      const ff = spawn('ffmpeg', args, { stdio: 'inherit' });
      ff.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error('ffmpeg failed with code ' + code));
      });
    });

    res.download(outPath, 'video.mp4', async () => {
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch (e) {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
