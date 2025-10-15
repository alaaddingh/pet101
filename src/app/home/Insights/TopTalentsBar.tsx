"use client";
import Chart from "./Chart";

export default function TopTalentsBar({ pets }: { pets: any[] }) {

  // calculate most frequent ability names
  const freq: Record<string, number> = {};
  for (const p of pets) {
    const talents: any[] = p?.abilities?.talents || [];
    for (const t of talents) {
      const name = String(t).trim();
      if (!name) continue;
      freq[name] = (freq[name] || 0) + 1;
    }
  }
  const top = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,count])=>({name, count}));

  const spec: any = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: "container",
    autosize: { type: "fit", contains: "padding" },
    height: 260,
    data: { values: top },
    mark: "bar",
    encoding: {
      x: { field: "name", type: "nominal", axis: { labelAngle: 0 } },
      y: { field: "count", type: "quantitative" },
      tooltip: [ { field: "name" }, { field: "count" } ],
      color: { field: "name", type: "nominal", legend: null },
    },
  };
  return <div className="chart-box"><Chart spec={spec} /></div>;
}
