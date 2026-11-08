"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase, type Person } from "@/lib/supabase";
import type { Me } from "@/lib/me";
import { DATES, HOURS, dayLabel, hourRange, hourShort, slotKey } from "@/lib/slots";

type Row = {
  person_id: string;
  slot_date: string;
  slot_hour: number;
  is_available: boolean;
};

// personId -> set of slot keys they're free in
type AvailMap = Map<string, Set<string>>;

function applyRow(map: AvailMap, row: Row): AvailMap {
  const next = new Map(map);
  const set = new Set(next.get(row.person_id) ?? []);
  const key = slotKey(row.slot_date, row.slot_hour);
  if (row.is_available) set.add(key);
  else set.delete(key);
  next.set(row.person_id, set);
  return next;
}

async function fetchAll(): Promise<Row[]> {
  // Paginate: Supabase caps responses at 1000 rows by default.
  const pageSize = 1000;
  const rows: Row[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("availability")
      .select("person_id, slot_date, slot_hour, is_available")
      .eq("is_available", true)
      .order("id")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

function heatStyle(count: number, total: number) {
  if (count === 0) return { backgroundColor: "#f3efe9", color: "#a8a29e" };
  const r = count / total;
  return {
    backgroundColor: `rgba(180, 83, 9, ${0.12 + 0.88 * r})`,
    color: r > 0.45 ? "#fff" : "#7c2d12",
  };
}

export function AvailabilityTab({ me, people }: { me: Me; people: Person[] }) {
  const [avail, setAvail] = useState<AvailMap | null>(null);
  const [date, setDate] = useState(DATES[0]);
  const [openSlot, setOpenSlot] = useState<{ date: string; hour: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const rows = await fetchAll();
        if (cancelled) return;
        let map: AvailMap = new Map();
        for (const r of rows) map = applyRow(map, r);
        setAvail(map);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    }
    load();

    const channel = supabase
      .channel("availability-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "availability" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            load(); // rare (person removed); just resync
            return;
          }
          setAvail((prev) => applyRow(prev ?? new Map(), payload.new as Row));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const total = people.length || 17;
  const mine = avail?.get(me.id) ?? new Set<string>();

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    avail?.forEach((set) => set.forEach((k) => c.set(k, (c.get(k) ?? 0) + 1)));
    return c;
  }, [avail]);

  async function toggle(d: string, hour: number) {
    if (!avail) return;
    const isAvailable = !mine.has(slotKey(d, hour));
    const row: Row = { person_id: me.id, slot_date: d, slot_hour: hour, is_available: isAvailable };
    setAvail((prev) => applyRow(prev ?? new Map(), row));
    const { error } = await supabase
      .from("availability")
      .upsert(
        { ...row, updated_at: new Date().toISOString() },
        { onConflict: "person_id,slot_date,slot_hour" },
      );
    if (error) {
      setError(error.message);
      setAvail((prev) => applyRow(prev ?? new Map(), { ...row, is_available: !isAvailable }));
    }
  }

  async function setWholeDay(d: string, value: boolean) {
    if (!avail) return;
    const rows: Row[] = HOURS.map((h) => ({
      person_id: me.id,
      slot_date: d,
      slot_hour: h,
      is_available: value,
    }));
    setAvail((prev) => rows.reduce(applyRow, prev ?? new Map()));
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("availability")
      .upsert(
        rows.map((r) => ({ ...r, updated_at: now })),
        { onConflict: "person_id,slot_date,slot_hour" },
      );
    if (error) setError(error.message);
  }

  const freeAt = (d: string, h: number) =>
    people
      .filter((p) => avail?.get(p.id)?.has(slotKey(d, h)))
      .map((p) => p.name);

  const myCountToday = HOURS.filter((h) => mine.has(slotKey(date, h))).length;

  return (
    <div>
      {/* Day switcher */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {DATES.map((d) => {
          const { weekday, day } = dayLabel(d);
          const active = d === date;
          const myCount = HOURS.filter((h) => mine.has(slotKey(d, h))).length;
          return (
            <button
              key={d}
              onClick={() => setDate(d)}
              className={`flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border text-sm transition ${
                active
                  ? "border-amber-700 bg-amber-700 text-white"
                  : "border-stone-200 bg-white text-stone-700"
              }`}
            >
              <span className={`text-[11px] ${active ? "text-amber-100" : "text-stone-500"}`}>
                {weekday}
              </span>
              <span className="text-lg font-semibold leading-tight">{day}</span>
              <span
                className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                  myCount > 0 ? (active ? "bg-white" : "bg-amber-600") : "bg-transparent"
                }`}
              />
            </button>
          );
        })}
      </div>

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

      <div className="mt-5 grid gap-8 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        {/* Your availability */}
        <section>
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">
              You · {dayLabel(date).weekday} Nov {dayLabel(date).day}
            </h2>
            <button
              onClick={() => setWholeDay(date, myCountToday < HOURS.length)}
              disabled={!avail}
              className="h-11 shrink-0 text-sm font-medium text-amber-800 disabled:opacity-40"
            >
              {myCountToday < HOURS.length ? "Free all day" : "Clear day"}
            </button>
          </div>
          <p className="text-sm text-stone-500">Tap the hours you&apos;re free.</p>
          <ul className="mt-3 space-y-2">
            {HOURS.map((h) => {
              const on = mine.has(slotKey(date, h));
              return (
                <li key={h}>
                  <button
                    onClick={() => toggle(date, h)}
                    disabled={!avail}
                    aria-pressed={on}
                    className={`flex h-14 w-full items-center justify-between rounded-xl border px-4 text-left transition active:scale-[0.99] disabled:opacity-50 ${
                      on
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                        : "border-stone-200 bg-white text-stone-700"
                    }`}
                  >
                    <span className="font-medium">{hourRange(h)}</span>
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                        on ? "border-emerald-600 bg-emerald-600 text-white" : "border-stone-300"
                      }`}
                      aria-hidden
                    >
                      {on && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Group heatmap */}
        <section className="min-w-0">
          <h2 className="text-lg font-semibold">Everyone</h2>
          <p className="text-sm text-stone-500">Tap a slot to see who&apos;s free.</p>

          {/* Mobile: one day */}
          <ul className="mt-3 space-y-2 md:hidden">
            {HOURS.map((h) => {
              const n = counts.get(slotKey(date, h)) ?? 0;
              return (
                <li key={h}>
                  <button
                    onClick={() => setOpenSlot({ date, hour: h })}
                    style={heatStyle(n, total)}
                    className="flex h-14 w-full items-center justify-between rounded-xl px-4 text-left"
                  >
                    <span className="font-medium">{hourRange(h)}</span>
                    <span className="font-semibold tabular-nums">
                      {n}/{total}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Desktop: full grid */}
          <div className="mt-3 hidden md:block">
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `3.5rem repeat(${DATES.length}, minmax(0, 1fr))` }}
            >
              <div />
              {DATES.map((d) => {
                const { weekday, day } = dayLabel(d);
                return (
                  <button
                    key={d}
                    onClick={() => setDate(d)}
                    className={`rounded-md py-1 text-center text-xs ${
                      d === date ? "bg-amber-100 font-semibold text-amber-900" : "text-stone-500"
                    }`}
                  >
                    {weekday}
                    <br />
                    <span className="text-sm font-semibold text-stone-800">{day}</span>
                  </button>
                );
              })}
              {HOURS.map((h) => (
                <Fragmentish key={h}>
                  <div className="flex items-center justify-end pr-2 text-xs text-stone-500">
                    {hourShort(h)}
                  </div>
                  {DATES.map((d) => {
                    const n = counts.get(slotKey(d, h)) ?? 0;
                    return (
                      <button
                        key={d}
                        onClick={() => setOpenSlot({ date: d, hour: h })}
                        style={heatStyle(n, total)}
                        title={`${dayLabel(d).weekday} ${dayLabel(d).day}, ${hourRange(h)}: ${n}/${total}`}
                        className="h-11 rounded-md text-xs font-semibold tabular-nums transition hover:ring-2 hover:ring-amber-800/40"
                      >
                        {n || ""}
                      </button>
                    );
                  })}
                </Fragmentish>
              ))}
            </div>
          </div>
        </section>
      </div>

      {openSlot && (
        <WhoSheet
          title={`${dayLabel(openSlot.date).weekday} Nov ${dayLabel(openSlot.date).day} · ${hourRange(openSlot.hour)}`}
          names={freeAt(openSlot.date, openSlot.hour)}
          total={total}
          onClose={() => setOpenSlot(null)}
        />
      )}
    </div>
  );
}

function Fragmentish({ children }: { children: React.ReactNode }) {
  return <div className="contents">{children}</div>;
}

function WhoSheet({
  title,
  names,
  total,
  onClose,
}: {
  title: string;
  names: string[];
  total: number;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 md:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="max-h-[75dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-stone-200 md:hidden" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-stone-500">
              {names.length}/{total} free
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-2 flex h-11 w-11 items-center justify-center rounded-full text-2xl text-stone-400 hover:bg-stone-100"
          >
            ×
          </button>
        </div>
        {names.length === 0 ? (
          <p className="mt-4 text-stone-500">Nobody yet.</p>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-2">
            {names.map((n) => (
              <li key={n} className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-900">
                {n}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
