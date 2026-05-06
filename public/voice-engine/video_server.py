"""
CriderGPT Self-Hosted AI Video Generation
==========================================
Replaces Sora with your own backend. Runs Stable Video Diffusion (SVD)
for image-to-video, plus AnimateDiff for text-to-video.

Endpoints:
  POST /video/health           → status
  POST /video/image-to-video   → form: image, duration, fps, motion → mp4
  POST /video/text-to-video    → json: prompt, duration, fps → mp4

Models (auto-downloaded on first run):
  - stabilityai/stable-video-diffusion-img2vid-xt   (image → video)
  - guoyww/animatediff-motion-adapter-v1-5-2        (text → video, with SD1.5)

Hardware:
  - GPU strongly recommended (8GB+ VRAM)
  - CPU mode works but is SLOW (15-45 min per 4s clip on Ryzen)
  - Set DEVICE=cpu for AMD systems without ROCm

Run standalone:
  pip install -r video_requirements.txt
  python video_server.py

Or mount alongside the voice engine on a different port.
"""

import os
import io
import uuid
import logging
import tempfile
import subprocess
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from PIL import Image

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("video-engine")

app = Flask(__name__)
CORS(app)

# ── Config ──────────────────────────────────────────────────────
VIDEO_OUTPUT_DIR = os.environ.get("VIDEO_OUTPUT_DIR", "./video-output")
PORT = int(os.environ.get("VIDEO_PORT", 5200))
DEVICE = os.environ.get("DEVICE", "cuda")  # cuda | cpu | mps
DTYPE = os.environ.get("VIDEO_DTYPE", "fp16" if DEVICE == "cuda" else "fp32")
ENABLE_T2V = os.environ.get("ENABLE_T2V", "1") == "1"

os.makedirs(VIDEO_OUTPUT_DIR, exist_ok=True)

# ── Lazy-loaded models ──────────────────────────────────────────
svd_pipe = None
animatediff_pipe = None


def load_svd():
    """Image-to-video: Stable Video Diffusion XT."""
    global svd_pipe
    if svd_pipe is not None:
        return svd_pipe
    import torch
    from diffusers import StableVideoDiffusionPipeline
    logger.info("Loading SVD-XT (this can take a few minutes on first run)...")
    dtype = torch.float16 if DTYPE == "fp16" else torch.float32
    svd_pipe = StableVideoDiffusionPipeline.from_pretrained(
        "stabilityai/stable-video-diffusion-img2vid-xt",
        torch_dtype=dtype,
        variant="fp16" if DTYPE == "fp16" else None,
    )
    svd_pipe.to(DEVICE)
    if DEVICE == "cuda":
        svd_pipe.enable_model_cpu_offload()
    logger.info("✅ SVD ready")
    return svd_pipe


def load_animatediff():
    """Text-to-video: AnimateDiff + SD 1.5."""
    global animatediff_pipe
    if animatediff_pipe is not None:
        return animatediff_pipe
    import torch
    from diffusers import AnimateDiffPipeline, MotionAdapter, DDIMScheduler
    logger.info("Loading AnimateDiff...")
    dtype = torch.float16 if DTYPE == "fp16" else torch.float32
    adapter = MotionAdapter.from_pretrained(
        "guoyww/animatediff-motion-adapter-v1-5-2", torch_dtype=dtype
    )
    animatediff_pipe = AnimateDiffPipeline.from_pretrained(
        "SG161222/Realistic_Vision_V5.1_noVAE",
        motion_adapter=adapter,
        torch_dtype=dtype,
    )
    animatediff_pipe.scheduler = DDIMScheduler.from_config(
        animatediff_pipe.scheduler.config, beta_schedule="linear",
        clip_sample=False, timestep_spacing="linspace", steps_offset=1,
    )
    animatediff_pipe.to(DEVICE)
    logger.info("✅ AnimateDiff ready")
    return animatediff_pipe


