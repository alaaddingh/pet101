"use client";
import { useEffect, useMemo, useRef, useState } from "react";

export default function SearchBar({
  pets,
  onSelect,
  placeholder = "Search pets by name...",
}: {
  pets: any[];
  onSelect: (pet: any) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(-1);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [] as any[];
    const arr = pets
      .filter((p) => String(p?.name || "").toLowerCase().includes(s))
      .slice(0, 10);
    return arr;
  }, [pets, q]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!(e.target instanceof Node)) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function choose(idx: number) {
    const pet = results[idx];
    if (pet) {
      onSelect(pet);
      setQ(pet.name || "");
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} style={{ position: "relative", width: "100%" }}>
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setHover(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open && e.key !== "Enter") return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHover((h) => Math.min(results.length - 1, h + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHover((h) => Math.max(0, h - 1));
          } else if (e.key === "Enter") {
            if (hover >= 0) choose(hover);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        className="search-input"
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 999,
          border: "1px solid rgba(166,132,47,0.55)",
          background: "linear-gradient(180deg, rgba(218, 182, 182, 0.5), rgba(0,0,0,0.06)), var(--parchment)",
          color: "var(--parchment-ink)",
          fontWeight: 700,
          outline: "none",
        }}
      />

      {open && results.length > 0 && (
        <div
          role="listbox"
          className="panel"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "calc(100% - 15px)",
            zIndex: 10,
            maxHeight: 320,
            overflowY: "auto",
            padding: 6,
          }}
        >
          {results.map((p, i) => (
            <div
              key={p.ID || p.name || i}
              role="option"
              aria-selected={i === hover}
              onMouseEnter={() => setHover(i)}
              onClick={() => choose(i)}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                cursor: "pointer",
                background: i === hover ? "rgba(214,179,93,0.25)" : "transparent",
                border: i === hover ? "1px solid rgba(166,132,47,0.55)" : "1px solid transparent",
                color: "var(--parchment-ink)",
                fontWeight: 800,
              }}
            >
              {p.name}
              <span style={{ opacity: 0.7, marginLeft: 8 }}>· {p.school || "Unknown"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

