"""
CriderGPT Voice Engine Server
==============================
Self-hosted voice cloning TTS + Music Generation server.

Models:
  - Coqui XTTS-v2 for voice cloning / TTS
  - Meta MusicGen for music / beat generation
  - Demucs for stem separation (covers)

Requirements:
  pip install TTS flask flask-cors torch torchaudio audiocraft demucs

Run:
  python server.py

Deploy on a machine with a GPU for real-time inference.
"""

import os
import io
import uuid
import logging
import tempfile
import subprocess
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("voice-engine")

app = Flask(__name__)
CORS(app)

# ── Configuration ──────────────────────────────────────────────
VOICE_SAMPLES_DIR = os.environ.get("VOICE_SAMPLES_DIR", "./voice-samples")
MUSIC_OUTPUT_DIR = os.environ.get("MUSIC_OUTPUT_DIR", "./music-output")
DEFAULT_SAMPLE = os.environ.get("DEFAULT_VOICE_SAMPLE", "crider-voice-sample.mp3")
PORT = int(os.environ.get("PORT", 5000))
DEVICE = os.environ.get("DEVICE", "cuda")  # "cuda" or "cpu"

# ── Models ─────────────────────────────────────────────────────
tts_model = None
music_model = None


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


def load_music_model():
    """Load MusicGen model for music generation."""
    global music_model
    try:
        from audiocraft.models import MusicGen
        logger.info("Loading MusicGen model (small)...")
        music_model = MusicGen.get_pretrained("facebook/musicgen-small", device=DEVICE)
        music_model.set_generation_params(duration=15)
        logger.info("✅ MusicGen model loaded successfully")
    except Exception as e:
        logger.error("Failed to load MusicGen model: %s", e)
        music_model = None


# ── TTS Routes ─────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "model_loaded": tts_model is not None,
        "music_model_loaded": music_model is not None,
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

    sample_path = os.path.join(VOICE_SAMPLES_DIR, voice_sample)
    if not os.path.exists(sample_path):
        if os.path.exists(voice_sample):
            sample_path = voice_sample
        else:
            logger.warning("Voice sample not found: %s, using default", voice_sample)
            sample_path = os.path.join(VOICE_SAMPLES_DIR, DEFAULT_SAMPLE)

    if not os.path.exists(sample_path):
        return jsonify({"error": f"Voice sample not found: {sample_path}"}), 404

    try:
        logger.info("Generating speech: '%s...' with sample: %s", text[:50], os.path.basename(sample_path))
        output_path = "/tmp/tts_output.wav"

        if hasattr(tts_model, 'tts_to_file') and 'speaker_wav' in tts_model.tts_to_file.__code__.co_varnames:
            tts_model.tts_to_file(
                text=text,
                speaker_wav=sample_path,
                language="en",
                file_path=output_path,
            )
        else:
            tts_model.tts_to_file(text=text, file_path=output_path)

        logger.info("✅ Speech generated successfully")
        return send_file(output_path, mimetype="audio/wav", as_attachment=False)

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


# ── Music Generation Routes ───────────────────────────────────

@app.route("/music/generate", methods=["POST"])
def music_generate():
    """Generate music from a text prompt using MusicGen."""
    if music_model is None:
        return jsonify({"error": "MusicGen model not loaded"}), 503

    data = request.json
    if not data or "prompt" not in data:
        return jsonify({"error": "Missing 'prompt' field"}), 400

    prompt = data["prompt"]
    duration = min(int(data.get("duration", 15)), 30)  # Max 30 seconds
    genre = data.get("genre", "")
    mood = data.get("mood", "")

    # Build a rich prompt
    full_prompt = prompt
    if genre:
        full_prompt = f"{genre} style, {full_prompt}"
    if mood:
        full_prompt = f"{mood} {full_prompt}"

    try:
        import torchaudio
        logger.info("Generating music: '%s' (%ds)", full_prompt[:60], duration)

        music_model.set_generation_params(duration=duration)
        wav = music_model.generate([full_prompt])

        output_id = str(uuid.uuid4())
        output_path = os.path.join(MUSIC_OUTPUT_DIR, f"{output_id}.wav")
        os.makedirs(MUSIC_OUTPUT_DIR, exist_ok=True)
        torchaudio.save(output_path, wav[0].cpu(), sample_rate=32000)

        logger.info("✅ Music generated: %s", output_id)
        return send_file(output_path, mimetype="audio/wav", as_attachment=True,
                         download_name=f"music-{output_id}.wav")

    except Exception as e:
        logger.error("Music generation error: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/music/beat", methods=["POST"])
