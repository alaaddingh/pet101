"use client";
import { useMemo } from "react";
import Chart from "./Chart";
import Abilities from "../../../../data/abilities.json";

type Weights = { cards:number; talents:number; derby:number; pedigree:number; attributes:number };

const rarityMap = (() => {
  const map: Record<string, number> = {};
  const toPct: Record<string, number> = { common:20, uncommon:40, rare:60, "ultra-rare":80, epic:100 };
  (Abilities as any[]).forEach((a: any) => {
    const name = String(a?.name || "").toLowerCase();
    const rarity = String(a?.rarity || "").toLowerCase();
    if (name && toPct[rarity] != null) map[name] = toPct[rarity];
  });
  return map;
})();

// scoring helpers 
function cardsScore(n:number): number {
  const c = Math.max(0, n || 0);
  if (c >= 3) return 100;
  const mid = 1.3;
  return c <= mid ? (c / mid) * 50 : 50 + ((c - mid) / (3 - mid)) * 50;
}
function derbyOrTalentScore(list:any[]): number | null {
  const names = Array.isArray(list) ? list : [];
  let sum = 0, n = 0;
  for (const item of names) {
    const key = String(item).toLowerCase();
    const pct = rarityMap[key];
    if (pct != null) { sum += pct; n += 1; }
  }
  return n ? sum / n : null;
}
function attributesScore(attrs:any): number | null {
  if (!attrs || typeof attrs !== "object") return null;
  const maxes: Record<string, number> = { Strength:255, Intellect:250, Agility:260, Will:260, Power:250 };
  let sum = 0, n = 0;
  for (const k of Object.keys(maxes)) {
    const v = attrs[k]; if (v == null) continue;
    const val = Number(v), max = maxes[k];
    if (isFinite(val) && max > 0) { sum += Math.max(0, Math.min(100, (val / max) * 100)); n += 1; }
  }
  return n ? sum / n : null;
}
function pedigreeScore(p:any): number | null {
  const v = Number(p);
  return isFinite(v) ? Math.max(0, Math.min(100, v)) : null;
}


function petWeightedScore(p:any, wNorm:Weights): number {
  const s_cards      = cardsScore(Array.isArray(p?.cards) ? p.cards.length : 0);
  const s_talents    = derbyOrTalentScore(p?.abilities?.talents);
  const s_derby      = derbyOrTalentScore(p?.abilities?.derby);
  const s_pedigree   = pedigreeScore(p?.pedigree);
  const s_attributes = attributesScore(p?.attributes);

  const val = (x:number|null) => (x == null ? 50 : x);

  const total =
      wNorm.cards      * val(s_cards) +
      wNorm.talents    * val(s_talents) +
      wNorm.derby      * val(s_derby) +
      wNorm.pedigree   * val(s_pedigree) +
      wNorm.attributes * val(s_attributes);

  return total;
}

function computeSchoolScores(pets:any[], wNorm:Weights) {
  const agg: Record<string, { sum:number; n:number }> = {};
  const skip = new Set(["unknown","unk","n/a","na","none","(unknown)"]);
  for (const p of pets) {
    const school = (typeof p?.school === "string" ? p.school : "").trim();
    if (!school || skip.has(school.toLowerCase())) continue;
    const s = petWeightedScore(p, wNorm);
    (agg[school] ??= { sum:0, n:0 });
    agg[school].sum += s; agg[school].n += 1;
  }
  return Object.entries(agg).map(([school, v]) => ({ school, score: v.sum / v.n, n: v.n }));
}

const SCHOOL_ORDER = ["Fire","Balance","Storm","Ice","Death","Life","Myth"];
const COLORS: Record<string,string> = {
  Fire:"#f97316", Balance:"#b86e2b", Storm:"#7c3aed", Ice:"#93c5fd", Death:"#9ca3af", Life:"#22c55e", Myth:"#facc15"
};
function displaySchool(raw:string) {
  const s = String(raw || "").trim().toLowerCase();
  return s==="fire" ? "Fire" :
         s==="balance" ? "Balance" :
         s==="storm" ? "Storm" :
         s==="ice" ? "Ice" :
         s==="death" ? "Death" :
         s==="life" ? "Life" :
         s==="myth" ? "Myth" : raw || "";
}

