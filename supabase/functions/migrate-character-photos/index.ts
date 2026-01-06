import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Photos to migrate from public folder to Supabase Storage
const PHOTOS_TO_MIGRATE = [
  { publicPath: 'jessie-crider-reference-1.jpg', storagePath: 'jessie/reference-1.jpg' },
  { publicPath: 'ffa-jacket-reference-1.jpg', storagePath: 'jessie/ffa-jacket-1.jpg' },
  { publicPath: 'creator-reference.png', storagePath: 'jessie/creator-reference.png' },
  { publicPath: 'agbusinessman-medal.jpg', storagePath: 'jessie/agbusinessman-medal.jpg' },
  { publicPath: 'savanaa-reference-1.png', storagePath: 'savanaa/reference-1.png' },
  { publicPath: 'savanaa-reference-2.png', storagePath: 'savanaa/reference-2.png' },
  { publicPath: 'savanaa-reference-3.png', storagePath: 'savanaa/reference-3.png' },
  { publicPath: 'savanaa-reference-4.png', storagePath: 'savanaa/reference-4.png' },
  { publicPath: 'savanaa-reference-5.png', storagePath: 'savanaa/reference-5.png' },
  { publicPath: 'savanaa-reference-6.png', storagePath: 'savanaa/reference-6.png' },
  { publicPath: 'savanaa-reference-7.png', storagePath: 'savanaa/reference-7.png' },
  { publicPath: 'savanaa-reference-8.png', storagePath: 'savanaa/reference-8.png' },
  { publicPath: 'savanaa-reference-9.png', storagePath: 'savanaa/reference-9.png' },
  { publicPath: 'savanaa-reference-10.png', storagePath: 'savanaa/reference-10.png' },
  { publicPath: 'jr-hoback-reference-1.jpg', storagePath: 'jr-hoback/reference-1.jpg' },
  { publicPath: 'jr-hoback-reference-2.jpg', storagePath: 'jr-hoback/reference-2.jpg' },
  { publicPath: 'jr-hoback-reference-3.jpg', storagePath: 'jr-hoback/reference-3.jpg' },
  { publicPath: 'dr-harman-reference-1.png', storagePath: 'dr-harman/reference-1.png' },
];

const BUCKET_NAME = 'character-references';
const PUBLIC_BASE_URL = 'https://preview--cridergpt.lovable.app';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'founder') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: { photo: string; status: string; newUrl?: string; error?: string }[] = [];
    const storageBaseUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}`;

    console.log('Starting photo migration...');

    for (const photo of PHOTOS_TO_MIGRATE) {
      try {
        console.log(`Processing: ${photo.publicPath}`);
        
        // Fetch the image from public folder
        const imageUrl = `${PUBLIC_BASE_URL}/${photo.publicPath}`;
        console.log(`Fetching from: ${imageUrl}`);
        
        const response = await fetch(imageUrl);
        if (!response.ok) {
          results.push({ 
            photo: photo.publicPath, 
            status: 'error', 
            error: `Failed to fetch: ${response.status} ${response.statusText}` 
          });
          continue;
        }

        const imageBlob = await response.blob();
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        
        console.log(`Uploading to storage: ${photo.storagePath} (${contentType}, ${imageBlob.size} bytes)`);

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(photo.storagePath, imageBlob, {
            contentType,
            upsert: true // Overwrite if exists
          });

        if (uploadError) {
          results.push({ 
            photo: photo.publicPath, 
            status: 'error', 
            error: uploadError.message 
          });
          continue;
        }

        const newUrl = `${storageBaseUrl}/${photo.storagePath}`;
        results.push({ 
          photo: photo.publicPath, 
          status: 'success', 
          newUrl 
        });

        console.log(`Successfully uploaded: ${photo.storagePath}`);

      } catch (error) {
        console.error(`Error processing ${photo.publicPath}:`, error);
        results.push({ 
          photo: photo.publicPath, 
          status: 'error', 
          error: error.message 
        });
      }
    }

    // Now update character_references table with new URLs
    console.log('Updating character_references table...');
    
    const characterUpdates = [
      { 
        slug: 'jessie', 
        newUrl: `${storageBaseUrl}/jessie/reference-1.jpg`,
        newPath: 'jessie/reference-1.jpg'
      },
      { 
        slug: 'savanaa', 
        newUrl: `${storageBaseUrl}/savanaa/reference-1.png`,
        newPath: 'savanaa/reference-1.png'
      },
      { 
        slug: 'jr-hoback', 
        newUrl: `${storageBaseUrl}/jr-hoback/reference-1.jpg`,
        newPath: 'jr-hoback/reference-1.jpg'
      },
      { 
        slug: 'dr-harman', 
        newUrl: `${storageBaseUrl}/dr-harman/reference-1.png`,
        newPath: 'dr-harman/reference-1.png'
      },
    ];

    for (const update of characterUpdates) {
      const { error: updateError } = await supabase
        .from('character_references')
        .update({ 
          reference_photo_url: update.newUrl,
          reference_photo_path: update.newPath,
          updated_at: new Date().toISOString()
        })
        .eq('slug', update.slug);

      if (updateError) {
        console.error(`Failed to update ${update.slug}:`, updateError);
      } else {
        console.log(`Updated character_references for ${update.slug}`);
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log(`Migration complete: ${successCount} success, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        message: 'Photo migration complete',
        summary: {
          total: PHOTOS_TO_MIGRATE.length,
          success: successCount,
          errors: errorCount
        },
        results,
        storageBaseUrl
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
