import { createClient } from "@supabase/supabase-js";
import Portal from "./clubcampus.tsx";
import type { Database } from "./database.types.ts";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/* null, wenn die Env-Variablen fehlen — Portal zeigt dann den Login-Screen */
const supabaseClient = (url && key) ? createClient<Database>(url, key) : null;

/* Slug aus URL-Pfad lesen: /fcherrliberg → "fcherrliberg"
   Leerer Pfad / oder / ohne Slug → null (kein Verein gewählt) */
function getSlugFromPath(): string | null {
  const parts = window.location.pathname.replace(/^\//, "").split("/");
  const slug = parts[0];
  return slug && slug.length > 0 ? slug : null;
}

export default function App() {
  const slug = getSlugFromPath();
  return <Portal supabaseClient={supabaseClient} slug={slug} />;
}
