"use client";
import { useState } from "react";
import SchoolBestPets from "./SchoolBestPets";

type Weights = {
  cards: number;
  talents: number;
  derby: number;
  pedigree: number;
  attributes: number;
};

export default function ScoreControls({ pets }: { pets: any[] }) {
  const [w, setW] = useState<Weights>({
    cards: 0.3,
    talents: 0.3,
    derby: 0.1,
    pedigree: 0.2,
    attributes: 0.1,
  });


  return (
    <div className="controls">
      <div className="row">
        {(["cards","talents","derby","pedigree","attributes"] as const).map((k) => (
          <label key={k}>
            <span>{k} ({w[k].toFixed(2)})</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={w[k]}
              onChange={(e) => setW((prev) => ({ ...prev, [k]: parseFloat(e.target.value) }))}
            />
          </label>
        ))}
      </div>
      <div style={{ marginTop: 12 }}>
        <SchoolBestPets pets={pets} weights={w} />
      </div>
    </div>
  );
}
