"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, supabaseConfigured, type Person } from "@/lib/supabase";
import { clearMe, useMe } from "@/lib/me";
import { ConfigWarning } from "@/components/ConfigWarning";
import { AvailabilityTab } from "@/components/AvailabilityTab";
import { ListTab } from "@/components/ListTab";
import { FoodSuggestions } from "@/components/FoodSuggestions";

type Tab = "availability" | "ideas" | "food";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "availability", label: "Availability", icon: "🗓️" },
  { id: "ideas", label: "Ideas", icon: "💡" },
  { id: "food", label: "Food", icon: "🥧" },
];

export default function AppPage() {
  const router = useRouter();
  const me = useMe();
  const [people, setPeople] = useState<Person[]>([]);
  const [tab, setTab] = useState<Tab>("availability");

  useEffect(() => {
    if (me === undefined) return;
    if (me === null) {
      router.replace("/");
      return;
    }
    const stored = me;
    if (!supabaseConfigured) return;
    supabase
      .from("people")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        const list = data ?? [];
        // Stored person no longer exists (e.g. DB reseeded): back to the picker.
        if (data && !list.some((p) => p.id === stored.id)) {
          clearMe();
          router.replace("/");
          return;
        }
        setPeople(list);
      });
  }, [me, router]);

  function switchUser() {
    clearMe();
    router.replace("/");
  }

  if (!supabaseConfigured) return <ConfigWarning />;
  if (!me) return null;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-[#fbf8f4]/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <p className="truncate font-medium">
            Hi, <span className="text-amber-800">{me.name}</span> 👋
          </p>
          <button
            onClick={switchUser}
            className="-mr-2 h-11 shrink-0 px-2 text-sm text-stone-500 underline-offset-2 hover:underline"
          >
            Not you? Switch
          </button>
        </div>
        <nav className="mx-auto hidden w-full max-w-5xl gap-1 px-4 md:flex">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`h-11 border-b-2 px-4 text-sm font-medium transition ${
                tab === t.id
                  ? "border-amber-700 text-amber-800"
                  : "border-transparent text-stone-500 hover:text-stone-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-4 md:pb-10">
        {tab === "availability" && <AvailabilityTab me={me} people={people} />}
        {tab === "ideas" && (
          <ListTab
            me={me}
            people={people}
            table="ideas"
            title="Activity ideas"
            placeholder="Top Golf, game night…"
            buttonLabel="Add idea"
            empty="No ideas yet. Throw one out there!"
          />
        )}
        {tab === "food" && (
          <ListTab
            me={me}
            people={people}
            table="food"
            title="Who's bringing what"
            placeholder="Mac & cheese, pie, drinks…"
            buttonLabel="Add food"
            empty="Nobody's claimed a dish yet."
            renderTop={(ctx) => <FoodSuggestions {...ctx} />}
          />
        )}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                tab === t.id ? "text-amber-800" : "text-stone-500"
              }`}
            >
              <span className="text-xl" aria-hidden>
                {t.icon}
              </span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
