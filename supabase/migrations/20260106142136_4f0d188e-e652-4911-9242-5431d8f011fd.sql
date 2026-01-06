-- Insert permanent FFA jacket visual identity knowledge into training data
INSERT INTO cridergpt_training_data (
  dataset_name,
  description,
  category,
  data_type,
  content,
  status,
  metadata
) VALUES (
  'FFA_Jacket_Visual_Identity',
  'Permanent visual identity knowledge for Jessie Criders official FFA Historian jacket - immutable and persistent across all sessions',
  'visual_identity',
  'reference',
  '# FFA Jacket Visual Identity - PERMANENT KNOWLEDGE

## Owner
- Name: Jessie Crider
- Role: FFA Historian 2025-2026
- Chapter: Wythe County, Virginia

## Official Jacket Specifications

### Physical Characteristics
- Type: Official National FFA Organization Jacket
- Material: Blue corduroy with visible ribbing
- Color: FFA Blue (deep navy blue) - EXACT match required
- Fit: Traditional structured, waist-length

### Front Left (Wearers Left)
- Embroidered name: "Jessie Crider" in gold thread
- Embroidered title: "Historian" below name
- Embroidered year: "2025-2026" below title
- Officer pins including historian pin

### Front Right (Wearers Right)
- Official FFA Emblem (embroidered patch)
- Features eagle, owl, plow, and rising sun design
- Text around emblem: "AGRICULTURE EDUCATION"

### Details
- Collar: Gold/yellow accent trim
- Zipper: Brass/gold-tone front zipper
- Standard FFA jacket construction

## Recognition Rules
- Blue corduroy + FFA markings = FFA jacket (always)
- FFA jacket + "Jessie Crider" = Jessies official jacket (always)
- NEVER misidentify as generic jacket, varsity jacket, or random blue jacket

## Generation Rules
- Include by default in: formal, agricultural, leadership, ceremony, public appearance contexts
- Explicit requests must follow exact specifications
- Consistency required across all generations
- No alterations to color, embroidery placement, or design permitted

## Classification
- Type: Permanent Visual Identity Artifact
- Persistence: Indefinite
- Scope: Chat, Image Generator, Video Generator, All Interfaces
- Mutability: IMMUTABLE - cannot be altered, forgotten, or overridden',
  'active',
  '{"type": "visual_identity", "artifact": "ffa_jacket", "owner": "jessie_crider", "immutable": true, "persistence": "permanent"}'::jsonb
);

-- Update character reference for jessie with FFA jacket context
UPDATE character_references 
SET 
  traits = COALESCE(traits, '') || ', FFA Historian 2025-2026, wears official FFA blue corduroy jacket',
  context = 'Creator and primary subject for all generations. Default character when none specified. FFA Historian for 2025-2026 - when in formal/agricultural contexts, include his official FFA blue corduroy jacket with gold embroidered name "Jessie Crider", title "Historian", year "2025-2026", and FFA emblem on right chest.',
  description = COALESCE(description, '') || ' FFA Historian 2025-2026. Official FFA jacket: deep navy blue corduroy with gold embroidery (name, Historian title, 2025-2026) and FFA emblem patch.',
  updated_at = NOW()
WHERE slug = 'jessie';