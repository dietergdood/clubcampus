import { createClient } from "@supabase/supabase-js";
import Portal from "./clubcampus.tsx";
import type { Database } from "./database.types.ts";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/* null, wenn die Env-Variablen fehlen — Portal zeigt dann den Login-Screen */
const supabaseClient = (url && key) ? createClient<Database>(url, key) : null;

export default function App() {
  return <Portal supabaseClient={supabaseClient} />;
}
