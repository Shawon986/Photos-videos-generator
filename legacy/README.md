# Prompt Image & Video Generator

Simple Node.js + Express app that uses the OpenAI Images API to generate images from prompts and stitches frames into a video using `ffmpeg`.

Prerequisites:

- Node.js (18+)
- `ffmpeg` available on PATH for video generation
- An OpenAI API key set in the environment as `OPENAI_API_KEY`

Optional (recommended):

- A Hugging Face token for free text-to-image: set `HUGGINGFACE_API_KEY` in your environment. The app will use Hugging Face inference (stable-diffusion) when available.

Quick start:

```powershell
cd "d:/Photos & videos generator"
npm install
$env:HUGGINGFACE_API_KEY = "hf_..."
$env:OPENAI_API_KEY = "sk-..." # optional, used if present for OpenAI images
npm start
# open http://localhost:3000 in your browser
```

Notes:

- The server talks to OpenAI's Images API; costs and rate limits apply to your API key.
- Video generation creates a temporary directory and requires `ffmpeg` to be installed.
