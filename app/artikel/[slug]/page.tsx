import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ArticlePageProps = PageProps<"/artikel/[slug]">;

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const supabase = createSupabaseServerClient();
  const { data: article, error } = await supabase
    .from("articles")
    .select("slug, title, summary, body, topic, author, read_time_minutes, image_url, week_start")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("Supabase kunne ikke hente artiklen:", error.message);
    throw new Error("Artiklen kunne ikke hentes lige nu.");
  }
  if (!article) notFound();

  const paragraphs: string[] = article.body.split(/\n\s*\n/).filter(Boolean);

  return (
    <main className="paper-field">
      <div className="newspaper-page">
        <header className="masthead-wrap" aria-label="SYSTEM avishoved">
          <div className="meta-row">
            <span>UAFHÆNGIG JOURNALISTIK</span>
            <span className="meta-center">INFRASTRUKTUR · TEKNOLOGI · SAMFUND</span>
            <span className="meta-right">DANMARK · 2026</span>
          </div>
          <div className="brand-stage">
            <Link className="brand-link" href="/" aria-label="SYSTEM – forsiden">
              <h1 className="masthead-mark">
                SYSTEM
                <span className="slash-motif" aria-hidden="true"><span /><span /></span>
              </h1>
            </Link>
            <div className="tagline-row">
              <p className="tagline-copy">Uafhængigt medie.<br /><em>Forstå det i øjenhøjde.</em></p>
              <p className="focus-note">UAFHÆNGIG JOURNALISTIK<br />DANMARK · NORDEN · EUROPA</p>
            </div>
          </div>
        </header>

        <article className="article-detail">
          <Link className="article-back-link" href="/">← Tilbage til forsiden</Link>
          <div className="article-label"><span>{article.topic.toUpperCase()}</span><span>·</span><span>UGENS ARTIKEL</span></div>
          <h1>{article.title}</h1>
          <p className="article-detail-summary">{article.summary}</p>
          <p className="article-detail-byline">Af {article.author} <span>·</span> {article.read_time_minutes} min. læsetid</p>
          {article.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="article-detail-image" src={article.image_url} alt={`Forsidebillede til ${article.title}`} />
          )}
          <div className="article-detail-body">
            {paragraphs.map((paragraph, index) => <p key={`${index}-${paragraph}`}>{paragraph}</p>)}
          </div>
        </article>

        <footer className="site-footer">
          <span className="footer-statement"><span className="signal-dot" />Uafhængig journalistik</span>
          <span>Danmark · Norden · Europa</span>
          <Link href="/admin">Redaktørlogin</Link>
          <span>© 2026 SYSTEM</span>
        </footer>
      </div>
    </main>
  );
}
