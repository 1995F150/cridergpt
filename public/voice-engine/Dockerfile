FROM pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime

WORKDIR /app

RUN pip install --no-cache-dir TTS flask flask-cors

COPY server.py .

RUN mkdir -p voice-samples

ENV DEVICE=cuda
ENV PORT=5000
ENV VOICE_SAMPLES_DIR=/app/voice-samples

EXPOSE 5000

CMD ["python", "server.py"]
