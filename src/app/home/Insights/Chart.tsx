"use client";
import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";

// We will lazy-load vega-embed at runtime to avoid SSR issues
type Props = { spec: any };

export default function Chart({ spec }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let view: any;
    let canceled = false;

    (async () => {
      try {
        const mod: any = await import("vega-embed");
        if (canceled) return;
        const embed = mod.default || mod;
        const result = await embed(ref.current as HTMLDivElement, spec, {
          actions: false,
        });
        view = result?.view;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("vega-embed failed", e);
      }
    })();

    return () => {
      canceled = true;
      try { view?.finalize?.(); } catch {}
    };
  }, [spec]);

  return <div ref={ref} style={{ width: "100%", height: "100%" }} />;
}