def frames_to_mp4(frames, fps: int, output_path: str):
    """Convert PIL frames → mp4 via ffmpeg (lossless intermediate)."""
    from diffusers.utils import export_to_video
    # diffusers helper writes mp4 directly
    export_to_video(frames, output_path, fps=fps)
    return output_path


# ── Routes ──────────────────────────────────────────────────────
@app.route("/video/health", methods=["GET", "POST"])
def health():
    return jsonify({
        "ok": True,
        "device": DEVICE,
        "dtype": DTYPE,
        "models": {
            "svd_loaded": svd_pipe is not None,
            "animatediff_loaded": animatediff_pipe is not None,
            "t2v_enabled": ENABLE_T2V,
        },
    })


@app.route("/video/image-to-video", methods=["POST"])
def image_to_video():
    """Animate a still image using SVD."""
    try:
        if "image" not in request.files:
            return jsonify({"error": "Missing 'image' file"}), 400

        img_file = request.files["image"]
        fps = int(request.form.get("fps", 7))
        motion = int(request.form.get("motion", 127))  # 1-255, higher = more motion
        num_frames = int(request.form.get("frames", 25))  # SVD-XT default
        seed = int(request.form.get("seed", -1))

        import torch
        pipe = load_svd()

        image = Image.open(img_file.stream).convert("RGB")
        image = image.resize((1024, 576))  # SVD-XT native

        generator = torch.manual_seed(seed) if seed >= 0 else None
        logger.info("Generating video: frames=%d motion=%d fps=%d", num_frames, motion, fps)

        result = pipe(
            image,
            decode_chunk_size=8,
            generator=generator,
            motion_bucket_id=motion,
            num_frames=num_frames,
            noise_aug_strength=0.02,
        )
        frames = result.frames[0]

        out_id = str(uuid.uuid4())
        out_path = os.path.join(VIDEO_OUTPUT_DIR, f"i2v-{out_id}.mp4")
        frames_to_mp4(frames, fps, out_path)

        logger.info("✅ i2v done: %s", out_id)
        return send_file(out_path, mimetype="video/mp4", as_attachment=True,
                         download_name=f"cridergpt-{out_id}.mp4")
    except Exception as e:
        logger.exception("i2v error")
        return jsonify({"error": str(e)}), 500


@app.route("/video/text-to-video", methods=["POST"])
def text_to_video():
    """Generate video directly from a prompt using AnimateDiff."""
    if not ENABLE_T2V:
        return jsonify({"error": "Text-to-video disabled (set ENABLE_T2V=1)"}), 400
    try:
        data = request.get_json(force=True, silent=True) or {}
        prompt = (data.get("prompt") or "").strip()
        if not prompt:
            return jsonify({"error": "Missing prompt"}), 400

        negative = data.get("negative_prompt", "low quality, blurry, distorted")
        steps = int(data.get("steps", 25))
        guidance = float(data.get("guidance", 7.5))
        num_frames = int(data.get("frames", 16))
        fps = int(data.get("fps", 8))
        seed = int(data.get("seed", -1))

        import torch
        pipe = load_animatediff()
        generator = torch.manual_seed(seed) if seed >= 0 else None

        logger.info("Generating t2v: '%s' (frames=%d)", prompt[:60], num_frames)
        result = pipe(
            prompt=prompt,
            negative_prompt=negative,
            num_frames=num_frames,
            guidance_scale=guidance,
            num_inference_steps=steps,
            generator=generator,
        )
        frames = result.frames[0]

        out_id = str(uuid.uuid4())
        out_path = os.path.join(VIDEO_OUTPUT_DIR, f"t2v-{out_id}.mp4")
        frames_to_mp4(frames, fps, out_path)

        return send_file(out_path, mimetype="video/mp4", as_attachment=True,
                         download_name=f"cridergpt-t2v-{out_id}.mp4")
    except Exception as e:
        logger.exception("t2v error")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    logger.info("🎬 CriderGPT Video Engine on port %d (device=%s)", PORT, DEVICE)
    app.run(host="0.0.0.0", port=PORT, debug=False)
