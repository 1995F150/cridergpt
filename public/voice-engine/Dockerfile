FROM pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime

WORKDIR /app

# Install system deps for audio processing
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .

RUN mkdir -p voice-samples music-output

ENV DEVICE=cuda
ENV PORT=5000
ENV VOICE_SAMPLES_DIR=/app/voice-samples
ENV MUSIC_OUTPUT_DIR=/app/music-output

EXPOSE 5000

CMD ["python", "server.py"]
