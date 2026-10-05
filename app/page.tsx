'use client';

import Image from "next/image";
import { useEffect, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";

const maxImageSize = 8 * 1024 * 1024;
const topics = ["Alle emner", "AI & robotter", "Klima & energi", "Videnskab", "Digitalt liv"] as const;
type Topic = (typeof topics)[number];

const articles: {
  topic: Exclude<Topic, "Alle emner">;
  title: string;
  summary: string;
  paragraphs: string[];
  author: string;
  readTime: string;
}[] = [
  {
    topic: "AI & robotter",
    title: "Robotter rykker ud af fabrikken og ind i vores hverdag",
    summary: "En ny generation af intelligente maskiner er klar til mere end samlebåndet. Men hvad sker der, når robotten bliver en del af hverdagen?",
    paragraphs: [
      "Robotter har længe været en fast del af industrien. Nu bliver de mere fleksible, bedre til at forstå deres omgivelser og lettere at samarbejde med. Det åbner døren til nye opgaver på hospitaler, lagre og i hjemmet.",
      "Udviklingen handler ikke kun om smartere maskiner. Den handler også om, hvordan vi vælger at bruge dem. Klare regler, gennemtænkt design og mennesker med de rette kompetencer bliver afgørende, hvis teknologien skal skabe værdi i hverdagen.",
    ],
    author: "SYSTEM-redaktionen",
    readTime: "6 min. læsetid",
  },
  {
    topic: "Klima & energi",
    title: "Solceller får mere ud af lyset – og kan ændre energiregnskabet",
    summary: "Nye materialer giver forskere håb om solceller, der både producerer mere strøm og kræver færre ressourcer.",
    paragraphs: [
      "Solenergi er blevet billigere de seneste år, men effektivitet og materialeforbrug sætter stadig grænser. Forskere undersøger nu nye lag, der kan fange flere dele af solens spektrum.",
      "Teknologien er endnu under udvikling. Næste skridt er at vise, at den kan holde til mange års vejr og daglig brug – ikke kun klare sig godt i laboratoriet.",
    ],
    author: "SYSTEM-redaktionen",
    readTime: "4 min. læsetid",
  },
  {
    topic: "Videnskab",
    title: "Forskere kortlægger de små ændringer, der former vores søvn",
    summary: "Nye målinger giver et mere detaljeret billede af, hvordan lys, vaner og teknologi påvirker nattens hvile.",
    paragraphs: [
      "Søvnforskning bevæger sig fra gennemsnit mod mere præcise målinger. Små sensorer kan følge mønstre over tid og hjælpe forskere med at forstå, hvorfor den samme rutine virker forskelligt fra person til person.",
      "Målingerne kan give nyttig viden, men de er ikke en diagnose i sig selv. Forskere understreger, at gode søvnvaner og professionel rådgivning fortsat spiller en central rolle.",
    ],
    author: "SYSTEM-redaktionen",
    readTime: "5 min. læsetid",
  },
  {
    topic: "Digitalt liv",
    title: "Dine data er værdifulde – sådan får du bedre styr på dem",
    summary: "Et par enkle vaner kan gøre det lettere at beskytte dine oplysninger uden at gøre hverdagen besværlig.",
    paragraphs: [
      "Mange digitale tjenester indsamler oplysninger for at fungere og blive tilpasset brugeren. Det kan være svært at følge med i, hvad der deles, og hvor længe det bliver gemt.",
      "Start med unikke adgangskoder og tofaktorgodkendelse på dine vigtigste konti. Gennemgå derefter app-tilladelser og privatlivsindstillinger, når du installerer noget nyt – små valg kan tilsammen gøre en forskel.",
    ],
    author: "SYSTEM-redaktionen",
    readTime: "3 min. læsetid",
  },
];

export default function Home() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic>("Alle emner");
  const story = articles.find((article) =>
    selectedTopic === "Alle emner" || article.topic === selectedTopic,
  )!;

  useEffect(() => {
    if (!imageUrl) return;
    return () => URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  function addImage(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Vælg en billedfil, for eksempel JPG, PNG eller WebP.");
      return;
    }
    if (file.size > maxImageSize) {
      setImageError("Billedet må højst fylde 8 MB.");
      return;
    }

    setImageError("");
    setImageUrl(URL.createObjectURL(file));
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    addImage(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    addImage(event.dataTransfer.files[0]);
  }

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
              <p className="tagline-copy">Uafhængigt medie for fremtidens infrastruktur</p>
              <p className="focus-note">ÉN ARTIKEL AD GANGEN<br />UAFHÆNGIG JOURNALISTIK</p>
            </div>
          </div>
        </header>

        <div className="content-wrap" id="seneste" aria-label="SYSTEMs redaktionelle fokus">
        <div className="story-controls">
          <div className="topic-filter" role="group" aria-label="Filtrér efter emne">
            <span className="filter-label">EMNE</span>
            {topics.map((topic) => (
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

        <section className="lead-layout" aria-label="Udvalgt artikel">
          <article className="lead-story" aria-labelledby="story-title">
            <div className="article-label"><span>UDVALGT ARTIKEL</span><span>·</span><span>{story.topic.toUpperCase()}</span></div>
            <div
              className={`image-uploader${isDragging ? " is-dragging" : ""}${imageUrl ? " has-image" : ""}`}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setIsDragging(false);
                }
              }}
              onDrop={handleDrop}
            >
              {imageUrl ? (
                <Image
                  className="lead-image"
                  src={imageUrl}
                  alt="Dit valgte forsidefoto"
                  width={1200}
                  height={750}
                  unoptimized
                />
              ) : (
                <div className="upload-prompt">
                  <span className="upload-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
                    </svg>
                  </span>
                  <span className="upload-title">Gør forsiden til din</span>
                  <span className="upload-copy">Træk et billede hertil, eller vælg en fil</span>
                  <label className="upload-button" htmlFor="cover-image">Vælg billede</label>
                  <span className="upload-limit">JPG, PNG eller WebP · maks. 8 MB</span>
                </div>
              )}
              <input
                className="visually-hidden"
                id="cover-image"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                aria-label="Vælg et forsidebillede"
              />
              {imageUrl && (
                <div className="image-actions">
                  <label className="image-action" htmlFor="cover-image">Skift billede</label>
                  <button className="image-action" onClick={() => setImageUrl(null)} type="button">
                    Fjern billede
                  </button>
                </div>
              )}
            </div>
            {imageError && <p className="upload-error" role="alert">{imageError}</p>}

            <h2 id="story-title">{story.title}</h2>
            <p className="lead-summary">{story.summary}</p>
            <p className="byline">Af {story.author} <span>·</span> {story.readTime}</p>
            <div className="article-body">
              {story.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </article>
        </section>
        </div>

        <footer className="site-footer">
          <span className="footer-statement"><span className="signal-dot" />Uafhængig journalistik</span>
          <span>Danmark · Norden · Europa</span>
          <span>© 2026 SYSTEM</span>
        </footer>
      </div>
    </main>
  );
}