"use client";
import React, { useMemo } from "react";
import Abilities from "../../../../data/abilities.json";
import Spells from "../../../../data/spells.json";
import Chart from "./Chart";
import Image from "next/image";


type Pet = any;

function normalizeIcon(url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith('//')) return 'https:' + url; // protocol-relative -> https
  if (url.startsWith('http://')) return url.replace(/^http:/, 'https:'); // avoid mixed content
  return url;
}


/* ---------------- utils ---------------- */
function hashDateToIndex(dateISO: string, modulo: number): number {
  let h = 216136261;
  for (let i = 0; i < dateISO.length; i++) {
    h ^= dateISO.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % Math.max(1, modulo);
}
function meanStd(values: number[]): { mean: number; std: number } | null {
  if (!values.length) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}

/* ---------------- lookups ---------------- */
const abilityByName = new Map(
  (Abilities as any[]).map((a) => [
    String(a.name || ""),
    { rarity: (a.rarity as string) ?? null },
  ])
);
const spellByName = new Map(
  (Spells as any[]).map((s) => [String(s.name || ""), { icon: (s.icon as string) ?? null }])
);

/* -------- rarity (TALENTS ONLY) -------- */
const R_ORDER = ["Common", "Uncommon", "Rare", "Ultra-Rare", "Epic"] as const;
const R_BG: Record<string, string> = {
  Common: "#d1d5db",
  Uncommon: "#bbf7d0",
  Rare: "#bfdbfe",
  "Ultra-Rare": "#e9d5ff",
  Epic: "#fde68a",
};
const R_TXT: Record<string, string> = {
  Common: "#111827",
  Uncommon: "#065f46",
  Rare: "#1e3a8a",
  "Ultra-Rare": "#5b21b6",
  Epic: "#78350f",
};
function prettyRarity(r?: string | null) {
  if (!r) return null;
  const s = String(r).trim().toLowerCase();
  if (s === "common") return "Common";
  if (s === "uncommon") return "Uncommon";
  if (s === "rare") return "Rare";
  if (s === "ultra-rare" || s === "ultra rare") return "Ultra-Rare";
  if (s === "epic") return "Epic";
  return null;
}

/* ---------------- component ---------------- */
export default function PetOfTheDay({ Pets, pet: providedPet, showLabel = true }: { Pets: Pet[]; pet?: Pet; showLabel?: boolean }) {
  // Choose pet: provided explicitly, otherwise date-seeded
  const pet = providedPet ?? (() => {
    const todayISO = new Date().toISOString().split("T")[0];
    const idx = hashDateToIndex(todayISO, Pets?.length ?? 1);
    return Pets?.[idx];
  })();
  if (!pet) return null;

  /* extract */
  const school: string = pet.school ?? "";
  const schoolImg = `/images/${String(school || "").toLowerCase()}.png`;
  const name: string = pet.name ?? "Unknown";
  const petIcon: string | null = pet.icon ?? null;

  const cards: string[] = Array.isArray(pet.cards) ? pet.cards : [];
  const talentsRaw: string[] = pet.abilities?.talents ?? [];
  const derbyRaw: string[] = pet.abilities?.derby ?? [];
  const pedigree = typeof pet.pedigree === "number" ? pet.pedigree : null;

  /* talents / derby */
  const talents = useMemo(
    () => talentsRaw.map((t) => ({ name: t, rarity: prettyRarity(abilityByName.get(t)?.rarity) })),
    [talentsRaw]
  );
  const derby = useMemo(() => derbyRaw.map((d) => ({ name: d })), [derbyRaw]);

  /* spells with icons */
  const spells = useMemo(() => {
    return cards.map((c) => {
      const s = spellByName.get(c);
      return { name: c, icon: s?.icon || null };
    });
  }, [cards]);

  /* stats for chart + percentile */
  const sameSchool = (Pets || []).filter((p) => p.school === school);
  const pedVals = sameSchool
    .map((p) => (typeof p.pedigree === "number" ? p.pedigree : null))
    .filter((v): v is number => v !== null);
  const stats = meanStd(pedVals);

  const percentile = useMemo(() => {
    if (pedigree == null || !pedVals.length) return null;
    const total = pedVals.length;
    const belowOrEqual = pedVals.filter((v) => v <= pedigree).length;
    // cap to 0–100 and round nicely
    return Math.max(0, Math.min(100, Math.round((belowOrEqual / total) * 100)));
  }, [pedigree, pedVals]);

  /* compact bump chart spec */
  const chartSpec = useMemo(() => {
    if (!stats || stats.std <= 0) return null;
    const mean = stats.mean;
    const std = stats.std;
    const band0 = Math.max(0, mean - std);
    const band1 = Math.min(100, mean + std);
    const petX = typeof pedigree === "number" ? pedigree : mean; // center if unknown

    return {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      description: "Compact Gaussian bump with ±1σ box, mean & pet markers",
      width: 480,
      height: 160,
      data: {
        values: Array.from({ length: 201 }).map((_, i) => ({ x: i * 0.5 })), // 0..100
      },
      transform: [
        { calculate: `${mean}`, as: "mu" },
        { calculate: `${Math.max(std, 0.0001)}`, as: "sigma" },
        { calculate: "exp(-0.5*pow((datum.x - datum.mu)/datum.sigma, 2))", as: "y" },
        { joinaggregate: [{ op: "max", field: "y", as: "ymax" }] },
        { calculate: "datum.y / datum.ymax", as: "ynorm" },
      ],
      layer: [
        {
          data: { values: [{ x0: band0, x1: band1 }] },
          mark: { type: "rect", color: "#d6b35d40", cornerRadius: 6 },
          encoding: {
            x: { field: "x0", type: "quantitative", scale: { domain: [0, 100] }, axis: null },
            x2: { field: "x1" },
            y: { value: 0 },
            y2: { value: 160 },
          },
        },
        {
          mark: { type: "area", line: { color: "#a6842f", opacity: 0.9 }, color: "#d6b35d66" },
          encoding: {
            x: { field: "x", type: "quantitative", scale: { domain: [0, 100] }, axis: { title: null, labels: false, ticks: false, domain: false } },
            y: { field: "ynorm", type: "quantitative", axis: null },
          },
        },
        {
          data: { values: [{ x: mean }] },
          mark: { type: "rule", color: "#1e293b", strokeDash: [4, 3], strokeWidth: 1.5 },
          encoding: { x: { field: "x", type: "quantitative", scale: { domain: [0, 100] } }, y: { value: 0 }, y2: { value: 160 } },
        },
        {
          data: { values: [{ x: mean, y: 148, t: `μ ${mean.toFixed(1)}` }] },
          mark: { type: "text", dy: -6, fontWeight: "bold", align: "center" },
          encoding: {
            x: { field: "x", type: "quantitative", scale: { domain: [0, 100] } },
            y: { field: "y", type: "quantitative" },
            text: { field: "t", type: "nominal" },
            color: { value: "#1e293b" },
          },
        },
        {
          data: { values: [{ x: petX }] },
          mark: { type: "rule", color: "#2a7bd0", strokeWidth: 2 },
          encoding: { x: { field: "x", type: "quantitative", scale: { domain: [0, 100] } }, y: { value: 0 }, y2: { value: 160 } },
        },
        {
          data: { values: [{ x: petX, y: 18, t: `${typeof pedigree === "number" ? pedigree.toFixed(1) : ""}` }] },
          mark: { type: "text", dy: -6, fontWeight: "bold", align: "center" },
          encoding: {
            x: { field: "x", type: "quantitative", scale: { domain: [0, 100] } },
            y: { field: "y", type: "quantitative" },
            text: { field: "t", type: "nominal" },
            color: { value: "#0b3a7a" },
          },
        },
      ],
      view: { stroke: null },
      config: { background: null, axis: { labelColor: "#1e1b12" } },
    } as any;
  }, [stats, pedigree]);

  /* ------------- UI ------------- */
  return (
    <section
      className="panel"
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: 16,
        display: "grid",
        gap: 14,
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Image src={schoolImg} alt={`${school} school`} width={32} height={32} style={{ borderRadius: 6, height: "auto" }} />
        {showLabel ? (
          <div className="heading heading-md" style={{ margin: 0, color: "var(--gold)" }}>
            Pet of the Day
          </div>
        ) : null}
        <div style={{ color: "var(--parchment-ink)", fontWeight: 800, marginLeft: 8 }}>
          {name} · {school}
        </div>
        {typeof pedigree === "number" && (
          <div
            style={{
              marginLeft: "auto",
              background: "#fff",
              border: "1px solid rgba(166,132,47,0.45)",
              borderRadius: 999,
              padding: "4px 10px",
              color: "var(--parchment-ink)",
              fontWeight: 900,
            }}
          >
            Pedigree: {Math.round(pedigree)}
          </div>
        )}
      </div>

      {/* Top: image + spells */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px, 280px) 1fr",
          gap: 12,
        }}
      >
        {/* Pet image */}
        <div
          style={{
            background: "#fff",
            border: "1px solid rgba(166,132,47,0.45)",
            borderRadius: 12,
            boxShadow: "var(--panel-shadow)",
            padding: 8,
            display: "grid",
            placeItems: "center",
          }}
        >
          {petIcon ? (
            <Image
              src={normalizeIcon(petIcon) || ""}
              alt={name}
              width={500}
              height={500}
              sizes="(max-width: 600px) 100vw, 500px"
              style={{ width: "100%", height: "auto", maxHeight: 320, objectFit: "contain", borderRadius: 10 }}
              priority={false}
            />
          ) : (
            <div style={{ width: "100%", height: 260, borderRadius: 10, background: "#ddd" }} />
          )}
        </div>

      
        <div className="panel" style={{ padding: 10, display: "grid", gap: 8, alignContent: "start" }}>
          <div style={{ fontWeight: 900, color: "var(--parchment-ink)" }}>Spell Cards</div>
          {spells.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {spells.map((sp, i) => (
                <span
                  key={`${sp.name}-${i}`}
                  style={{
                    display: "inline-grid",
                    gridAutoFlow: "column",
                    alignItems: "center",
                    gap: 1,
                    padding: "4px 8px",
                    borderRadius: 999,
                  }}
                >
                 {sp.icon ? (
  <Image
    src={normalizeIcon(sp.icon)!}
    alt={sp.name}
    width={150}
    height={200}
    sizes="100px"
    className="inline-block rounded-[3px]"
    loading="lazy"
    
  />
) : (
  <span aria-hidden className="inline-block h-5 w-5 rounded-[3px] border border-gray-300 bg-gray-200" />
)}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ color: "var(--parchment-ink)" }}>No cards</div>
          )}
        </div>
      </div>

      <div
        className="panel"
        style={{
          maxWidth: 500,
          padding: 10,
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          alignItems: "center",
          gap: 14,
        }}
      >
        {/* left: chart + legend (kept compact box) */}
        <div>
          <div style={{ fontWeight: 900, color: "var(--parchment-ink)", marginBottom: 6 }}>
            Pedigree vs {school} Average
          </div>
          {chartSpec ? (
            <div style={{ width: 480 }}>
              <Chart spec={chartSpec} />
            </div>
          ) : (
            <div style={{ color: "var(--parchment-ink)" }}>Not enough data to plot.</div>
          )}
          <div style={{ display: "flex", gap: 10, alignItems: "center", color: "var(--parchment-ink)", fontSize: 12, marginTop: 6 }}>
            <span style={{ width: 14, height: 8, background: "#d6b35d40", border: "1px solid rgba(166,132,47,0.45)", borderRadius: 2 }} />
            <span>Shaded box = average ± one standard deviation; blue line = this pet; dashed = μ</span>
          </div>
        </div>

        {/* right: percentile statement */}
        <div
          style={{
            marginLeft: 100,
            justifySelf: "stretch",
            border: "1px solid rgba(166,132,47,0.45)",
            borderRadius: 10,
            padding: "14px 16px",
            color: "var(--parchment-ink)",
            display: "grid",
            minWidth: 300,
            gap: 6,
          }}
        >
          <div style={{ maxWidth: 500, fontWeight: 900, fontSize: 16 }}>
            {percentile != null
              ? `${name} is better than ${percentile}% of ${school} pets!`
              : `Not enough ${school} data to compute percentile.`}
          </div>
          {percentile != null && stats ? (
            <div style={{ fontSize: 13, opacity: 0.9 }}>
              Among {pedVals.length} {school} pets, the average pedigree is {stats.mean.toFixed(1)} with a standard deviation of ={" "}
              {stats.std.toFixed(2)}.
            </div>
          ) : null}
        </div>
      </div>

      {/* Bottom: talents & derby */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Talents */}
        <div className="panel" style={{ padding: 10, display: "grid", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 900, color: "var(--parchment-ink)" }}>Talents</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {R_ORDER.map((r) => (
                <span key={r} style={{ display: "inline-grid", gridAutoFlow: "column", gap: 6, alignItems: "center" }}>
                  <span aria-hidden style={{ width: 10, height: 10, borderRadius: 999, background: R_BG[r], border: "1px solid rgba(0,0,0,.25)" }} />
                  <span style={{ fontSize: 12, color: "var(--parchment-ink)" }}>{r}</span>
                </span>
              ))}
            </div>
          </div>
          {talents.length ? (
            <div style={{ display: "grid", gap: 6 }}>
              {talents.map((t, i) => {
                const r = t.rarity;
                const bg = (r && R_BG[r]) || "#efded6ff";
                const tx = (r && R_TXT[r]) || "#111827";
                return (
                  <div
                    key={`${t.name}-${i}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      alignItems: "center",
                      padding: "8px 10px",
                      background: bg,
                      color: tx,
                      borderRadius: 8,
                      border: "1px solid rgba(0,0,0,.1)",
                      boxShadow: "0 1px 2px rgba(0,0,0,.06) inset",
                      fontWeight: 800,
                    }}
                  >
                    <span style={{ lineHeight: 1.1, wordBreak: "break-word" }}>{t.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 900, opacity: 0.9 }}>{r ? " " : "—"}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color: "var(--parchment-ink)" }}>No talents</div>
          )}
        </div>

        {/* Derby */}
        <div className="panel" style={{ padding: 10, display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 900, color: "var(--parchment-ink)" }}>Derby</div>
          {derby.length ? (
            <div style={{ display: "grid", gap: 6 }}>
              {derby.map((d, i) => (
                <div
                  key={`${d.name}-${i}`}
                  style={{
                    padding: "8px 10px",
                    background: "#ffffff",
                    color: "var(--parchment-ink)",
                    borderRadius: 8,
                    border: "1px solid rgba(166,132,47,0.35)",
                    fontWeight: 800,
                  }}
                >
                  {d.name}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "var(--parchment-ink)" }}>No derby abilities</div>
          )}
        </div>
      </div>
    </section>
  );
}
