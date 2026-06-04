import { createClient } from "@supabase/supabase-js";
import Portal from "./clubcampus.jsx";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseClient = (url && key) ? createClient(url, key) : null;

export default function App() {
  return <Portal supabaseClient={supabaseClient} />;
}
