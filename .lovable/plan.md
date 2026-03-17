

## Plan: Audio Frequency Generator & Sound Toolkit

### What we're building

A massive **Sound & Frequency Toolkit** — a new navigation tab packed with 100+ features organized into categories. The core is a frequency generator using the Web Audio API (which can produce tones from ~1 Hz up to 22,000 Hz — not limited to 18 Hz). Around it, we'll build a rich set of audio tools, utilities, and fun experiments.

### Browser Audio Capabilities

The **Web Audio API** is fully supported in all modern browsers and can:
- Generate sine, square, sawtooth, triangle waveforms at any frequency
- Layer multiple oscillators (chords, harmonics)
- Apply filters, gain, distortion, reverb
- Analyze audio with FFT (spectrum visualizer)
- Record output via MediaRecorder

### Feature Categories (~120+ features)

**Tone Generator (Core)**
1. Single frequency generator (1–22,000 Hz)
2. Waveform selector (sine/square/sawtooth/triangle)
3. Volume control with visual meter
4. Frequency slider + manual input
5. Play/stop with fade in/out
6. Dual-tone generator (two simultaneous frequencies)
7. Sweep generator (glide between two frequencies)
8. Frequency presets (A440, middle C, etc.)

**Musical Tools**
9. Note-to-frequency converter (C4 = 261.63 Hz)
10. Guitar tuner reference tones (E2-E4)
11. Piano keyboard (playable on screen)
12. Chord generator (major/minor/7th)
13. Scale player (major, minor, pentatonic, blues, etc.)
14. Metronome with adjustable BPM
15. Beat generator (4/4, 3/4, 6/8 time signatures)
16. Interval trainer (play two notes, identify interval)
17. Harmonics explorer (fundamental + overtones)
18. Tuning reference for multiple instruments
19. Octave generator (same note across octaves)
20. Microtonal explorer (quarter tones, etc.)

**Binaural & Wellness**
21. Binaural beat generator (two slightly different frequencies per ear)
22. Solfeggio frequencies (174, 285, 396, 417, 528, 639, 741, 852, 963 Hz)
23. White noise generator
24. Pink noise generator
25. Brown noise generator
26. Rain/nature ambient sound mixer
27. Sleep timer (auto-stop after duration)
28. Focus mode (40 Hz gamma binaural)
29. Relaxation mode (10 Hz alpha binaural)
30. Deep sleep mode (3 Hz delta binaural)
31. Meditation bell (periodic chime)
32. Breathing pacer (visual + audio guide)

**Sound Effects & Fun**
33. Siren generator (frequency sweep loop)
34. Alarm sound creator
35. Doorbell sound
36. Morse code translator (text → beeps)
37. DTMF tone generator (phone dial tones)
38. Sonar ping
39. Heartbeat simulator
40. Sci-fi sound effects (laser, warp, etc.)
41. Bird call simulator
42. Wind sound generator
43. Thunder rumble
44. Ocean waves
45. Applause
46. Coin drop sound

**Audio Analysis**
47. Microphone input spectrum analyzer (FFT)
48. Frequency counter (detect pitch from mic)
49. Decibel meter (mic input level)
50. Waveform visualizer (oscilloscope view)
51. Spectrogram display
52. Peak frequency detector
53. Audio clip analyzer (upload & analyze)

**Science & Education**
54. Speed of sound calculator (by temp/altitude)
55. Wavelength calculator (frequency → wavelength)
56. Doppler effect simulator
57. Resonance frequency calculator
58. Standing wave visualizer
59. Harmonic series explorer
60. Beats phenomenon demo (two close frequencies)
61. Sound intensity calculator (dB scale)
62. Hearing range test (sweep 20–20,000 Hz)
63. Frequency-to-color synesthesia mapper
64. Musical ratio calculator (intervals as ratios)

**Signal Processing**
65. Low-pass filter demo
66. High-pass filter demo
67. Band-pass filter demo
68. Notch filter demo
69. Reverb effect
70. Delay/echo effect
71. Distortion effect
72. Chorus effect
73. Tremolo effect
74. Vibrato effect
75. AM modulation demo
76. FM modulation demo
77. Ring modulation

**Utility Tools**
78. Speaker test (left/right channel)
79. Subwoofer test tones
80. Headphone balance checker
81. Audio latency tester
82. Clipping detector
83. Tone burst generator (pulsed tones)
84. Frequency counter stopwatch
85. BPM tapper (tap tempo)
86. Audio A/B comparison
87. Volume calibration tool

**Pattern & Sequence**
88. Step sequencer (8/16 step)
89. Arpeggiator
90. Random melody generator
91. Drum pattern generator
92. Polyrhythm generator
93. Euclidean rhythm generator
94. Ambient drone creator
95. Generative music engine
96. Sound chain builder (connect effects)

**Communication & Signals**
97. Morse code decoder (from mic)
98. DTMF decoder
99. Ultrasonic beacon (18–20 kHz)
100. Infrasound generator (1–20 Hz, feel not hear)
101. Emergency frequency references
102. Radio frequency reference chart
103. Musical frequency chart (all notes)

**Recording & Export**
104. Record generated audio
105. Export as WAV
106. Loop recorder
107. Multi-track mixer (4 channels)
108. Fade in/out editor
109. Trim tool
110. Combine two recordings

**Presets & Favorites**
111. Save custom frequency presets
112. Preset categories (music, science, wellness, fun)
113. Share presets via link
114. Import/export preset packs
115. Recently used frequencies
116. Favorite tones list

**Visualizations**
117. Circular spectrum analyzer
118. 3D waveform display
119. Lissajous curve (two oscillators)
120. Chladni pattern simulator
121. Frequency color wheel
122. Particle visualizer (reacts to audio)

### Technical approach

- **All client-side** using the Web Audio API — no backend needed
- One new component: `src/components/FrequencyGenerator.tsx` — a large tabbed interface with sub-sections
- One new panel: `src/components/panels/FrequencyPanel.tsx`
- Add to navigation sidebar and mobile nav under TOOLS
- Add to Index.tsx panel routing
- Features organized into collapsible category sections with a search/filter bar
- localStorage for saving presets and favorites

### Files to create/modify

| File | Action |
|---|---|
| `src/components/FrequencyGenerator.tsx` | **Create** — main component with all features |
| `src/components/panels/FrequencyPanel.tsx` | **Create** — panel wrapper |
| `src/components/NavigationSidebar.tsx` | **Modify** — add nav entry |
| `src/components/MobileNavigation.tsx` | **Modify** — add nav entry |
| `src/pages/Index.tsx` | **Modify** — add panel type + rendering |

The component will be built with lazy-loaded sub-sections so it doesn't bloat initial load. Each category will be a collapsible accordion section.

