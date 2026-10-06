import ArticleView from "./ArticleView";
import { getCurrentWeekStartInCopenhagen } from "@/lib/articles";
import type { WeeklyArticle } from "@/lib/articles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    return (
      <ArticleView
        article={null}
        notice="Tilføj Supabase URL og publishable key i .env.local (brug .env.example som skabelon), og genstart udviklingsserveren."
      />
    );
  }

  const weekStart = getCurrentWeekStartInCopenhagen();
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("articles")
    .select("slug, title, summary, body, topic, author, read_time_minutes, image_url, week_start")
    .eq("week_start", weekStart)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("Supabase kunne ikke hente ugens artikel:", error.message);
    return (
      <ArticleView
        article={null}
        notice="Artiklen kunne ikke hentes. Kontrollér Supabase-tabellen, Data API-adgang og RLS-læsepolitikken."
      />
    );
  }

  return (
    <ArticleView
      article={data as unknown as WeeklyArticle | null}
      notice={`Der er endnu ikke udgivet en artikel for ugen, der begynder ${weekStart}.`}
    />
  );
}