def music_beat():
    """Generate an instrumental beat from genre/BPM/mood parameters."""
    if music_model is None:
        return jsonify({"error": "MusicGen model not loaded"}), 503

    data = request.json or {}
    genre = data.get("genre", "hip hop")
    bpm = data.get("bpm", 120)
    mood = data.get("mood", "energetic")
    duration = min(int(data.get("duration", 15)), 30)

    prompt = f"{mood} {genre} instrumental beat at {bpm} BPM, no vocals, clean mix"

    try:
        import torchaudio
        logger.info("Generating beat: '%s' (%ds)", prompt[:60], duration)

        music_model.set_generation_params(duration=duration)
        wav = music_model.generate([prompt])

        output_id = str(uuid.uuid4())
        output_path = os.path.join(MUSIC_OUTPUT_DIR, f"beat-{output_id}.wav")
        os.makedirs(MUSIC_OUTPUT_DIR, exist_ok=True)
        torchaudio.save(output_path, wav[0].cpu(), sample_rate=32000)

        logger.info("✅ Beat generated: %s", output_id)
        return send_file(output_path, mimetype="audio/wav", as_attachment=True,
                         download_name=f"beat-{output_id}.wav")

    except Exception as e:
        logger.error("Beat generation error: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/music/cover", methods=["POST"])
def music_cover():
    """Create a voice-swapped cover: separate stems, re-sing vocals with cloned voice."""
    if tts_model is None:
        return jsonify({"error": "TTS model not loaded"}), 503

    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    voice_sample = request.form.get("voice_sample", DEFAULT_SAMPLE)
    sample_path = os.path.join(VOICE_SAMPLES_DIR, voice_sample)
    if not os.path.exists(sample_path):
        sample_path = os.path.join(VOICE_SAMPLES_DIR, DEFAULT_SAMPLE)

    try:
        import torchaudio

        # Save uploaded song
        song_file = request.files["audio"]
        work_dir = tempfile.mkdtemp(prefix="cover_")
        song_path = os.path.join(work_dir, "input.wav")
        song_file.save(song_path)

        logger.info("Processing cover: separating stems...")

        # Step 1: Separate stems with Demucs
        subprocess.run(
            ["python", "-m", "demucs", "--two-stems", "vocals", "-o", work_dir, song_path],
            check=True, capture_output=True, timeout=300
        )

        # Find separated files
        stems_dir = os.path.join(work_dir, "htdemucs", "input")
        vocals_path = os.path.join(stems_dir, "vocals.wav")
        instrumental_path = os.path.join(stems_dir, "no_vocals.wav")

        if not os.path.exists(vocals_path):
            return jsonify({"error": "Stem separation failed — vocals not found"}), 500

        # Step 2: Extract lyrics/text from vocals (placeholder — in production use Whisper)
        # For now, we just re-clone the vocal audio with the target voice
        logger.info("Re-singing vocals with cloned voice...")

        cloned_vocals_path = os.path.join(work_dir, "cloned_vocals.wav")

        # Use XTTS-v2 to clone: we feed the original vocals as the "text"
        # In practice, you'd use Whisper to transcribe first, then re-synthesize
        # For now, we provide a simplified pipeline
        if hasattr(tts_model, 'tts_to_file') and 'speaker_wav' in tts_model.tts_to_file.__code__.co_varnames:
            # Transcribe vocals with whisper if available
            try:
                import whisper
                whisper_model = whisper.load_model("base")
                result = whisper_model.transcribe(vocals_path)
                lyrics_text = result["text"]
                logger.info("Transcribed lyrics: '%s...'", lyrics_text[:80])
            except ImportError:
                lyrics_text = "la la la, singing along to the melody"
                logger.warning("Whisper not installed, using placeholder lyrics")

            tts_model.tts_to_file(
                text=lyrics_text,
                speaker_wav=sample_path,
                language="en",
                file_path=cloned_vocals_path,
            )
        else:
            return jsonify({"error": "Voice cloning model doesn't support speaker_wav"}), 500

        # Step 3: Mix cloned vocals with instrumental
        logger.info("Mixing cloned vocals with instrumental...")
        instrumental_wav, sr = torchaudio.load(instrumental_path)
        cloned_wav, sr2 = torchaudio.load(cloned_vocals_path)

        # Resample cloned vocals to match instrumental if needed
        if sr2 != sr:
            resampler = torchaudio.transforms.Resample(sr2, sr)
            cloned_wav = resampler(cloned_wav)

        # Pad/trim to match lengths
        target_len = instrumental_wav.shape[1]
        if cloned_wav.shape[1] < target_len:
            import torch
            padding = torch.zeros(cloned_wav.shape[0], target_len - cloned_wav.shape[1])
            cloned_wav = torch.cat([cloned_wav, padding], dim=1)
        else:
            cloned_wav = cloned_wav[:, :target_len]

        # Match channels
        if instrumental_wav.shape[0] != cloned_wav.shape[0]:
            if cloned_wav.shape[0] == 1:
                cloned_wav = cloned_wav.repeat(instrumental_wav.shape[0], 1)
            else:
                cloned_wav = cloned_wav[:instrumental_wav.shape[0], :]

        # Mix: instrumental at full volume, vocals at 0.8
        mixed = instrumental_wav + 0.8 * cloned_wav

        output_id = str(uuid.uuid4())
        output_path = os.path.join(MUSIC_OUTPUT_DIR, f"cover-{output_id}.wav")
        os.makedirs(MUSIC_OUTPUT_DIR, exist_ok=True)
        torchaudio.save(output_path, mixed, sample_rate=sr)

        logger.info("✅ Cover generated: %s", output_id)
        return send_file(output_path, mimetype="audio/wav", as_attachment=True,
                         download_name=f"cover-{output_id}.wav")

    except subprocess.TimeoutExpired:
        return jsonify({"error": "Stem separation timed out"}), 504
    except Exception as e:
        logger.error("Cover generation error: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/music/hum", methods=["POST"])
