"use client";
import React from "react";

interface PetComparisonProps {
  Pets: any[];
}

export default function PetComparison({ Pets }: PetComparisonProps) {
  return (
    <section className="text-center">
      <h2 className="heading heading-md mb-2">Pet Comparison</h2>

    </section>
  );
}

