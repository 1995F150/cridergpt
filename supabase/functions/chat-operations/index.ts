import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMessage {
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  tokens_used?: number;
  image_url?: string;
}

interface NewConversation {
  title?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    switch (req.method) {
      case 'GET':
        if (action === 'conversations') {
          // Get all conversations for user
          const { data: conversations, error } = await supabaseClient
            .from('chat_conversations')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });

          if (error) throw error;

          return new Response(
            JSON.stringify({ conversations }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (action === 'get_users') {
          // Get all users from crider_chat_users
          const { data: users, error } = await supabaseClient
            .from('crider_chat_users')
            .select('user_id, display_name, email, avatar_url, status')
            .eq('is_synced', true)
            .order('display_name', { ascending: true })
            .limit(50);

          if (error) throw error;

          const formattedUsers = users?.map(u => ({
            id: u.user_id,
            display_name: u.display_name,
            email: u.email,
            avatar_url: u.avatar_url,
            status: u.status || 'offline'
          })) || [];

          return new Response(
            JSON.stringify({ users: formattedUsers }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (action === 'messages') {
          const conversationId = url.searchParams.get('conversation_id');
          if (!conversationId) {
            return new Response(
              JSON.stringify({ error: 'conversation_id required' }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }

          // Get messages for specific conversation
          const { data: messages, error } = await supabaseClient
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

          if (error) throw error;

          return new Response(
            JSON.stringify({ messages }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Default GET response - return conversations
        const { data: conversations, error } = await supabaseClient
          .from('chat_conversations')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (error) throw error;

        return new Response(
          JSON.stringify({ conversations }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'POST':
        // Handle empty body gracefully
        let body;
        try {
          const text = await req.text();
          body = text ? JSON.parse(text) : {};
        } catch (error) {
          console.error('JSON parsing error:', error);
          return new Response(
            JSON.stringify({ error: 'Invalid JSON in request body' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        if (action === 'create_conversation') {
          const { title, participant_user_id }: NewConversation & { participant_user_id?: string } = body;
          
          // Create new conversation
          const { data: conversation, error } = await supabaseClient
            .from('chat_conversations')
            .insert({
              user_id: user.id,
              title: title || 'New Chat'
            })
            .select()
            .single();

          if (error) throw error;

          return new Response(
            JSON.stringify({ conversation }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (action === 'send_message') {
          const { conversation_id, role, content, tokens_used, image_url }: ChatMessage = body;
          
          if (!conversation_id || !role || (!content && !image_url)) {
            return new Response(
              JSON.stringify({ error: 'conversation_id, role, and either content or image_url are required' }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }

          // Verify conversation belongs to user
          const { data: conversation, error: convError } = await supabaseClient
            .from('chat_conversations')
            .select('id')
            .eq('id', conversation_id)
            .eq('user_id', user.id)
            .single();

          if (convError || !conversation) {
            return new Response(
              JSON.stringify({ error: 'Conversation not found' }),
              { 
                status: 404, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }

          // Insert message
          const { data: message, error } = await supabaseClient
            .from('chat_messages')
            .insert({
              conversation_id,
              user_id: user.id,
              role,
              content,
              tokens_used: tokens_used || 0,
              image_url: image_url || null
            })
            .select()
            .single();

          if (error) throw error;

          return new Response(
            JSON.stringify({ message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        break;

      case 'PUT':
        if (action === 'update_conversation') {
          const { conversation_id, title } = await req.json();
          
          if (!conversation_id) {
            return new Response(
              JSON.stringify({ error: 'conversation_id required' }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }

          // Update conversation
          const { data: conversation, error } = await supabaseClient
            .from('chat_conversations')
            .update({ title })
            .eq('id', conversation_id)
            .eq('user_id', user.id)
            .select()
            .single();

          if (error) throw error;

          return new Response(
            JSON.stringify({ conversation }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        break;

      case 'DELETE':
        if (action === 'delete_conversation') {
          const conversationId = url.searchParams.get('conversation_id');
          
          if (!conversationId) {
            return new Response(
              JSON.stringify({ error: 'conversation_id required' }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }

          // Delete conversation (messages will be cascade deleted)
          const { error } = await supabaseClient
            .from('chat_conversations')
            .delete()
            .eq('id', conversationId)
            .eq('user_id', user.id);

          if (error) throw error;

          return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { 
            status: 405, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in chat-operations:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});