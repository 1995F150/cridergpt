import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Add Jessie's life story to training data
    const lifeStoryContent = `# Jessie Crider Life Story

## Early Life & Education
- **Born**: 6/06/2008 👶 - The start of my journey
- **2015**: Started elementary school 🏫 - Learning, making friends, and discovering the world
- **2020**: Got more into technology and coding 💻 - I loved figuring out how things worked

## Family Legacy & Agriculture
- **11/12/2022**: My grandfather passed away 😔 - Losing him taught me the value of hard work and building a strong work ethic 💪. I wanted to make him proud
- **2023**: Started 9th grade and joined FFA 🌾🐄 - Following in my grandfather's footsteps, I wanted to carry on the family tradition 💛
- **2025**: Took AG classes in high school 🐄🌱, which helped me get a job on a dairy farm in January 2025. Working there taught me hands-on skills, responsibility, and respect for hard work 💪, just like my grandfather did

## Personal Relationships
- **11/18/2023**: Savanaa got with me ❤️ - I was nervous, excited, and didn't fully understand why it happened 🥲. It was a moment that changed everything between us
- **Three days later**: Savanaa posted a screenshot of me being her TG 🥰. She said she would take my last name if she's the one ❤️. I felt so special and loved 😭
- **Later that night**: She sent me a Snap saying we should be lovers instead of friends ❤️🥲. I was confused, happy, and a little scared all at once
- **2024**: There were times I felt she wasn't serious about us 😢, which made me stressed and wonder if I was overthinking or imagining things
- **2024**: Even with long distance, I kept thinking about her 🥰. She made me feel special, and I wanted to make her feel the same way
- **2025**: Looking back, I realize how much she shaped who I am today 😎. I still think about our milestones, laughs, and challenges together

## Tech & Business Journey
- **June 2025**: Started developing CriderGPT 💻 - Began building features, testing, and planning for launch
- **July 2025**: Launched CriderGPT 🚀 - It was the start of my own AI business
- **August 2025**: Added AG-related features to CriderGPT 🌾💻, combining my love for agriculture and technology to help others with farming tools, calculators, and resources
- **2025**: Added new features to CriderGPT: social media tab, auto-translate, and payment plans 💻💰. Testing and updating constantly
- **2025**: Listed CriderGPT on Product Hunt 📈. Got lots of clicks and views but still building a customer base

## Core Values & Motivations
- **Work Ethic**: Influenced by grandfather's legacy and dairy farm experience
- **Technology Passion**: Started young with coding and evolved into AI development
- **Agricultural Heritage**: Combining traditional farming knowledge with modern technology
- **Relationship Growth**: Personal experiences that shaped emotional intelligence and empathy
- **Entrepreneurship**: Building CriderGPT as a bridge between agriculture and AI technology

This personal journey drives my commitment to creating technology that serves real people with real needs, especially in agriculture and technical fields.`;

    const { data, error } = await supabaseClient
      .from('cridergpt_training_data')
      .insert({
        dataset_name: 'Jessie Crider Life Story',
        description: 'Personal journey and milestones that shaped the creator of CriderGPT',
        category: 'personal',
        data_type: 'life_story',
        content: lifeStoryContent,
        status: 'active',
        metadata: {
          source: 'founder_life_story',
          importance: 'high',
          type: 'personal_background'
        }
      });

    if (error) {
      console.error('Error inserting training data:', error);
      throw error;
    }

    console.log('Successfully added life story to training data:', data);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Life story added to CriderGPT training data',
      data 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in add-training-data function:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});