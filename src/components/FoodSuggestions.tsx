"use client";

import { useState } from "react";
import type { ListItem } from "@/lib/supabase";
import { FOOD_CATEGORIES, matches } from "@/lib/foodSuggestions";

type Props = {
  items: ListItem[];
  nameById: Map<string, string>;
  claim: (text: string) => Promise<boolean>;
};

export function FoodSuggestions({ items, nameById, claim }: Props) {
  const [pending, setPending] = useState<string | null>(null);

  const rows = FOOD_CATEGORIES.map((cat) => ({
    ...cat,
    items: cat.items.map((s) => {
      const who = [
        ...new Set(
          items
            .filter((i) => matches(s, i.text))
            .map((i) => nameById.get(i.person_id) ?? "Someone"),
        ),
      ];
      return { ...s, who };
    }),
  }));
  const total = rows.reduce((n, c) => n + c.items.length, 0);
  const covered = rows.reduce((n, c) => n + c.items.filter((i) => i.who.length).length, 0);

  async function onClaim(name: string) {
    setPending(name);
    await claim(name);
    setPending(null);
  }

  return (
    <section className="mb-8">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Still needed</h2>
        <span className="text-sm text-stone-500 tabular-nums">
          {covered}/{total} covered
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200">
        <div
          className="h-full rounded-full bg-emerald-600 transition-all"
          style={{ width: `${(covered / total) * 100}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-stone-500">
        Tap <span className="font-medium text-amber-800">Claim</span> to sign up for something, or
        add your own below.
      </p>

      <div className="mt-4 space-y-5">
        {rows.map((cat) => {
          const open = cat.items.filter((i) => !i.who.length).length;
          return (
            <div key={cat.name}>
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-stone-600">
                <span aria-hidden>{cat.icon}</span>
                {cat.name}
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 text-xs normal-case tracking-normal ${
                    open ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"
                  }`}
                >
                  {open ? `${open} open` : "All set"}
                </span>
              </h3>
              <ul className="mt-2 space-y-1.5">
                {cat.items.map((s) => {
                  const done = s.who.length > 0;
                  return (
                    <li
                      key={s.name}
                      className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2 ${
                        done
                          ? "border-stone-200 bg-stone-50"
                          : "border-dashed border-amber-400 bg-amber-50/60"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                          done ? "bg-emerald-600 text-white" : "border-2 border-amber-400"
                        }`}
                        aria-hidden
                      >
                        {done && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12l5 5L20 7" />
                          </svg>
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={done ? "text-stone-500" : "font-medium"}>{s.name}</p>
                        {done && (
                          <p className="text-xs text-emerald-800">{s.who.join(", ")}</p>
                        )}
                      </div>
                      {!done && (
                        <button
                          onClick={() => onClaim(s.name)}
                          disabled={pending !== null}
                          className="h-11 shrink-0 rounded-lg bg-amber-700 px-4 text-sm font-medium text-white disabled:opacity-40"
                        >
                          {pending === s.name ? "…" : "Claim"}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