def music_hum():
    """Take a hummed melody and transform it into a polished track."""
    if music_model is None:
        return jsonify({"error": "MusicGen model not loaded"}), 503

    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    genre = request.form.get("genre", "pop")
    mood = request.form.get("mood", "upbeat")
    duration = min(int(request.form.get("duration", 15)), 30)

    try:
        import torch
        import torchaudio

        # Save uploaded humming
        hum_file = request.files["audio"]
        work_dir = tempfile.mkdtemp(prefix="hum_")
        hum_path = os.path.join(work_dir, "hum.wav")
        hum_file.save(hum_path)

        logger.info("Processing hum-to-song: loading melody...")

        # Load and prepare the melody
        melody_wav, sr = torchaudio.load(hum_path)
        if sr != 32000:
            resampler = torchaudio.transforms.Resample(sr, 32000)
            melody_wav = resampler(melody_wav)

        # Ensure mono
        if melody_wav.shape[0] > 1:
            melody_wav = melody_wav.mean(dim=0, keepdim=True)

        prompt = f"{mood} {genre} song based on this melody, polished production, full arrangement"

        music_model.set_generation_params(duration=duration)
        wav = music_model.generate_with_chroma(
            descriptions=[prompt],
            melody_wavs=melody_wav.unsqueeze(0).to(DEVICE),
            melody_sample_rate=32000,
            progress=True
        )

        output_id = str(uuid.uuid4())
        output_path = os.path.join(MUSIC_OUTPUT_DIR, f"hum-{output_id}.wav")
        os.makedirs(MUSIC_OUTPUT_DIR, exist_ok=True)
        torchaudio.save(output_path, wav[0].cpu(), sample_rate=32000)

        logger.info("✅ Hum-to-song generated: %s", output_id)
        return send_file(output_path, mimetype="audio/wav", as_attachment=True,
                         download_name=f"hum-song-{output_id}.wav")

    except Exception as e:
        logger.error("Hum-to-song error: %s", e)
        return jsonify({"error": str(e)}), 500


# ── Startup ────────────────────────────────────────────────────

if __name__ == "__main__":
    os.makedirs(VOICE_SAMPLES_DIR, exist_ok=True)
    os.makedirs(MUSIC_OUTPUT_DIR, exist_ok=True)
    load_model()
    load_music_model()
    logger.info("🚀 CriderGPT Voice + Music Engine starting on port %d", PORT)
    app.run(host="0.0.0.0", port=PORT, debug=False)
