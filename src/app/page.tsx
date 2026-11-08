"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, supabaseConfigured, type Person } from "@/lib/supabase";
import { getMe, setMe } from "@/lib/me";
import { ConfigWarning } from "@/components/ConfigWarning";

export default function NamePicker() {
  const router = useRouter();
  const [people, setPeople] = useState<Person[] | null>(null);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getMe()) {
      router.replace("/app");
      return;
    }
    if (!supabaseConfigured) return;
    supabase
      .from("people")
      .select("id, name")
      .order("name")
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setPeople(data ?? []);
      });
  }, [router]);

  function go() {
    const p = people?.find((x) => x.id === selected);
    if (!p) return;
    setMe({ id: p.id, name: p.name });
    router.push("/app");
  }

  if (!supabaseConfigured) return <ConfigWarning />;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <p className="text-4xl" aria-hidden>
        🦃
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Friendsgiving</h1>
      <p className="mt-2 text-stone-600">
        Nov 20–29. Mark when you&apos;re free, pitch ideas, and say what you&apos;re bringing.
      </p>

      <label htmlFor="who" className="mt-8 block text-sm font-medium text-stone-700">
        Who are you?
      </label>
      <select
        id="who"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        disabled={!people}
        className="mt-2 h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/30"
      >
        <option value="">{people ? "Pick your name…" : "Loading…"}</option>
        {people?.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <button
        onClick={go}
        disabled={!selected}
        className="mt-4 h-12 w-full rounded-xl bg-amber-700 font-medium text-white transition active:scale-[0.99] disabled:opacity-40"
      >
        Continue
      </button>

      {error && <p className="mt-4 text-sm text-red-700">Couldn&apos;t load names: {error}</p>}
    </main>
  );
}