export default function SchoolBestPets({
  pets, weights,
}: { pets:any[]; weights:Weights }) {

  const wNorm = useMemo<Weights>(() => {
    const s = weights.cards + weights.talents + weights.derby + weights.pedigree + weights.attributes;
    const safe = s > 0 ? s : 1;
    return {
      cards:      weights.cards      / safe,
      talents:    weights.talents    / safe,
      derby:      weights.derby      / safe,
      pedigree:   weights.pedigree   / safe,
      attributes: weights.attributes / safe,
    };
  }, [weights]);

  const {rows, order} = useMemo(() => {
    const base = computeSchoolScores(pets, wNorm).map(d => ({
      school: displaySchool(d.school),
      score: d.score,
      scoreRounded: Math.round(d.score * 10) / 10,
      n: d.n
    }));
    const seen = new Set<string>();
    const uniq = base.filter(r => {
      const k = r.school?.toLowerCase();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    uniq.sort((a,b) => (b.score - a.score) || a.school.localeCompare(b.school));
    return { rows: uniq, order: uniq.map(r => r.school) };
  }, [pets, wNorm]);

  if (!rows.length) return <div>No pet data to plot.</div>;

  // emphasize ratings 40–60 since this is most common
  const ZOOM_MIN = 35, ZOOM_MAX = 70;

  const spec:any = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    description: "Average pet score by school",
    width: "container",
    autosize: { type: "fit", contains: "padding" },
    height: 420,
    data: { values: rows },
    layer: [
      // Bars
      {
        mark: { type: "bar", cornerRadiusTopLeft: 6, cornerRadiusTopRight: 6, tooltip: false },
        encoding: {
          x: {
            field: "school", type: "nominal",
            scale: { domain: order, paddingInner: 0.25, paddingOuter: 0 },
            axis: { title: null, labels: false, ticks: false, domain: false }
          },
          y: {
            field: "score", type: "quantitative",
            scale: { domain: [ZOOM_MIN, ZOOM_MAX], clamp: true, nice: false },
            axis: { title: null, labels: false, ticks: false, domain: false, grid: true, gridColor: "#ffffff22", gridDash: [2,4], gridWidth: 1 }
          },
          color: {
            field: "school", type: "nominal", legend: null,
            scale: { domain: SCHOOL_ORDER, range: SCHOOL_ORDER.map(s => COLORS[s]) }
          }
        }
      },
      {
        mark: { type: "text", dy: -6, fontWeight: "bold" },
        encoding: {
          x: { field: "school", type: "nominal", scale: { domain: order } },
          y: { field: "score", type: "quantitative", scale: { domain: [ZOOM_MIN, ZOOM_MAX], clamp: true, nice: false } },
          text: { field: "scoreRounded", type: "quantitative" },
          color: { value: "#f6e7b1" }
        }
      },
      {
        mark: { type: "bar", opacity: 0 },
        encoding: {
          x: { field: "school", type: "nominal", scale: { domain: order } },
          y: { field: "score", type: "quantitative", scale: { domain: [ZOOM_MIN, ZOOM_MAX], clamp: true, nice: false } },
          tooltip: [
            { field: "school", title: "School" },
            { field: "scoreRounded", title: "Avg score" },
            { field: "n", title: "Pets (n)" }
          ]
        }
      }
    ],
    padding: { left: 0, right: 0, top: 8, bottom: 0 },
    view: { stroke: null },
    config: { background: null }
  };

  return (
    <div className="chart-box" style={{ paddingLeft: 0, paddingRight: 0 }}>
      <Chart spec={spec} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${order.length}, 1fr)`,
          alignItems: "start",
          gap: 0,
          marginTop: 6,
          pointerEvents: "none"
        }}
      >
        {order.map((school) => (
          <div key={school} style={{ display: "grid", placeItems: "center" }}>
            <img
              src={`/images/${school.toLowerCase()}.png`}
              alt={school}
              width={28}
              height={28}
              style={{ display: "block", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.35))" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
