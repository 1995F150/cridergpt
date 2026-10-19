"""Validate checked-in identifiers without exposing plist configuration values."""
import plistlib
from pathlib import Path
root = Path(__file__).resolve().parents[1]
plist = plistlib.loads((root / 'Info.plist').read_bytes())
assert plist['CFBundleIdentifier'] == 'app.cridergpt.ios', 'Unexpected bundle identifier'
spec = (root / 'project.yml').read_text()
assert 'PRODUCT_BUNDLE_IDENTIFIER: app.cridergpt.ios' in spec
source = (root / 'CriderGPT/Features/Profile/IAPManager.swift').read_text()
for product in ('cridergpt_plus_monthly', 'cridergpt_pro_monthly'):
    assert '"' + product + '"' in source, 'Missing registered subscription product'
assert 'type: application' in spec, 'An app target is required, not only an SPM library'
print('Bundle identifier, registered subscription products and app-target configuration verified.')
print('This does not validate compilation, signing, backend receipt verification or App Store readiness.')
