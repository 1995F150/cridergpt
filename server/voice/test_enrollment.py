import array
import io
import math
from pathlib import Path
import tempfile
import unittest
import wave
from enrollment import VoiceRegistry, inspect_wav

def fixture(seconds=6, amplitude=3000):
    stream=io.BytesIO()
    values=array.array('h',(int(amplitude*math.sin(i*.1)) for i in range(16000*seconds)))
    with wave.open(stream,'wb') as wav:
        wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(16000);wav.writeframes(values.tobytes())
    return stream.getvalue()

class Tests(unittest.TestCase):
    def test_valid_reference_metadata(self):
        self.assertEqual(inspect_wav(fixture())['duration_seconds'],6)
    def test_silence_short_and_truncated_rejected(self):
        for raw in (fixture(amplitude=0), fixture(seconds=1), fixture()[:-100]):
            with self.assertRaises(ValueError):inspect_wav(raw)
    def test_explicit_consent_and_owner_scope(self):
        with tempfile.TemporaryDirectory() as directory:
            registry=VoiceRegistry(Path(directory)/'private')
            try:
                with self.assertRaises(ValueError):registry.enroll(fixture(),'owner','Voice','', '')
                identifier,_=registry.enroll(fixture(),'owner','Voice','self','Owner attested in test fixture')
                self.assertEqual(registry.list('other'),[])
                with self.assertRaises(KeyError):registry.revoke('other',identifier)
                self.assertEqual(len(registry.list('owner')),1)
                self.assertEqual((registry.root/(identifier+'.wav')).stat().st_mode&0o777,0o600)
                self.assertEqual(registry.root.stat().st_mode&0o777,0o700)
                registry.revoke('owner',identifier)
                self.assertEqual(registry.list('owner'),[])
                self.assertFalse((registry.root/(identifier+'.wav')).exists())
            finally:registry.close()
    def test_symlink_root_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'link').symlink_to(root/'target')
            with self.assertRaises(ValueError):VoiceRegistry(root/'link')

if __name__=='__main__':unittest.main()
