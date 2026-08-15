"""
VisionForge AI — reference local IMAGE inference server.

A minimal FastAPI server exposing the protocol VisionForge speaks
(see lib/ai/image/local-provider.ts). Replace the pipeline with any
diffusers model — Stable Diffusion, SDXL, FLUX.1-schnell, etc.

Run on the machine with the GPU:

    pip install fastapi uvicorn diffusers torch pillow
    python scripts/local-image-server.py

Then set in .env:
    IMAGE_PROVIDER=local
    AI_IMAGE_URL=http://localhost:8000

Protocol:
    POST /generate
    { prompt, negative_prompt, width, height, num_images, steps,
      guidance_scale, seed, model }

    -> { "images": [{ "data": "<base64 png>", "format": "png" }, ...] }
"""
import base64
import io
import os

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="VisionForge local image server")

# ---------------------------------------------------------------- model map
# Map VisionForge model ids to diffusers pipelines. Only the models you
# install (and your GPU can hold) need entries — unknown ids fall back to
# "auto".
MODEL_MAP = {
    "auto": "stable-diffusion-2-1",
    "sd-1.5": "runwayml/stable-diffusion-v1-5",
    "sd-2.1": "stabilityai/stable-diffusion-2-1",
    "sdxl": "stabilityai/stable-diffusion-xl-base-1.0",
    "flux-schnell": "black-forest-labs/FLUX.1-schnell",
}

_pipes = {}


def get_pipe(model_id: str):
    hf_id = MODEL_MAP.get(model_id, MODEL_MAP["auto"])
    if hf_id not in _pipes:
        from diffusers import DiffusionPipeline
        import torch

        print(f"Loading {hf_id} ...")
        pipe = DiffusionPipeline.from_pretrained(hf_id, torch_dtype=torch.float16)
        pipe = pipe.to("cuda" if torch.cuda.is_available() else "cpu")
        _pipes[hf_id] = pipe
    return _pipes[hf_id]


class GenerateRequest(BaseModel):
    prompt: str
    negative_prompt: str = ""
    width: int = 1024
    height: int = 1024
    num_images: int = 1
    steps: int | None = None
    guidance_scale: float | None = None
    seed: int | None = None
    model: str | None = None


@app.post("/generate")
def generate(req: GenerateRequest):
    pipe = get_pipe(req.model or "auto")

    kwargs = {
        "prompt": req.prompt,
        "negative_prompt": req.negative_prompt or None,
        "width": req.width,
        "height": req.height,
        "num_images_per_prompt": req.num_images,
        "num_inference_steps": req.steps or 28,
        "guidance_scale": req.guidance_scale or 7.5,
    }
    if req.seed is not None:
        import torch

        kwargs["generator"] = torch.Generator(device=pipe.device).manual_seed(req.seed)

    images = pipe(**kwargs).images

    payload = []
    for image in images:
        buf = io.BytesIO()
        image.save(buf, format="PNG")
        payload.append({"data": base64.b64encode(buf.getvalue()).decode("ascii"), "format": "png"})
    return {"images": payload}


@app.get("/health")
def health():
    return {"ok": True}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
