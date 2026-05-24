import { createClient } from "@supabase/supabase-js";
import Portal from "./fc-herrliberg-portal_18.jsx";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug: zeigt in der Browser-Konsole ob die Env-Variablen ankommen
console.log("[FCH] Supabase URL:", url ? url.slice(0,30)+"..." : "FEHLT");
console.log("[FCH] Supabase Key:", key ? key.slice(0,10)+"..." : "FEHLT");

const supabaseClient = (url && key) ? createClient(url, key) : null;

export default function App() {
  return <Portal supabaseClient={supabaseClient} />;
}
