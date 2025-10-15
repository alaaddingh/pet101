import React from "react";
import ScoreControls from "./ScoreControls";
import PetOfTheDay from "./petoftheday";

interface InsightsProps {
  Pets: any[];
}

const Insights: React.FC<InsightsProps> = ({ Pets }) => {
  return (
    <section className="text-center">

      {/* Pet of the Day goes first */}
      <PetOfTheDay Pets={Pets} />

        <h1 className="heading heading-lg mb-2">Dynamic School Ranking</h1>
      <details className="panel inline-block text-center w-full">
        <summary
          className="border-2 cursor-pointer select-none"
          style={{
            padding: "3px",
            borderRadius: "8px",
            color: "var(--parchment-ink)",
            fontWeight: 600,
          }}
        >
          What is this?
        </summary>

        {/* EXPLANATION */}
        <div className="text-sm text-left" style={{ color: "var(--parchment-ink)", lineHeight: 1.5 }}>
          <p className="mb-2">
            The chart below ranks all Wizard101 pets that I have recorded within json data by their respective schools. I measure them by the average quality of their pets. The sliders
            allow you to control which aspects are weighted more heavily into the calculation. But by default (when you first load this page), This is how the scores are assessed: <br></br>
            </p>
            <h4 className="panel heading-on-parchment" style={{ margin: "12px 0 6px" }}>Score = 
            <code>  0.3(Card score) + 0.3(Talents score) + 0.1(Derby Score) + 0.2(Pedigree score) + 0.1(Attributes Score)</code> </h4>
          

          <h4 className="heading-on-parchment" style={{ margin: "12px 0 6px" }}>Data</h4>
          <p> I decided to scrape my own data as very little exists for wizard101. I wrote a python script to scrape Wayback Machine's archived Wizard101 Wiki's pet pages. This is what I gathered:</p>
          <ul className="list-disc pl-5">
            <li><code>pets.json</code> — I was able to aggregate 764 pets, every pet with its school, cards, abilities (talents and derby), attributes, pedigree, and description. Unfortunately, a lot of information is also unavailable so there may be some pets with missing data.</li>
            <li><code>abilities.json</code> — I scraped 320 different pages detailing the rarity of certain pet abilities. I use this data to map ability rarity to a percentage:
              <span> Common 20, Uncommon 40, Rare 60, Ultra-Rare 80, Epic 100.</span>
            </li>
            <li><code>spells.json</code> — I scraped 327 different pet spells in order to obtain their icon images.</li>
          </ul>

          <h4 className="heading-on-parchment" style={{ margin: "12px 0 6px" }}>How scores are evaluated (0–100):</h4>
          <ul className="list-disc pl-5">
            <li><strong>Cards</strong>: more cards = higher score (smoothly scaled to the point where 3+ cards = 100).</li>
            <li><strong>Talents</strong>: I average the rarity score of all talents with available "rarity" properties from <code>abilities.json</code>.</li>
            <li><strong>Derby</strong>: same as talents, but for Derby abilities.</li>
            <li><strong>Attributes</strong>: each stat is scaled to its known cap
              (Strength 255, Intellect 250, Agility 260, Will 260, Power 250) then averaged.</li>
            <li><strong>Pedigree</strong>: scored from 0–100 as this is KingIsle's official rating system of Wizard101's pets.</li>
          </ul>

          <h4 className="heading-on-parchment" style={{ margin: "12px 0 6px" }}>How the sliders are applied</h4>
          <ol className="list-decimal pl-5">
            <li>I normalize the sliders once their weights sum to 1.</li>
            <li>If a pet is missing a component (like, no attributes), I use a neutral value of 50 for that part,
                so every slider has influence.</li>
          </ol>

          <h4 className="heading-on-parchment" style={{margin: "12px 0 6px"}}>School ranking</h4>
          <ul className="list-disc pl-5">
            <p>The average of scores are taken for all pets in the school. This seemed to be the best way to represent the overall <br></br>school's rating. For an individual pet's rating, the pet is measured by the average pedigree of their school <br></br> to determine the standard deviation.</p>
          </ul>

          <p className="mt-2">
            Try dragging the sliders to re-weight what “best” means!
          </p>
        </div>
      </details>

      {/* Controls + chart */}
      <div className="panel inline-block text-left w-full">
        <ScoreControls pets={Pets} />
      </div>
    </section>
  );
};

export default Insights;
