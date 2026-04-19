// Public endpoint for OpenAI Apps domain verification
// Returns the verification token at /.well-known/openai-apps-challenge

const CHALLENGE_TOKEN = "QoJJBlO2XdlTun67J-Ru8_4lrwVFgCoSrD2eOKLc2jc";

Deno.serve(() => {
  return new Response(CHALLENGE_TOKEN, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
