FROM python:3.11-slim

WORKDIR /app

# Install system deps for audio processing
RUN apt-get update && apt-get install -y ffmpeg curl && rm -rf /var/lib/apt/lists/*

# Install Python deps (CPU-only PyTorch for AMD systems)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .

RUN mkdir -p voice-samples music-output

# AMD RX 580 / non-NVIDIA systems run on CPU
ENV DEVICE=cpu
ENV PORT=5000
ENV VOICE_SAMPLES_DIR=/app/voice-samples
ENV MUSIC_OUTPUT_DIR=/app/music-output

EXPOSE 5000

CMD ["python", "server.py"]
