import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getBreedBySlug } from '@/content/breeds';
import { ArrowLeft, Sparkles } from 'lucide-react';

export default function BreedDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const breed = slug ? getBreedBySlug(slug) : undefined;

  if (!breed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">Breed not found</h1>
          <Button onClick={() => navigate('/breeds')}>Back to encyclopedia</Button>
        </Card>
      </div>
    );
  }

  const title = `${breed.name} ${breed.species} — Breed Profile, Show Tips & Origin | CriderGPT`;
  const desc = `${breed.name} ${breed.species.toLowerCase()} breed: ${breed.description.slice(0, 140)}`;

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={`https://cridergpt.com/breeds/${breed.slug}`} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: `${breed.name} Breed Profile`,
            description: desc,
            author: { '@type': 'Person', name: 'Jessie Crider' },
            publisher: { '@type': 'Organization', name: 'CriderGPT' },
          })}
        </script>
      </Helmet>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 px-4 py-10">
        <div className="max-w-3xl mx-auto space-y-6">
          <Link to="/breeds" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> All breeds
          </Link>

          <header className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-primary font-semibold">{breed.species}</div>
            <h1 className="text-4xl font-bold">{breed.name}</h1>
            <p className="text-muted-foreground">{breed.description}</p>
          </header>

          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Origin</div>
              <div className="font-semibold">{breed.origin}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Primary Use</div>
              <div className="font-semibold">{breed.primaryUse}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Mature Weight</div>
              <div className="font-semibold">{breed.weight}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Temperament</div>
              <div className="font-semibold">{breed.temperament}</div>
            </Card>
          </div>

          <Card className="p-6 space-y-3">
            <h2 className="font-semibold text-lg">FFA Show Ring Tips</h2>
            <ul className="space-y-2 text-sm">
              {breed.ffaShowTips.map((tip, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary font-bold">{i + 1}.</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6 bg-primary/5 border-primary/30 text-center space-y-3">
            <Sparkles className="h-8 w-8 mx-auto text-primary" />
            <h2 className="font-semibold">Want personalized advice for your {breed.name}?</h2>
            <p className="text-sm text-muted-foreground">
              CriderGPT is an AI assistant built by an FFA member. Ask it anything about feed,
              show prep, breeding, or care.
            </p>
            <Button asChild size="lg">
              <Link to="/">Open CriderGPT</Link>
            </Button>
          </Card>
        </div>
      </div>
    </>
  );
}
