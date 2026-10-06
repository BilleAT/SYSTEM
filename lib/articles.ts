export const articleTopics = [
  "Alle emner",
  "AI & robotter",
  "Klima & energi",
  "Videnskab",
  "Digitalt liv",
] as const;

export type ArticleTopic = Exclude<(typeof articleTopics)[number], "Alle emner">;

export type WeeklyArticle = {
  slug: string;
  title: string;
  summary: string;
  body: string;
  topic: ArticleTopic;
  author: string;
  read_time_minutes: number;
  image_url: string | null;
  week_start: string;
};

export function getCurrentWeekStartInCopenhagen(): string {
  const dateParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Copenhagen",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const parts = Object.fromEntries(dateParts.map(({ type, value }) => [type, value]));
  const localDate = new Date(
    Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)),
  );

  const daysSinceMonday = (localDate.getUTCDay() + 6) % 7;
  localDate.setUTCDate(localDate.getUTCDate() - daysSinceMonday);

  return localDate.toISOString().slice(0, 10);
}
