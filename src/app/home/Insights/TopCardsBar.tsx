"use client";
import { padding } from "vega-lite/types_unstable/compile/scale/properties.js";
import Chart from "./Chart";

export default function TopCardsBar({ pets }: { pets: any[] }) {
  const freq: Record<string, number> = {};
  for (const p of pets) {
    const cards: any[] = Array.isArray(p.cards) ? p.cards : [];
    for (const c of cards) {
      const name = String(c).trim();
      if (!name) continue;
      freq[name] = (freq[name] || 0) + 1;
    }
  }
  const sorted = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([name,count])=>({name, count}));

  const spec: any = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: "container",
    autosize: { type: "fit", contains: "padding" },
    height: 420,
    padding: 30,
    data: { values: sorted },
    mark: "bar",
    encoding: {
      x: { field: "count", type: "quantitative" },
      y: { field: "name", type: "nominal", sort: "-x" },
      tooltip: [ { field: "name" }, { field: "count" } ],
    },
  };
  return <div className="chart-box"><Chart spec={spec} /></div>;
}
