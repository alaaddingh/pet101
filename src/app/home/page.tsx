
"use client";
import { useState } from "react";
import Pets from "../../../data/pets.json";
import Insights from "./Insights/insights";
import Navbar from "./navbar/navbar";
import PetLookup from "./pet-lookup/PetLookup";

export default function HomeAlias() {
  const [tab, setTab] = useState<"insights" | "lookup">("insights");

  return (
    <main className="page" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Title */}
      <header className="w-full flex justify-center items-center py-4">
        <h1 className="heading heading-xl text-center flex justify-center">Pet101</h1>
      <h1 className="heading heading-md text-center flex justify-center">The unofficial Wizard101 Analytics tool for your Pets!</h1>

      </header>

      <Navbar active={tab} onChange={setTab} />

      {tab === "insights" ? (
        <Insights Pets={Pets} />
      ) : (
        <PetLookup Pets={Pets} />
      )}

    
      {/* Credits / Sources (same panel bg) */}
    <details className="collapsible mt-6" style={{ marginTop: "auto" }}>
  <summary className="heading heading-md">
    Credits & Sources
  </summary>

    <div className="collapsible-content">
      <ul className="list-disc pl-5 text-sm" style={{ color: "var(--parchment-ink)" }}>
         <li>
          <strong> Website Sources: </strong> Wizard101 Central Wiki (https://wiki.wizard101central.com/wiki/Wizard101_Wiki) <br></br> (Due to site access policies, I used snapshots via Wayback Machine internet archives).
          
        </li>
        <br></br>
        <li>
          <strong>Data Sources: </strong>
          For the actual data, I scraped them myself :). I wrote a python script that utilizes Beautiful Soup to scrape the Wayback Machine website
          for archived pages regarding pets, pet spells and pet abilities. A rough total of 1300 pages were scraped to make this dataset, which contains data on 764 pets, 320 pet abilities, and 327 pet spells. check out the repository for this site to access the JSON!
        </li>
      </ul>
    </div>
  </details>


    </main>
  );
}
