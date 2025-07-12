import React from "react";

const TTSPolicy = () => (
  <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl p-8 max-w-4xl mx-auto my-8 shadow-lg">
    <h2 className="text-3xl font-bold text-primary mb-4 flex items-center gap-2">
      🗣️ CriderOS Text-to-Speech (TTS) Policy
    </h2>

    <p className="text-lg text-muted-foreground mb-6">
      <strong>Last Updated:</strong> July 2025
    </p>

    <ol className="space-y-4 text-foreground leading-relaxed">
      <li className="flex gap-3">
        <span className="font-bold text-primary">1.</span>
        <div>
          <strong>TTS Overview:</strong> CriderOS uses advanced Text-to-Speech (TTS) to turn text into realistic voice audio. The default TTS voice is Jessie Crider. If the AI speaks, it's probably vibing in Jessie's digital voice.
        </div>
      </li>
      
      <li className="flex gap-3">
        <span className="font-bold text-primary">2.</span>
        <div>
          <strong>Where We Use TTS:</strong> TTS is available in AI Assistant responses, project status updates, automation notifications, and custom voice messages. You can enable/disable TTS in your user settings at any time.
        </div>
      </li>
      
      <li className="flex gap-3">
        <span className="font-bold text-primary">3.</span>
        <div>
          <strong>Voice Selection:</strong> Choose from multiple premium voices including Jessie Crider (default), or select from our voice library. Custom voice training may be available for Pro users.
        </div>
      </li>
      
      <li className="flex gap-3">
        <span className="font-bold text-primary">4.</span>
        <div>
          <strong>Usage Limits:</strong> Free tier includes 100 TTS requests per month. Pro users get unlimited TTS with priority processing. Usage is tracked in your dashboard.
        </div>
      </li>
      
      <li className="flex gap-3">
        <span className="font-bold text-primary">5.</span>
        <div>
          <strong>Audio Quality:</strong> All TTS audio is generated at high quality (48kHz) and automatically optimized for your device. Audio files are temporarily cached for performance.
        </div>
      </li>
      
      <li className="flex gap-3">
        <span className="font-bold text-primary">6.</span>
        <div>
          <strong>Privacy & Data:</strong> TTS requests are processed securely through ElevenLabs. Text content is not stored permanently. Audio files are automatically deleted after 24 hours.
        </div>
      </li>
      
      <li className="flex gap-3">
        <span className="font-bold text-primary">7.</span>
        <div>
          <strong>Acceptable Use:</strong> TTS is for personal and business productivity use. No generation of harmful, offensive, or copyrighted content. Bulk commercial use requires separate licensing.
        </div>
      </li>
      
      <li className="flex gap-3">
        <span className="font-bold text-primary">8.</span>
        <div>
          <strong>Early Release:</strong> During beta, TTS features may have limited availability and evolving capabilities. Your feedback helps us improve the experience.
        </div>
      </li>
    </ol>

    <div className="mt-8 p-4 bg-primary/10 border border-primary/20 rounded-lg">
      <h3 className="font-bold text-primary mb-2">🚀 Early Release Benefits</h3>
      <ul className="space-y-1 text-sm text-muted-foreground">
        <li>• Priority access to new voices and features</li>
        <li>• Direct feedback channel to CriderOS team</li>
        <li>• Special early adopter pricing on Pro features</li>
        <li>• Beta tester recognition in the community</li>
      </ul>
    </div>

    <p className="text-sm text-muted-foreground mt-6 text-center">
      By using CriderOS TTS features, you agree to this policy and our Terms of Service.
    </p>
  </div>
);

export default TTSPolicy;