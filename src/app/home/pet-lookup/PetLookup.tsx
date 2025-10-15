"use client";
import { useState } from "react";
import SearchBar from "./SearchBar";
import PetOfTheDay from "../Insights/petoftheday";

export default function PetLookup({ Pets }: { Pets: any[] }) {
  const [selected, setSelected] = useState<any | null>(null);

  return (
    <section className="text-center">
      <h2 className="heading heading-md mb-2">Pet Lookup</h2>
      <div className="panel" style={{ maxWidth: 760, margin: "0 auto", padding: 16 }}>
        <div style={{ marginBottom: 12 }}>
          <SearchBar pets={Pets} onSelect={(p) => setSelected(p)} />
        </div>
        <div style={{ color: "var(--parchment-ink)", fontSize: 13 }}>
          Search for a wizard101 pet!
        </div>
      </div>

      {selected ? (
        <div style={{ marginTop: 12 }}>
          <PetOfTheDay Pets={Pets} pet={selected} showLabel={false} />
        </div>
      ) : null}
    </section>
  );
}

