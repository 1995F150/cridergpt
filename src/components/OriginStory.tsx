
import { Card } from "@/components/ui/card";

export function OriginStory() {
  return (
    <section className="py-12 px-6 md:px-20 text-foreground bg-background">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          From Cows to Code: How It All Started
        </h2>

        <div className="space-y-6 text-lg leading-relaxed">
          <p>
            CriderGPT wasn't built in a tech office. It started in the milk barn. Jessie Crider, the one-man force behind CriderGPT, worked just two mornings a week milking cows on a small Virginia farm. Two hours, $10 an hour, enough to scrape together about $40 a week—and every bit of it went toward building this AI platform.
          </p>

          <p>
            No corporate backing. No trust fund. Just Jessie, his phone (often more powerful than the Wi-Fi), and a high-end laptop that never saw the inside of a dairy barn. All the building—every line of code, every integration with Supabase, OpenAI, and Stripe—was done <em>after</em> milking hours. The cow work paid for the tech work. Even things like Lovable credits, ChatGPT Plus, OpenAI bills, and ad campaigns were powered by literal dairy labor.
          </p>

          <p>
            CriderGPT grew into more than just an AI assistant. It became a full FS22 modding system, automation engine, and one of the only platforms coded entirely off $40 weeks and pure Gen Z determination.
          </p>

          <blockquote className="text-xl font-semibold italic text-center text-primary py-6 border-l-4 border-primary pl-6 my-8">
            CriderGPT wasn't built by a startup. It was built by a kid who milked cows, saved up, and refused to quit.
          </blockquote>

          <Card className="mt-8 p-6 bg-muted border-border">
            <div className="text-center">
              <p className="text-sm text-muted-foreground italic">
                📸 [Placeholder for photo: optional future image of the CriderGPT logo, workspace setup, or an inspirational quote box.]
              </p>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
