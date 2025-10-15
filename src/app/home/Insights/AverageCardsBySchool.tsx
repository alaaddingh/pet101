"use client";
import Chart from "./Chart";

export default function AverageCardsBySchool({ pets }: { pets: any[] }) {
  const by: Record<string, { total: number; count: number }> = {};
  for (const p of pets) {
    const school = p.school || "Unknown";
    const cards = Array.isArray(p.cards) ? p.cards.length : 0;
    if (!by[school]) by[school] = { total: 0, count: 0 };
    by[school].total += cards;
    by[school].count += 1;
  }
  const data = Object.entries(by).map(([school, v]) => ({ school, avg: v.count ? v.total / v.count : 0 }));

  const spec: any = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: "container",
    autosize: { type: "fit", contains: "padding" },
    height: 300,
    data: { values: data },
    mark: "bar",
    encoding: {
      x: { field: "school", type: "nominal", axis: { labelAngle: 0 } },
      y: { field: "avg", type: "quantitative" },
      tooltip: [ { field: "school" }, { field: "avg", title: "Avg Cards" } ],
      color: { field: "school", type: "nominal", legend: null },
    },
  };
  return <div className="chart-box"><Chart spec={spec} /></div>;
}
