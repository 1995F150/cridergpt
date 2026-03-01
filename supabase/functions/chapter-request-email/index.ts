import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "jessiecrider3@gmail.com";

interface ChapterEmailRequest {
  type: "submitted" | "approved" | "rejected";
  chapter_name: string;
  state: string;
  city?: string | null;
  school_name?: string | null;
  user_id?: string;
  user_email?: string;
  admin_notes?: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: ChapterEmailRequest = await req.json();
    const { type, chapter_name, state, city, school_name, user_id, user_email, admin_notes } = payload;

    console.log(`Processing chapter email: type=${type}, chapter=${chapter_name}`);

    let toEmail: string;
    let subject: string;
    let htmlContent: string;

    if (type === "submitted") {
      // Admin notification for new request
      toEmail = ADMIN_EMAIL;
      subject = `New FFA Chapter Request: ${chapter_name}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">New Chapter Request Submitted</h1>
          <p>A new FFA chapter request has been submitted and requires your review.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #1f2937;">${chapter_name}</h2>
            <p><strong>State:</strong> ${state}</p>
            ${city ? `<p><strong>City:</strong> ${city}</p>` : ''}
            ${school_name ? `<p><strong>School:</strong> ${school_name}</p>` : ''}
            <p><strong>Submitted by:</strong> ${user_email || 'Unknown'}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          <p>Please review this request in the CriderGPT Admin Panel.</p>
          
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
            This is an automated message from CriderGPT.
          </p>
        </div>
      `;
    } else if (type === "approved") {
      // User notification for approval
      if (!user_email && user_id) {
        // Fetch user email from Supabase
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(user_id);
        if (userError || !userData?.user?.email) {
          console.error("Could not fetch user email:", userError);
          throw new Error("Could not find user email for notification");
        }
        toEmail = userData.user.email;
      } else if (user_email) {
        toEmail = user_email;
      } else {
        throw new Error("No user email provided for approval notification");
      }

      subject = `Your FFA Chapter Request Has Been Approved! 🎉`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #16a34a;">Great News! Your Chapter Request is Approved!</h1>
          
          <p>We're excited to let you know that your FFA chapter request has been approved.</p>
          
          <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
            <h2 style="margin-top: 0; color: #166534;">${chapter_name}</h2>
            <p><strong>State:</strong> ${state}</p>
            ${city ? `<p><strong>City:</strong> ${city}</p>` : ''}
          </div>
          
          <p>Your chapter has been added to the CriderGPT database. You can now select it when setting up or updating your FFA profile.</p>
          
          ${admin_notes ? `<p><strong>Admin Notes:</strong> ${admin_notes}</p>` : ''}
          
          <p>Thank you for being part of the FFA community!</p>
          
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
            This is an automated message from CriderGPT.
          </p>
        </div>
      `;
    } else if (type === "rejected") {
      // User notification for rejection
      if (!user_email && user_id) {
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(user_id);
        if (userError || !userData?.user?.email) {
          console.error("Could not fetch user email:", userError);
          throw new Error("Could not find user email for notification");
        }
        toEmail = userData.user.email;
      } else if (user_email) {
        toEmail = user_email;
      } else {
        throw new Error("No user email provided for rejection notification");
      }

      subject = `Update on Your FFA Chapter Request`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #dc2626;">Update on Your Chapter Request</h1>
          
          <p>Thank you for submitting a chapter request. After careful review, we were unable to approve your request at this time.</p>
          
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h2 style="margin-top: 0; color: #991b1b;">${chapter_name}</h2>
            <p><strong>State:</strong> ${state}</p>
            ${city ? `<p><strong>City:</strong> ${city}</p>` : ''}
          </div>
          
          ${admin_notes ? `
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Reason:</strong> ${admin_notes}</p>
            </div>
          ` : ''}
          
          <p>If you believe this was an error or have additional information to provide, please feel free to submit a new request or contact support.</p>
          
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
            This is an automated message from CriderGPT.
          </p>
        </div>
      `;
    } else {
      throw new Error(`Unknown email type: ${type}`);
    }

    console.log(`Sending email to: ${toEmail}`);

    const emailResponse = await resend.emails.send({
      from: "CriderGPT <onboarding@resend.dev>",
      to: [toEmail],
      subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in chapter-request-email function:", error);
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
