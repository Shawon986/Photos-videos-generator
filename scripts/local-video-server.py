"""
VisionForge AI — reference local VIDEO inference server.

A minimal FastAPI server exposing the protocol VisionForge speaks
(see lib/ai/video/local-provider.ts). Point MODEL_MAP at whichever video
pipelines you can run on your GPU — Stable Video Diffusion (SVD), Wan,
CogVideoX, HunyuanVideo or LTX-Video. Video models are heavy; run this
on a dedicated GPU machine, not the web server.

Run:

    pip install fastapi uvicorn diffusers torch pillow imageio[ffmpeg]
    python scripts/local-video-server.py

Then set in .env:
    VIDEO_PROVIDER=local
    AI_VIDEO_URL=http://localhost:8001

Protocol:
    POST /generate
    { prompt, negative_prompt, duration, width, height, seed, model,
      image: "<base64>"?, motion_strength? }

    -> { "videos": [{ "data": "<base64 mp4>", "format": "mp4" }, ...] }
"""
import base64
import io
import os
import tempfile

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="VisionForge local video server")

# ---------------------------------------------------------------- model map
# Fill in the pipeline ids for the models you install. `auto` must exist.
# text-to-video pipelines:
T2V_MODEL_MAP = {
    "auto": "stabilityai/stable-video-diffusion-img2vid-xt",
    "svd": "stabilityai/stable-video-diffusion-img2vid-xt",
    "wan-2.1": "Wan-AI/Wan2.1-T2V-1.3B-Diffusers",
    "cogvideox": "THUDM/CogVideoX-2b",
}
# image-to-video pipelines:
I2V_MODEL_MAP = {
    "auto": "stabilityai/stable-video-diffusion-img2vid-xt",
    "svd": "stabilityai/stable-video-diffusion-img2vid-xt",
    "wan-2.1-i2v": "Wan-AI/Wan2.1-I2V-14B-480P-Diffusers",
    "cogvideox-i2v": "THUDM/CogVideoX-5b-I2V",
}

_pipes = {}


def get_pipe(is_i2v: bool, model_id: str | None):
    model_map = I2V_MODEL_MAP if is_i2v else T2V_MODEL_MAP
    hf_id = model_map.get(model_id or "auto", model_map["auto"])
    key = f"{hf_id}:{is_i2v}"
    if key not in _pipes:
        import torch

        print(f"Loading {hf_id} ...")
        if is_i2v:
            from diffusers import StableVideoDiffusionPipeline

            pipe = StableVideoDiffusionPipeline.from_pretrained(
                hf_id, torch_dtype=torch.float16
            )
        else:
            from diffusers import DiffusionPipeline

            pipe = DiffusionPipeline.from_pretrained(hf_id, torch_dtype=torch.float16)
        pipe = pipe.to("cuda" if torch.cuda.is_available() else "cpu")
        _pipes[key] = pipe
    return _pipes[key]


class GenerateRequest(BaseModel):
    prompt: str
    negative_prompt: str = ""
    duration: int = 5
    width: int = 1024
    height: int = 576
    seed: int | None = None
    model: str | None = None
    image: str | None = None  # base64 PNG/JPEG for image-to-video
    image_mime: str | None = None
    motion_strength: float | None = None


@app.post("/generate")
def generate(req: GenerateRequest):
    import torch

    is_i2v = bool(req.image)
    pipe = get_pipe(is_i2v, req.model)

    generator = None
    if req.seed is not None:
        generator = torch.Generator(device=pipe.device).manual_seed(req.seed)

    if is_i2v:
        from PIL import Image

        image = Image.open(io.BytesIO(base64.b64decode(req.image))).convert("RGB")
        # Match the pipeline's expected resolution; adjust per model.
        image = image.resize((1024, 576))
        frames = pipe(image, decode_chunk_size=4, generator=generator).frames[0]
    else:
        # Text-to-video pipelines vary wildly by model — adapt here.
        frames = pipe(
            prompt=req.prompt,
            negative_prompt=req.negative_prompt or None,
            num_frames=16,
            generator=generator,
        ).frames[0]

    fps = max(1, round(len(frames) / req.duration))
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        import imageio

        writer = imageio.get_writer(tmp.name, fps=fps, codec="libx264", quality=8)
        for frame in frames:
            writer.append_data(frame)
        writer.close()
        tmp.seek(0)
        video_bytes = tmp.read()

    return {
        "videos": [
            {"data": base64.b64encode(video_bytes).decode("ascii"), "format": "mp4"}
        ]
    }


@app.get("/health")
def health():
    return {"ok": True}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8001)))
