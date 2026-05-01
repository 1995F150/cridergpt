import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { BREEDS } from '@/content/breeds';
import { Button } from '@/components/ui/button';

export default function BreedIndex() {
  const bySpecies = BREEDS.reduce<Record<string, typeof BREEDS>>((acc, b) => {
    (acc[b.species] ||= []).push(b);
    return acc;
  }, {});

  return (
    <>
      <Helmet>
        <title>Livestock Breed Encyclopedia — Cattle, Sheep, Swine, Goats | CriderGPT</title>
        <meta
          name="description"
          content="Free livestock breed guide for FFA students, 4-H, and farmers. Cattle, swine, sheep, goat breed profiles with show tips, weights, and origins."
        />
        <link rel="canonical" href="https://cridergpt.com/breeds" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Livestock Breed Encyclopedia',
            description:
              'Breed profiles for cattle, sheep, swine, and goats with FFA show tips.',
            url: 'https://cridergpt.com/breeds',
          })}
        </script>
      </Helmet>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 px-4 py-10">
        <div className="max-w-4xl mx-auto space-y-8">
          <header className="text-center space-y-3">
            <h1 className="text-4xl font-bold tracking-tight">Livestock Breed Encyclopedia</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Quick-reference breed guide built by an FFA member for FFA members. Cattle, hogs,
              sheep, and goats — origins, weights, temperaments, and show ring tips.
            </p>
            <Button asChild>
              <Link to="/">Try CriderGPT for free</Link>
            </Button>
          </header>

          {Object.entries(bySpecies).map(([species, list]) => (
            <section key={species} className="space-y-3">
              <h2 className="text-2xl font-semibold">{species}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {list.map((b) => (
                  <Link key={b.slug} to={`/breeds/${b.slug}`}>
                    <Card className="p-4 hover:border-primary transition-colors h-full">
                      <div className="font-semibold">{b.name}</div>
                      <div className="text-xs text-muted-foreground mb-2">
                        {b.origin} · {b.primaryUse}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{b.description}</p>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
