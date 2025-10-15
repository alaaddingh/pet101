
"use client";

type Tab = "insights" | "lookup";

export default function Navbar({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  return (
    <div className="dashbar" role="tablist" aria-label="View selector">
      <button
        className={`tab ${active === "insights" ? "active" : ""}`}
        role="tab"
        aria-selected={active === "insights"}
        onClick={() => onChange("insights")}
      >
        Insights
      </button>
      <button
        className={`tab ${active === "lookup" ? "active" : ""}`}
        role="tab"
        aria-selected={active === "lookup"}
        onClick={() => onChange("lookup")}
      >
        Pet Lookup
      </button>
    </div>
  );
}
