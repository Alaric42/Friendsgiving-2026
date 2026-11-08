"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase, type ListItem, type Person } from "@/lib/supabase";
import type { Me } from "@/lib/me";

type Props = {
  me: Me;
  people: Person[];
  table: "ideas" | "food";
  title: string;
  placeholder: string;
  buttonLabel: string;
  empty: string;
};

const COLS = "id, person_id, text, created_at";

export function ListTab({ me, people, table, title, placeholder, buttonLabel, empty }: Props) {
  const [items, setItems] = useState<ListItem[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameById = useMemo(() => new Map(people.map((p) => [p.id, p.name])), [people]);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from(table)
      .select(COLS)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setError(error.message);
        else setItems(data ?? []);
      });

    const channel = supabase
      .channel(`${table}-changes`)
      .on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
        setItems((prev) => {
          const list = prev ?? [];
          if (payload.eventType === "DELETE") {
            const oldId = (payload.old as Partial<ListItem>).id;
            return list.filter((i) => i.id !== oldId);
          }
          const row = payload.new as ListItem;
          const rest = list.filter((i) => i.id !== row.id);
          return [row, ...rest].sort((a, b) => b.created_at.localeCompare(a.created_at));
        });
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [table]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    setError(null);
    const { data, error } = await supabase
      .from(table)
      .insert({ person_id: me.id, text: value })
      .select(COLS)
      .single();
    setBusy(false);
    if (error || !data) {
      setError(error?.message ?? "Couldn't save");
      return;
    }
    setText("");
    setItems((prev) => [data, ...(prev ?? []).filter((i) => i.id !== data.id)]);
  }

  async function remove(item: ListItem) {
    if (item.person_id !== me.id) return;
    const prev = items;
    setItems((cur) => (cur ?? []).filter((i) => i.id !== item.id));
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("id", item.id)
      .eq("person_id", me.id);
    if (error) {
      setError(error.message);
      setItems(prev);
    }
  }

  return (
    <section className="mx-auto max-w-xl">
      <h2 className="text-lg font-semibold">{title}</h2>
      <form onSubmit={add} className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          maxLength={200}
          className="h-12 min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 text-base focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/30"
        />
        <button
          type="submit"
          disabled={!text.trim() || busy}
          className="h-12 shrink-0 rounded-xl bg-amber-700 px-4 font-medium text-white disabled:opacity-40"
        >
          {buttonLabel}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}

      <ul className="mt-4 space-y-2">
        {items === null && <li className="text-stone-500">Loading…</li>}
        {items?.length === 0 && <li className="text-stone-500">{empty}</li>}
        {items?.map((item) => (
          <li
            key={item.id}
            className="flex min-h-14 items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="break-words">{item.text}</p>
              <p className="mt-0.5 text-xs text-stone-500">
                {nameById.get(item.person_id) ?? "Someone"}
              </p>
            </div>
            {item.person_id === me.id && (
              <button
                onClick={() => remove(item)}
                aria-label="Delete"
                className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-700"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                </svg>
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
