"""
CriderGPT Voice Engine Server
==============================
Self-hosted voice cloning TTS server using Coqui XTTS-v2.

Requirements:
  pip install TTS flask flask-cors torch torchaudio

Run:
  python server.py

The server listens on port 5000 and expects POST /tts with:
  { "text": "Hello world", "voice_sample": "crider-voice-sample.mp3" }

Deploy on a machine with a GPU for real-time inference.
For CPU-only, expect ~10x slower generation.
"""

import os
import io
import logging
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("voice-engine")

app = Flask(__name__)
CORS(app)

# ── Configuration ──────────────────────────────────────────────
VOICE_SAMPLES_DIR = os.environ.get("VOICE_SAMPLES_DIR", "./voice-samples")
DEFAULT_SAMPLE = os.environ.get("DEFAULT_VOICE_SAMPLE", "crider-voice-sample.mp3")
PORT = int(os.environ.get("PORT", 5000))
DEVICE = os.environ.get("DEVICE", "cuda")  # "cuda" or "cpu"

# ── Load XTTS-v2 Model ────────────────────────────────────────
tts_model = None

def load_model():
    """Load the XTTS-v2 model. Call once at startup."""
    global tts_model
    try:
        from TTS.api import TTS
        logger.info("Loading XTTS-v2 model (this takes 30-60 seconds on first run)...")
        tts_model = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(DEVICE)
        logger.info("✅ XTTS-v2 model loaded successfully on %s", DEVICE)
    except Exception as e:
        logger.error("Failed to load XTTS-v2 model: %s", e)
        logger.info("Falling back to basic TTS model...")
        try:
            from TTS.api import TTS
            tts_model = TTS("tts_models/en/ljspeech/tacotron2-DDC").to(DEVICE)
            logger.info("✅ Fallback TTS model loaded")
        except Exception as e2:
            logger.error("No TTS model available: %s", e2)
            tts_model = None

# ── Routes ─────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "model_loaded": tts_model is not None,
        "device": DEVICE,
    })

@app.route("/tts", methods=["POST"])
def text_to_speech():
    if tts_model is None:
        return jsonify({"error": "TTS model not loaded"}), 503

    data = request.json
    if not data or "text" not in data:
        return jsonify({"error": "Missing 'text' field"}), 400

    text = data["text"]
    voice_sample = data.get("voice_sample", DEFAULT_SAMPLE)

    # Resolve sample path
    sample_path = os.path.join(VOICE_SAMPLES_DIR, voice_sample)
    if not os.path.exists(sample_path):
        # Try the filename directly in case it's an absolute path
        if os.path.exists(voice_sample):
            sample_path = voice_sample
        else:
            logger.warning("Voice sample not found: %s, using default", voice_sample)
            sample_path = os.path.join(VOICE_SAMPLES_DIR, DEFAULT_SAMPLE)

    if not os.path.exists(sample_path):
        return jsonify({"error": f"Voice sample not found: {sample_path}"}), 404

    try:
        logger.info("Generating speech: '%s...' with sample: %s", text[:50], os.path.basename(sample_path))

        # Generate to a temporary wav file
        output_path = "/tmp/tts_output.wav"

        # Check if the model supports voice cloning (XTTS-v2)
        if hasattr(tts_model, 'tts_to_file') and 'speaker_wav' in tts_model.tts_to_file.__code__.co_varnames:
            tts_model.tts_to_file(
                text=text,
                speaker_wav=sample_path,
                language="en",
                file_path=output_path,
            )
        else:
            # Fallback for models without voice cloning
            tts_model.tts_to_file(text=text, file_path=output_path)

        logger.info("✅ Speech generated successfully")

        return send_file(
            output_path,
            mimetype="audio/wav",
            as_attachment=False,
        )

    except Exception as e:
        logger.error("TTS generation error: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/voices", methods=["GET"])
def list_voices():
    """List available voice samples."""
    samples = []
    if os.path.isdir(VOICE_SAMPLES_DIR):
        for f in os.listdir(VOICE_SAMPLES_DIR):
            if f.endswith((".mp3", ".wav", ".flac", ".ogg")):
                samples.append(f)
    return jsonify({"voices": samples, "default": DEFAULT_SAMPLE})


@app.route("/clone", methods=["POST"])
def clone_voice():
    """Upload a new voice sample for cloning."""
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_file = request.files["audio"]
    name = request.form.get("name", audio_file.filename)

    os.makedirs(VOICE_SAMPLES_DIR, exist_ok=True)
    save_path = os.path.join(VOICE_SAMPLES_DIR, name)
    audio_file.save(save_path)

    logger.info("Voice sample saved: %s", name)
    return jsonify({"status": "saved", "name": name, "path": save_path})


# ── Startup ────────────────────────────────────────────────────

if __name__ == "__main__":
    os.makedirs(VOICE_SAMPLES_DIR, exist_ok=True)
    load_model()
    logger.info("🚀 CriderGPT Voice Engine starting on port %d", PORT)
    app.run(host="0.0.0.0", port=PORT, debug=False)
