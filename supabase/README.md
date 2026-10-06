# SYSTEM: opsæt redaktøradgang

Redaktørsiden ligger på `/admin`. Den bruger Supabase Auth til login, og databasepolitikkerne giver kun brugere i `public.editor_users` adgang til at gemme eller udgive artikler.

## Eksisterende Supabase-projekt

Artikeltabellen blev først oprettet manuelt i Supabase SQL Editor. Derfor:

1. Du har kørt `20261005150000_editor_access_and_storage.sql`. Kør også `20261005170000_allow_editors_to_delete_images.sql` i SQL Editor, så slettede kladder kan rydde deres billeder fra Storage.
2. I Supabase Dashboard: åbn **Authentication → Users** og opret din redaktørbruger med e-mail og adgangskode. Der er ingen offentlig tilmeldingsformular på hjemmesiden.
3. Kør SQL Editor-forespørgslen herunder med din e-mail for at give brugeren redaktøradgang:

```sql
insert into public.editor_users (user_id)
select id
from auth.users
where email = 'DIN-EMAIL'
on conflict (user_id) do nothing;
```

4. Åbn `http://localhost:3000/admin`, og log ind med redaktørkontoen.
5. Skriv artiklen, vælg emne, og brug **Gem som kladde** eller **Udgiv ugens artikel**. Billeder uploades til `article-images`.

## Nye Supabase-databaser

På et nyt eller midlertidigt Supabase-projekt køres migrationerne i tidsstempelrækkefølge: `20261005000000_create_articles.sql`, `20261005150000_editor_access_and_storage.sql` og `20261005170000_allow_editors_to_delete_images.sql`. Opret derefter redaktørbrugeren og føj den til `editor_users` som beskrevet ovenfor.

## Vigtigt om det eksisterende projekts migrationshistorik

Den første artikeltabel blev oprettet direkte i SQL Editor, så Supabase CLI kender ikke automatisk til den migration. Kør ikke `db push` mod det eksisterende projekt, før migrationerne er blevet baseline-synkroniseret med Supabase CLI. Migrationsfilerne er gemt her, så de kan bruges til nye databaser og til en senere Branching-opsætning.
