"""Private, local-only voice-reference preparation. This does not synthesize speech.

No existing recording is enrolled automatically. Ownership is an explicit operator
attestation, not biometric proof; any future API must derive owner from authentication.
"""
import argparse
import array
import hashlib
import io
import json
import math
import os
from pathlib import Path
import re
import sqlite3
import sys
import uuid
import wave

MAX_BYTES = 12 * 1024 * 1024

def inspect_wav(raw):
    if len(raw) > MAX_BYTES:
        raise ValueError('Recording exceeds 12 MiB')
    with wave.open(io.BytesIO(raw), 'rb') as wav:
        rate, channels, width, frames = wav.getframerate(), wav.getnchannels(), wav.getsampwidth(), wav.getnframes()
        if channels != 1 or width != 2 or rate not in (16000, 22050, 24000, 44100, 48000):
            raise ValueError('Use mono PCM16 WAV at 16–48 kHz')
        duration = frames/rate
        if not 6 <= duration <= 120:
            raise ValueError('Use 6–120 seconds of clean reference speech')
        pcm = wav.readframes(frames)
        if len(pcm) != frames*2:
            raise ValueError('Truncated WAV')
    values = array.array('h', pcm)
    if sys.byteorder != 'little':
        values.byteswap()
    rms = math.sqrt(sum(float(x)*x for x in values)/len(values))/32768
    clipped = sum(abs(x) >= 32760 for x in values)/len(values)
    if rms < .005 or clipped > .01:
        raise ValueError('Recording is too quiet or clipped')
    return dict(sample_rate=rate, channels=channels, duration_seconds=duration,
                rms=rms, clipping_fraction=clipped, sha256=hashlib.sha256(raw).hexdigest())

class VoiceRegistry:
    def __init__(self, root):
        self.root = Path(root)
        if self.root.is_symlink():
            raise ValueError('Registry root cannot be a symlink')
        self.root.mkdir(parents=True, mode=0o700, exist_ok=True)
        if self.root.stat().st_uid != os.getuid():
            raise ValueError('Registry must be owned by the service user')
        os.chmod(self.root, 0o700)
        db = self.root/'registry.sqlite3'
        if db.is_symlink():
            raise ValueError('Registry database cannot be a symlink')
        self.db = sqlite3.connect(db)
        os.chmod(db, 0o600)
        self.db.execute('CREATE TABLE IF NOT EXISTS voices (id TEXT PRIMARY KEY, owner TEXT NOT NULL, label TEXT NOT NULL, consent TEXT NOT NULL, evidence TEXT NOT NULL, metadata TEXT NOT NULL, created TEXT DEFAULT CURRENT_TIMESTAMP, revoked TEXT)')
        self.db.commit()

    def enroll(self, raw, owner, label, consent, evidence):
        if consent not in ('self', 'authorized') or not evidence.strip():
            raise ValueError('Explicit voice rights and consent evidence are required')
        if not re.fullmatch(r'[A-Za-z0-9_-]{1,128}', owner) or not 1 <= len(label.strip()) <= 80 or len(evidence) > 2000:
            raise ValueError('Invalid owner, label or consent evidence')
        metadata = inspect_wav(raw)
        identifier = str(uuid.uuid4())
        path = self.root/(identifier+'.wav')
        fd = os.open(path, os.O_WRONLY|os.O_CREAT|os.O_EXCL, 0o600)
        try:
            with os.fdopen(fd, 'wb') as stream:
                stream.write(raw)
            self.db.execute('INSERT INTO voices(id,owner,label,consent,evidence,metadata) VALUES(?,?,?,?,?,?)',
                            (identifier, owner, label.strip(), consent, evidence, json.dumps(metadata)))
            self.db.commit()
        except BaseException:
            path.unlink(missing_ok=True)
            raise
        return identifier, metadata

    def list(self, owner):
        # Never return private recording paths or consent documents to a caller.
        return [dict(id=row[0], label=row[1], created=row[2]) for row in self.db.execute(
            'SELECT id,label,created FROM voices WHERE owner=? AND revoked IS NULL ORDER BY created,id', (owner,))]

    def revoke(self, owner, identifier):
        if str(uuid.UUID(identifier)) != identifier:
            raise ValueError('Invalid voice identifier')
        cursor = self.db.execute('UPDATE voices SET revoked=CURRENT_TIMESTAMP WHERE owner=? AND id=? AND revoked IS NULL', (owner, identifier))
        if cursor.rowcount != 1:
            self.db.rollback()
            raise KeyError('Voice not found')
        # Persist revocation first: even a failed file deletion cannot authorize reuse.
        self.db.commit()
        (self.root/(identifier+'.wav')).unlink(missing_ok=True)

    def reference(self, owner, identifier):
        if not isinstance(identifier, str) or str(uuid.UUID(identifier)) != identifier:
            raise ValueError('Invalid voice identifier')
        row = self.db.execute('SELECT metadata FROM voices WHERE owner=? AND id=? AND revoked IS NULL', (owner, identifier)).fetchone()
        if not row:
            raise KeyError('Voice not found')
        path = self.root/(identifier+'.wav')
        if path.is_symlink() or not path.is_file():
            raise KeyError('Reference not available')
        with path.open('rb') as stream:
            if hashlib.file_digest(stream, 'sha256').hexdigest() != json.loads(row[0])['sha256']:
                raise ValueError('Reference checksum mismatch')
        return path

    def close(self):
        self.db.close()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path.home()/'.local/share/cridergpt-voice')
    parser.add_argument('--owner', required=True)
    sub = parser.add_subparsers(dest='action', required=True)
    enroll = sub.add_parser('enroll')
    enroll.add_argument('--wav', type=Path, required=True)
    enroll.add_argument('--label', required=True)
    enroll.add_argument('--consent', choices=['self', 'authorized'], required=True)
    enroll.add_argument('--evidence', required=True)
    sub.add_parser('list')
    revoke = sub.add_parser('revoke')
    revoke.add_argument('id')
    args = parser.parse_args()
    registry = VoiceRegistry(args.root)
    try:
        if args.action == 'enroll':
            with args.wav.open('rb') as source:
                raw = source.read(MAX_BYTES+1)
            identifier, metadata = registry.enroll(raw, args.owner, args.label, args.consent, args.evidence)
            print(json.dumps(dict(id=identifier, metadata=metadata, synthesis_enabled=False)))
        elif args.action == 'list':
            print(json.dumps(registry.list(args.owner)))
        else:
            registry.revoke(args.owner, args.id)
            print(json.dumps(dict(revoked=True)))
    finally:
        registry.close()

if __name__ == '__main__':
    main()
