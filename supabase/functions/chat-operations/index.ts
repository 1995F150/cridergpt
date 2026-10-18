import { pageOptions, messageCursor } from '../_shared/chat-history.ts';
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
  metadata?: Record<string, unknown>;
  client_message_id?: string;
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
          let options;
          try { options = pageOptions(url.searchParams); } catch { return new Response(JSON.stringify({ error: 'Invalid pagination' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
          const { limit, offset, search } = options;
          let query = supabaseClient.from('chat_conversations').select('*').eq('user_id', user.id)
            .order('updated_at', { ascending: false }).order('id', { ascending: false });
          if (search) query = query.ilike('title', '%' + search.replace(/[\\%_]/g, '\\$&') + '%');
          const { data, error } = await query.range(offset, offset + limit);
          if (error) throw error;
          const conversations = (data || []).slice(0, limit);
          return new Response(JSON.stringify({ conversations, next_offset: (data || []).length > limit ? offset + limit : null }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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

          let options, cursor;
          try { options = pageOptions(url.searchParams); cursor = messageCursor(url.searchParams.get('before')); } catch { return new Response(JSON.stringify({ error: 'Invalid pagination' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
          const { data: owned, error: ownershipError } = await supabaseClient.from('chat_conversations').select('id').eq('id', conversationId).eq('user_id', user.id).maybeSingle();
          if (ownershipError) throw ownershipError;
          if (!owned) return new Response(JSON.stringify({ error: 'Conversation not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          let query = supabaseClient.from('chat_messages').select('*').eq('conversation_id', conversationId).eq('user_id', user.id)
            .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(options.limit + 1);
          if (cursor) query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
          const { data, error } = await query;
          if (error) throw error;
          const page = (data || []).slice(0, options.limit);
          const last = page.at(-1);
          return new Response(JSON.stringify({ messages: page.reverse(), next_before: (data || []).length > options.limit && last ? { created_at: last.created_at, id: last.id } : null }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Default GET response - return conversations
        const { data: conversations, error } = await supabaseClient
          .from('chat_conversations')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false }).limit(100);

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
              title: typeof title === 'string' && title.trim() ? title.trim().slice(0, 200) : 'New Chat'
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
          const { conversation_id, role, content, tokens_used, image_url, metadata, client_message_id }: ChatMessage = body;
          if (typeof content !== 'string' || content.length > 200000) return new Response(JSON.stringify({ error: 'Message content must be text of at most 200000 characters' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          if (!['user', 'assistant'].includes(role)) return new Response(JSON.stringify({ error: 'Invalid role' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          if (metadata && (typeof metadata !== 'object' || Array.isArray(metadata) || JSON.stringify(metadata).length > 16000)) return new Response(JSON.stringify({ error: 'Invalid message metadata' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          if (client_message_id && !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(client_message_id)) return new Response(JSON.stringify({ error: 'Invalid message ID' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          
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
              ...(client_message_id ? { id: client_message_id } : {}),
              conversation_id,
              user_id: user.id,
              role,
              content,
              metadata: metadata || null,
              tokens_used: tokens_used || 0,
              image_url: image_url || null
            })
            .select()
            .single();

          if (error?.code === '23505' && client_message_id) {
            const { data: existing } = await supabaseClient.from('chat_messages').select('*').eq('id', client_message_id).eq('user_id', user.id).eq('conversation_id', conversation_id).maybeSingle();
            if (existing && existing.content === content && existing.role === role && (existing.image_url || null) === (image_url || null)) return new Response(JSON.stringify({ message: existing, deduplicated: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            return new Response(JSON.stringify({ error: 'Message ID conflict' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
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

          if (typeof title !== 'string' || !title.trim() || title.length > 200) return new Response(JSON.stringify({ error: 'Title must contain 1–200 characters' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          // Update conversation
          const { data: conversation, error } = await supabaseClient
            .from('chat_conversations')
            .update({ title: title.trim(), updated_at: new Date().toISOString() })
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
    console.error('chat-operations failed', { category: error instanceof Error ? error.name : 'UnknownError' });
    return new Response(
      JSON.stringify({ error: 'Chat storage request failed. Retry or reload history before sending again.' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});