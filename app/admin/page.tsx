'use client';

import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { articleTopics, getCurrentWeekStartInCopenhagen } from "@/lib/articles";
import type { ArticleTopic, WeeklyArticle } from "@/lib/articles";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type ArticleStatus = "draft" | "published";
type EditorForm = {
  slug: string;
  title: string;
  summary: string;
  body: string;
  topic: ArticleTopic;
  author: string;
  readTimeMinutes: number;
  imageUrl: string;
  status: ArticleStatus;
};
type EditableArticle = WeeklyArticle & {
  id: string;
  slug: string;
  status: ArticleStatus;
  published_at: string | null;
};
type EditorStatus = "checking" | "allowed" | "denied";

const topics = articleTopics.filter((topic): topic is ArticleTopic => topic !== "Alle emner");
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageSize = 8 * 1024 * 1024;

function emptyForm(): EditorForm {
  return {
    slug: "",
    title: "",
    summary: "",
    body: "",
    topic: "AI & robotter",
    author: "SYSTEM-redaktionen",
    readTimeMinutes: 6,
    imageUrl: "",
    status: "draft",
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replaceAll("æ", "ae")
    .replaceAll("ø", "oe")
    .replaceAll("å", "aa")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatWeekStart(value: string) {
  return new Intl.DateTimeFormat("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

export default function AdminPage() {
  const [supabase] = useState<SupabaseClient | null>(() =>
    typeof window === "undefined" ? null : createSupabaseBrowserClient(),
  );
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [editorStatus, setEditorStatus] = useState<EditorStatus>("checking");
  const [authMessage, setAuthMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [authPending, setAuthPending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<EditableArticle[]>([]);
  const [deletingArticleId, setDeletingArticleId] = useState<string | null>(null);
  const [form, setForm] = useState<EditorForm>(emptyForm);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [weekStart] = useState(getCurrentWeekStartInCopenhagen);
  const isConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  useEffect(() => {
    if (!supabase) return;

    let isMounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      setUser(data.session?.user ?? null);
      setAuthChecked(true);
      if (error) setAuthMessage("Kunne ikke kontrollere login. Prøv at genindlæse siden.");
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      setEditorStatus(session?.user ? "checking" : "denied");
      setAuthMessage("");
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !authChecked || !user) return;

    let isMounted = true;
    supabase
      .from("editor_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          setEditorStatus("denied");
          setAuthMessage("Redaktøradgang mangler. Følg opsætningen, der står under loginformularen.");
          return;
        }
        setEditorStatus(data ? "allowed" : "denied");
        if (!data) setAuthMessage("Denne konto har ikke fået redaktøradgang endnu.");
      });

    return () => {
      isMounted = false;
    };
  }, [authChecked, supabase, user]);

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const loadThisWeekArticles = useCallback(async () => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("articles")
      .select("id, slug, week_start, title, summary, body, topic, author, read_time_minutes, image_url, status, published_at")
      .eq("week_start", weekStart)
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage("Kunne ikke hente ugens artikler. Kontrollér redaktørens RLS-adgang.");
      return [];
    }

    const articles = (data ?? []) as unknown as EditableArticle[];
    setDrafts(articles.filter((article) => article.status === "draft"));
    return articles;
  }, [supabase, weekStart]);

  const selectArticle = useCallback((article: EditableArticle) => {
    setActiveArticleId(article.id);
    setForm({
      slug: article.slug,
      title: article.title,
      summary: article.summary,
      body: article.body,
      topic: article.topic,
      author: article.author,
      readTimeMinutes: article.read_time_minutes,
      imageUrl: article.image_url ?? "",
      status: article.status,
    });
    setImageFile(null);
    setImagePreview(null);
    setSlugManuallyEdited(article.slug !== slugify(article.title));
    setNotice(article.status === "published" ? "Ugens artikel er publiceret. Gem ændringer for at opdatere den." : "Kladde indlæst — redigér den eller udgiv den, når den er klar.");
  }, []);

  useEffect(() => {
    if (editorStatus !== "allowed") return;
    let isMounted = true;

    async function loadInitialArticles() {
      const articles = await loadThisWeekArticles();
      if (!isMounted) return;
      const article = articles[0];
      if (!article) {
        setActiveArticleId(null);
        setForm(emptyForm());
        setSlugManuallyEdited(false);
        setNotice("Der er endnu ingen artikel for denne uge. Opret en kladde herunder.");
        return;
      }
      selectArticle(article);
    }

    void loadInitialArticles();
    return () => { isMounted = false; };
  }, [editorStatus, loadThisWeekArticles, selectArticle]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setAuthPending(true);
    setAuthMessage("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setAuthPending(false);
    if (error) {
      setAuthMessage("Login mislykkedes. Kontrollér e-mail og adgangskode.");
      return;
    }
    setUser(data.user);
    setPassword("");
    setEditorStatus("checking");
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      setAuthMessage("Kunne ikke logge ud. Prøv igen.");
      return;
    }
    setUser(null);
    setEditorStatus("denied");
    setActiveArticleId(null);
    setDrafts([]);
    setForm(emptyForm());
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!allowedImageTypes.has(file.type)) {
      setErrorMessage("Vælg et JPG-, PNG- eller WebP-billede.");
      return;
    }
    if (file.size > maxImageSize) {
      setErrorMessage("Billedet må højst fylde 8 MB.");
      return;
    }

    setErrorMessage("");
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function saveArticle(nextStatus: ArticleStatus) {
    if (!supabase || !user || editorStatus !== "allowed") return;

    const slug = form.slug.trim() || slugify(form.title);
    if (!form.title.trim() || !form.summary.trim() || !form.body.trim() || !slug) {
      setErrorMessage("Udfyld titel, resumé, artikeltekst og slug først.");
      return;
    }
    if (!Number.isInteger(form.readTimeMinutes) || form.readTimeMinutes < 1) {
      setErrorMessage("Læsetiden skal være mindst ét minut.");
      return;
    }

    if (
      nextStatus === "draft" &&
      form.status === "published" &&
      !window.confirm("Artiklen fjernes fra forsiden. Vil du fortsætte?")
    ) {
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setNotice("");
    let imageUrl = form.imageUrl || null;

    if (imageFile) {
      const extension = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${weekStart}/${slug}-${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("article-images")
        .upload(path, imageFile, {
          cacheControl: "3600",
          contentType: imageFile.type,
          upsert: false,
        });

      if (uploadError) {
        setSaving(false);
        setErrorMessage("Billedet kunne ikke uploades. Kontrollér, at article-images-bucket og Storage-politikkerne er sat op.");
        return;
      }
      imageUrl = supabase.storage.from("article-images").getPublicUrl(path).data.publicUrl;
    }

    const payload = {
      slug,
      week_start: weekStart,
      title: form.title.trim(),
      summary: form.summary.trim(),
      body: form.body.trim(),
      topic: form.topic,
      author: form.author.trim() || "SYSTEM-redaktionen",
      read_time_minutes: form.readTimeMinutes,
      image_url: imageUrl,
      status: nextStatus,
      published_at: nextStatus === "published" ? new Date().toISOString() : null,
    };

    const result = activeArticleId
      ? await supabase.from("articles").update(payload).eq("id", activeArticleId).select("id").single()
      : await supabase.from("articles").insert(payload).select("id").single();

    setSaving(false);
    if (result.error) {
      setErrorMessage(
        result.error.code === "23505"
          ? "Der findes allerede en publiceret artikel for denne uge. Indlæs den og redigér den i stedet."
          : "Artiklen kunne ikke gemmes. Kontrollér redaktørens databaseadgang.",
      );
      return;
    }

    setActiveArticleId(result.data.id);
    setForm((current) => ({ ...current, slug, imageUrl: imageUrl ?? "", status: nextStatus }));
    setImageFile(null);
    await loadThisWeekArticles();
    setNotice(nextStatus === "published" ? "Artiklen er nu publiceret på forsiden." : "Kladde gemt — den vises ikke på forsiden endnu.");
  }

  async function deleteDraft(article: EditableArticle) {
    if (!supabase || !user || article.status !== "draft") return;
    if (!window.confirm(`Slet kladden “${article.title || article.slug}” permanent?`)) return;

    setDeletingArticleId(article.id);
    setErrorMessage("");
    const { error } = await supabase
      .from("articles")
      .delete()
      .eq("id", article.id)
      .eq("status", "draft");

    if (error) {
      setDeletingArticleId(null);
      setErrorMessage("Kladden kunne ikke slettes. Kontrollér redaktørens sletteadgang.");
      return;
    }

    let imageCleanupFailed = false;
    if (article.image_url) {
      try {
        const imagePath = new URL(article.image_url).pathname.split("/article-images/")[1];
        if (imagePath) {
          const { error: imageError } = await supabase.storage
            .from("article-images")
            .remove([decodeURIComponent(imagePath)]);
          imageCleanupFailed = Boolean(imageError);
        }
      } catch {
        imageCleanupFailed = true;
      }
    }

    setDeletingArticleId(null);
    await loadThisWeekArticles();
    if (activeArticleId === article.id) {
      setActiveArticleId(null);
      setForm(emptyForm());
      setImageFile(null);
      setImagePreview(null);
      setSlugManuallyEdited(false);
      setNotice("Kladden blev slettet.");
    } else {
      setNotice("Kladden blev slettet.");
    }
    if (imageCleanupFailed) setErrorMessage("Kladden blev slettet, men billedfilen kunne ikke ryddes op i Storage.");
  }

  function startNewArticle() {
    setActiveArticleId(null);
    setForm(emptyForm());
    setImageFile(null);
    setImagePreview(null);
    setSlugManuallyEdited(false);
    setErrorMessage("");
    setNotice("Ny artikel oprettet som kladde. Udgiv den, når den er klar.");
  }

  const previewUrl = imagePreview ?? form.imageUrl;

  return (
    <main className="paper-field">
      <div className="newspaper-page admin-page">
        <header className="admin-header">
          <div className="meta-row">
            <span>UAFHÆNGIG JOURNALISTIK</span>
            <span className="meta-center">REDAKTØRVÆRKSTED</span>
            <span className="meta-right">UGEN BEGYNDER {formatWeekStart(weekStart).toUpperCase()}</span>
          </div>
          <div className="admin-heading-row">
            <div>
              <p className="admin-eyebrow">SYSTEM · ADMIN</p>
              <h1>Redaktørværksted</h1>
              <p>Skriv, gem og udgiv ugens hovedhistorie.</p>
            </div>
            <Link className="admin-home-link" href="/">Til forsiden <span aria-hidden="true">↗</span></Link>
          </div>
        </header>

        <section className="admin-content" aria-label="Artikelredigering">
          {!isConfigured ? (
            <div className="admin-notice" role="status">
              Supabase mangler konfiguration. Udfyld miljøvariablerne i .env.local, og genstart serveren.
            </div>
          ) : !authChecked || !supabase ? (
            <div className="admin-notice" role="status">Kontrollerer login…</div>
          ) : !user ? (
            <div className="admin-card admin-login-card">
              <p className="admin-eyebrow">SIKKER ADGANG</p>
              <h2>Log ind som redaktør</h2>
              <p className="admin-help">Kun en konto, der er føjet til SYSTEMs redaktørliste, kan redigere artikler.</p>
              <form className="admin-form" onSubmit={signIn}>
                <label className="admin-field">
                  <span>E-mail</span>
                  <input autoComplete="username" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
                </label>
                <label className="admin-field">
                  <span>Adgangskode</span>
                  <input autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
                </label>
                {authMessage && <p className="admin-error" role="alert">{authMessage}</p>}
                <button className="admin-primary-button" disabled={authPending} type="submit">
                  {authPending ? "Logger ind…" : "Log ind"}
                </button>
              </form>
              <details className="admin-setup-help">
                <summary>Første gangs opsætning</summary>
                <ol>
                  <li>Opret din e-mailbruger under Supabase → Authentication → Users.</li>
                  <li>Kør redaktørens SQL-migration, og føj brugerens UID til <code>editor_users</code>.</li>
                </ol>
              </details>
            </div>
          ) : editorStatus === "checking" ? (
            <div className="admin-notice" role="status">Kontrollerer redaktøradgang…</div>
          ) : editorStatus !== "allowed" ? (
            <div className="admin-card admin-login-card">
              <p className="admin-eyebrow">ADGANG AFVIST</p>
              <h2>Kontoen er ikke redaktør</h2>
              <p className="admin-error" role="alert">{authMessage || "Føj brugerens UID til editor_users i Supabase."}</p>
              <button className="admin-secondary-button" onClick={signOut} type="button">Log ud</button>
            </div>
          ) : (
            <>
              <div className="admin-toolbar">
                <p>Logget ind som <strong>{user.email}</strong></p>
                <button className="admin-text-button" onClick={signOut} type="button">Log ud</button>
              </div>

              {notice && <p className="admin-success" role="status">{notice}</p>}
              {errorMessage && <p className="admin-error admin-banner" role="alert">{errorMessage}</p>}

              <section className="drafts-panel" aria-labelledby="drafts-heading">
                <div className="drafts-panel-heading">
                  <div>
                    <p className="admin-eyebrow">ARTIKELARKIV</p>
                    <h2 id="drafts-heading">Kladder <span>{drafts.length}</span></h2>
                  </div>
                  <button className="admin-secondary-button" onClick={startNewArticle} type="button">
                    Ny artikel
                  </button>
                </div>
                {drafts.length ? (
                  <ul className="draft-list">
                    {drafts.map((draft) => (
                      <li className={`draft-item${activeArticleId === draft.id ? " active" : ""}`} key={draft.id}>
                        <button className="draft-open" onClick={() => selectArticle(draft)} type="button">
                          <span className="draft-title">{draft.title || "Kladde uden titel"}</span>
                          <span className="draft-meta">{draft.topic} <span>·</span> {draft.slug}</span>
                        </button>
                        <button
                          className="draft-delete"
                          disabled={deletingArticleId === draft.id || saving}
                          onClick={() => void deleteDraft(draft)}
                          type="button"
                          aria-label={`Slet kladden ${draft.title || draft.slug}`}
                        >
                          {deletingArticleId === draft.id ? "Sletter…" : "Slet"}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="drafts-empty">Ingen kladder for denne uge endnu.</p>
                )}
              </section>

              <form
                className="admin-card admin-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveArticle(form.status);
                }}
              >
                <div className="admin-card-heading">
                  <div>
                    <p className="admin-eyebrow">UGENS ARTIKEL · {formatWeekStart(weekStart).toUpperCase()}</p>
                    <h2>Artikelindhold</h2>
                  </div>
                  <span className={`article-status ${form.status}`}>
                    {form.status === "published" ? "PUBLICERET" : "KLADDE"}
                  </span>
                </div>

                <label className="admin-field">
                  <span>Titel</span>
                  <input
                    maxLength={180}
                    onChange={(event) => {
                      const title = event.target.value;
                      setForm((current) => ({
                        ...current,
                        title,
                        slug: slugManuallyEdited ? current.slug : slugify(title),
                      }));
                    }}
                    placeholder="Skriv en tydelig, fængende titel"
                    required
                    value={form.title}
                  />
                </label>

                <label className="admin-field">
                  <span>Artikel-URL</span>
                  <input
                    onChange={(event) => {
                      setSlugManuallyEdited(true);
                      setForm((current) => ({ ...current, slug: slugify(event.target.value) }));
                    }}
                    required
                    value={form.slug}
                  />
                  <small>Adressen efter domænet, fx ugens-store-historie. Brug bogstaver, tal og bindestreger.</small>
                </label>

                <label className="admin-field">
                  <span>Kort resumé</span>
                  <textarea
                    maxLength={320}
                    onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
                    placeholder="Hvad skal læseren vide på få linjer?"
                    required
                    rows={3}
                    value={form.summary}
                  />
                  <small>{form.summary.length}/320 tegn</small>
                </label>

                <label className="admin-field">
                  <span>Artikeltekst</span>
                  <textarea
                    className="article-body-input"
                    onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                    placeholder="Skriv artikeltekst her. Adskil afsnit med en tom linje."
                    required
                    rows={12}
                    value={form.body}
                  />
                </label>

                <div className="admin-form-grid">
                  <label className="admin-field">
                    <span>Emne</span>
                    <select
                      onChange={(event) => setForm((current) => ({ ...current, topic: event.target.value as ArticleTopic }))}
                      value={form.topic}
                    >
                      {topics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
                    </select>
                  </label>
                  <label className="admin-field">
                    <span>Forfatter</span>
                    <input onChange={(event) => setForm((current) => ({ ...current, author: event.target.value }))} value={form.author} />
                  </label>
                  <label className="admin-field">
                    <span>Læsetid (minutter)</span>
                    <input
                      min={1}
                      onChange={(event) => setForm((current) => ({ ...current, readTimeMinutes: Number(event.target.value) }))}
                      type="number"
                      value={form.readTimeMinutes}
                    />
                  </label>
                </div>

                <div className="admin-field">
                  <span>Forsidebillede</span>
                  <label className="admin-file-picker" htmlFor="article-image">
                    {imageFile ? imageFile.name : "Vælg JPG, PNG eller WebP"}
                  </label>
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    className="visually-hidden"
                    id="article-image"
                    onChange={handleImageChange}
                    type="file"
                  />
                  {previewUrl && (
                    <div className="admin-image-preview">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img alt="Forhåndsvisning af forsidebillede" src={previewUrl} />
                      <button className="admin-text-button" onClick={() => { setImageFile(null); setForm((current) => ({ ...current, imageUrl: "" })); }} type="button">
                        Fjern billede
                      </button>
                    </div>
                  )}
                </div>

                <div className="admin-actions">
                  <button className="admin-secondary-button" disabled={saving} onClick={() => void saveArticle("draft")} type="button">
                    {saving ? "Gemmer…" : form.status === "published" ? "Afpublicér og gem kladde" : "Gem som kladde"}
                  </button>
                  <button className="admin-primary-button" disabled={saving} onClick={() => void saveArticle("published")} type="button">
                    {saving ? "Gemmer…" : form.status === "published" ? "Gem ændringer" : "Udgiv ugens artikel"}
                  </button>
                </div>
              </form>
            </>
          )}
        </section>

        <footer className="admin-footer">
          <span>SYSTEM · REDAKTION</span>
          <Link href="/">Tilbage til forsiden</Link>
        </footer>
      </div>
    </main>
  );
}
