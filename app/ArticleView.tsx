'use client';

import { useState } from "react";
import Link from "next/link";
import { articleTopics } from "@/lib/articles";
import type { WeeklyArticle } from "@/lib/articles";

type ArticleViewProps = {
  article: WeeklyArticle | null;
  notice?: string;
};

export default function ArticleView({ article, notice }: ArticleViewProps) {
  const [selectedTopic, setSelectedTopic] = useState<(typeof articleTopics)[number]>("Alle emner");

  const matchesSelectedTopic =
    !article || selectedTopic === "Alle emner" || selectedTopic === article.topic;

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
            <a className="brand-link" href="#top" id="top" aria-label="SYSTEM – forsiden">
              <h1 className="masthead-mark">
                SYSTEM
                <span className="slash-motif" aria-hidden="true">
                  <span />
                  <span />
                </span>
              </h1>
            </a>
            <div className="tagline-row">
              <p className="tagline-copy">
                Uafhængigt medie.<br />
                <em>Forstå det i øjenhøjde.</em>
              </p>
              <p className="focus-note">ÉN ARTIKEL AD GANGEN<br />UAFHÆNGIG JOURNALISTIK</p>
            </div>
          </div>
        </header>

        <div className="content-wrap" id="seneste" aria-label="SYSTEMs redaktionelle fokus">
          {article ? (
            <>
              <div className="story-controls">
                <div className="topic-filter" role="group" aria-label="Filtrér efter emne">
                  <span className="filter-label">EMNE</span>
                  {articleTopics.map((topic) => (
                    <button
                      className={selectedTopic === topic ? "selected" : ""}
                      key={topic}
                      onClick={() => setSelectedTopic(topic)}
                      type="button"
                      aria-pressed={selectedTopic === topic}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>

              <section className="lead-layout" aria-label="Ugens udvalgte artikel">
                {matchesSelectedTopic ? (
                  <article className="lead-story front-article-card" aria-labelledby="story-title">
                    <div className="article-label">
                      <span>UGENS ARTIKEL</span>
                      <span>·</span>
                      <span>{article.topic.toUpperCase()}</span>
                    </div>
                    <Link className="front-article-link" href={`/artikel/${encodeURIComponent(article.slug)}`} aria-label={`Læs hele artiklen: ${article.title}`}>
                      {article.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="front-article-image" src={article.image_url} alt={`Forsidebillede til ${article.title}`} />
                      ) : (
                        <div className="front-article-image front-article-image-placeholder" aria-hidden="true">SYSTEM · UGENTLIGT OVERBLIK</div>
                      )}
                      <div className="front-article-copy">
                        <h2 id="story-title">{article.title}</h2>
                        <p className="lead-summary">{article.summary}</p>
                        <span className="byline">Af {article.author} <span>·</span> {article.read_time_minutes} min. læsetid</span>
                        <span className="read-article-link">Læs hele artiklen <span aria-hidden="true">→</span></span>
                      </div>
                    </Link>
                  </article>
                ) : (
                  <div className="lead-story" role="status">
                    <p className="lead-summary">
                      Denne uges artikel handler om {article.topic}. Vælg “Alle emner” for at læse den.
                    </p>
                  </div>
                )}
              </section>
            </>
          ) : (
            <section className="lead-layout" aria-label="Ugens artikel">
              <div className="lead-story" role="status">
                <h2>{notice ? "Supabase-forbindelsen" : "Ugens artikel"}</h2>
                <p className="lead-summary">
                  {notice ?? "Der er endnu ikke udgivet en artikel for denne uge."}
                </p>
              </div>
            </section>
          )}
        </div>

        <footer className="site-footer">
          <span className="footer-statement"><span className="signal-dot" />Uafhængig journalistik</span>
          <span>Danmark · Norden · Europa</span>
          <a href="/admin">Redaktørlogin</a>
          <span>© 2026 SYSTEM</span>
        </footer>
      </div>
    </main>
  );
}
