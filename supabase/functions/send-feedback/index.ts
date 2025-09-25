import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FeedbackRequest {
  subject: string;
  message: string;
  userEmail: string;
  userName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, message, userEmail, userName }: FeedbackRequest = await req.json();

    // Send feedback email to Jessie
    const emailResponse = await resend.emails.send({
      from: "CriderGPT Feedback <onboarding@resend.dev>",
      to: ["jessiecrider3@gmail.com"],
      subject: `CriderGPT Feedback: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Feedback from CriderGPT</h2>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #555;">Subject: ${subject}</h3>
            <p style="margin: 0 0 15px 0;"><strong>From:</strong> ${userName} (${userEmail})</p>
            <div style="background-color: white; padding: 15px; border-radius: 5px; border-left: 3px solid #007bff;">
              <p style="margin: 0; white-space: pre-wrap;">${message}</p>
            </div>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            This feedback was sent from CriderGPT. You can reply directly to this email to respond to the user.
          </p>
        </div>
      `,
      reply_to: userEmail,
    });

    console.log("Feedback email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-feedback function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);