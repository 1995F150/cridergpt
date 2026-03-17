
INSERT INTO public.snapchat_lens_analytics (
  lens_name, snapshot_date, total_views, total_plays, total_shares,
  top_countries, top_interests, notes
) VALUES (
  'Vibe Check Bot (CriderGPT)', '2026-03-17', 5000, 4000, 33,
  '[{"country": "United States", "percentage": 75.57}, {"country": "Canada", "percentage": 4.72}, {"country": "United Kingdom", "percentage": 0.71}, {"country": "Algeria", "percentage": 0.40}, {"country": "Saudi Arabia", "percentage": 0.38}]'::jsonb,
  '["Gamers", "Sports Fans", "Shoppers", "Casual & Mobile Gamers", "Music Fans", "American Football Fans", "Film & TV Fans", "Console & PC Gamers", "Travel Enthusiasts", "News Watchers"]'::jsonb,
  'First analytics snapshot. Lens based on CriderGPT branding. Strong US audience (75%+), heavy gamer demographic.'
);

INSERT INTO public.cridergpt_training_data (
  dataset_name, description, category, data_type, content, status, metadata
) VALUES (
  'Snapchat Lens Analytics - Vibe Check Bot',
  'Performance data from CriderGPT Snapchat Lens (Vibe Check Bot filter)',
  'analytics',
  'snapchat_lens',
  '# Snapchat Lens Analytics — Vibe Check Bot (CriderGPT)

## Lens Overview
- **Lens Name**: Vibe Check Bot
- **Platform**: Snapchat (Lens/Filter)
- **Brand**: CriderGPT-themed UI filter
- **Snapshot Date**: March 17, 2026

## Performance Metrics
- **Total Views**: ~5,000
- **Total Plays**: ~4,000
- **Total Shares**: 33
- **Engagement Rate**: Strong play-to-view ratio (~80%)

## Geographic Distribution
| Country | Percentage |
|---------|-----------|
| United States | 75.57% |
| Canada | 4.72% |
| United Kingdom | 0.71% |
| Algeria | 0.40% |
| Saudi Arabia | 0.38% |

## Top Audience Interests
1. Gamers
2. Sports Fans
3. Shoppers
4. Casual & Mobile Gamers
5. Music Fans
6. American Football Fans
7. Film & TV Fans
8. Console & PC Gamers
9. Travel Enthusiasts
10. News Watchers

## Key Insights
- Overwhelming US-based audience (75%+) — CriderGPT''s core market
- Gamer demographic dominates — aligns perfectly with RDR2 Guide and gaming content
- Console & PC Gamers present — potential cross-promotion with mod tools
- Sports & American Football fans present — potential for sports-themed filters
- Good engagement ratio suggests the CriderGPT branding resonates on Snapchat
- Shares are low (33) relative to views — opportunity to add share incentives

## Promotion Strategy Insights
- Create more gaming-themed Snapchat filters to capture the gamer audience
- Cross-promote RDR2 Guide content via Snapchat Lens overlays
- Consider sports-themed AI filters for the football fan segment
- Add CriderGPT watermark/CTA to drive app signups from Snapchat',
  'active',
  '{"source": "snapchat_developer_insights", "importance": "high", "type": "platform_analytics", "lens_name": "Vibe Check Bot"}'::jsonb
);
