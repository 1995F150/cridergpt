# Private truck facts and visual grounding

Prepared on 2026-10-19 at `~/cridergpt-private-data/truck-candidate-20261019`, outside Git. Directory mode 0700, files 0600. Six unreviewed candidate examples, three separate holdout questions, an empty image manifest and checksum/provenance metadata were created. No training ran, no checkpoint changed, and none of these private records was published or inserted into other users' memory.

The owner's directly supplied year, make, engine displacement and rear axle ratio are recorded as **owner-reported**, not independently measured specifications. Screenshot-only model, transmission, body and family-history claims remain separate and unverified; they are excluded from candidate answers. Height, towing capacity, payload, exact axle/transmission model and original engine status remain unknown. The generic builder takes a private profile file; it contains no hardcoded owner facts. No rating is inferred from year, displacement or gear ratio.

## Useful next data

- A legible axle tag/document for ratio verification, measured vehicle height and applicable factory/vehicle rating records before answering towing or payload questions.
- Owner-approved facts about how the truck was acquired, with the owner's words and source/date rather than reconstructed family history.
- Original photos of the actual truck/equipment from varied views, paired with short visible descriptions. Keep exact serial numbers, addresses, screens, keys and other people's private information out of public datasets.
- For each image: owner ID, file checksum, explicit permission, object label, source, uncertainty and capture date if known. A label such as “my truck” is owner-supplied context; a similar-looking truck is not proof of ownership.
- Negative/uncertain examples: unknown vehicle, obscured badge, unreadable tag, another similar truck. Split by photo session/object rather than adjacent frames to reduce holdout leakage.

No photos were enrolled automatically from conversation screenshots or repository reference assets. No face-identification system is implemented. Use an authenticated profile or an explicit owner-provided caption to associate a person with the creator; do not infer identity from facial appearance.

## Model and hardware limits

The inspected native checkpoints are text-generation models. They do not acquire image inputs by adding JPEGs to text fine-tuning. The existing SmolVLM vision helper already performs CPU image inference and passes bounded untrusted observations to the selected text checkpoint. The inspected host has an eight-logical-CPU Xeon E3-1230 V2, about 16 GiB RAM and a Radeon RX 580 2048SP. No compatible accelerated vision-training stack has been demonstrated on that GPU.

Keep private changing facts in owner-scoped retrieval/profile storage shared by authorized model requests. A tiny personalized weight update is less reliable for exact fact recall and can leak facts into shared responses if the adapter is exposed globally. The packet therefore includes context-grounded examples, not an automatic training command for all models. Its holdouts cover the same small domain; passing them would not establish general competence.

Vision fine-tuning requires a separately pinned compatible training environment, labeled rights-cleared images, a held-out set, a measured forward/backward calibration and an approved resource budget. Those have not been verified, so no run cost/duration is invented and no image training is scheduled. The practical next step is to evaluate the current helper on labeled owner-provided images, inspect failure cases, then compare retrieval or a private vision adapter against that baseline.

To create another fresh candidate packet without overwriting this one:

```bash
python3 model_development/personal_data.py --facts /private/profile.json --output /private/new-packet
# After reviewing the printed plan:
python3 model_development/personal_data.py --facts /private/profile.json --output /private/new-packet --apply
python3 -m unittest discover -s model_development -p test_personal_data.py
```

This tool prepares files only. It does not sync Supabase/Lovable memory, train Andromeda/Nova/Pulsar, modify inference prompts or claim the truck is now remembered by deployed models.
