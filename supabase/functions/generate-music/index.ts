import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const voiceEngineUrl =
      Deno.env.get("VOICE_ENGINE_URL") || "http://localhost:5000";

    const body = await req.json();
    const { action, prompt, genre, mood, bpm, duration, title, voice_profile_id } = body;

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Missing 'action' field" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create a track record in pending state
    const trackType = action === "beat" ? "beat" : action === "hum" ? "hum" : action === "cover" ? "cover" : "generate";
    const { data: track, error: insertError } = await supabase
      .from("music_tracks")
      .insert({
        user_id: userId,
        title: title || `${trackType} track`,
        track_type: trackType,
        prompt: prompt || null,
        genre: genre || null,
        mood: mood || null,
        bpm: bpm || null,
        duration_seconds: duration || 15,
        status: "processing",
        voice_profile_id: voice_profile_id || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create track record:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create track record" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Route to the appropriate engine endpoint
    let engineEndpoint: string;
    let engineBody: Record<string, unknown>;

    switch (action) {
      case "generate":
        engineEndpoint = `${voiceEngineUrl}/music/generate`;
        engineBody = { prompt, genre, mood, duration: duration || 15 };
        break;
      case "beat":
        engineEndpoint = `${voiceEngineUrl}/music/beat`;
        engineBody = {
          genre: genre || "hip hop",
          bpm: bpm || 120,
          mood: mood || "energetic",
          duration: duration || 15,
        };
        break;
      case "cover":
        // Cover requires file upload — forward the request body
        engineEndpoint = `${voiceEngineUrl}/music/cover`;
        engineBody = body;
        break;
      case "hum":
        engineEndpoint = `${voiceEngineUrl}/music/hum`;
        engineBody = body;
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    // Call voice engine
    const engineResponse = await fetch(engineEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(engineBody),
    });

    if (!engineResponse.ok) {
      const errorText = await engineResponse.text();
      console.error("Engine error:", errorText);

      // Update track status to failed
      await supabase
        .from("music_tracks")
        .update({ status: "failed", error_message: errorText })
        .eq("id", track.id);

      return new Response(
        JSON.stringify({
          error: "Music generation failed",
          details: errorText,
          track_id: track.id,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Upload generated audio to Supabase Storage
    const audioBlob = await engineResponse.blob();
    const fileName = `${userId}/${track.id}.wav`;

    const { error: uploadError } = await supabase.storage
      .from("voice-samples")
      .upload(`music/${fileName}`, audioBlob, {
        contentType: "audio/wav",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      await supabase
        .from("music_tracks")
        .update({
          status: "failed",
          error_message: "Failed to upload audio",
        })
        .eq("id", track.id);

      return new Response(
        JSON.stringify({ error: "Failed to upload generated audio" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("voice-samples")
      .getPublicUrl(`music/${fileName}`);

    // Update track with completed status and URL
    await supabase
      .from("music_tracks")
      .update({
        status: "completed",
        audio_url: urlData.publicUrl,
      })
      .eq("id", track.id);

    return new Response(
      JSON.stringify({
        success: true,
        track_id: track.id,
        audio_url: urlData.publicUrl,
        track_type: trackType,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("generate-music error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
