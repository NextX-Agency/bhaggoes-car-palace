"use client";

import { useId, useState, type ReactNode } from "react";
import { MakeSelect } from "@/components/make-select";
import { ModelSelect } from "@/components/model-select";

export function VehicleMakeModelFilter({ makes, modelsByMake, make = "", model = "", logos, layout = "filter" }: { makes: string[]; modelsByMake: Record<string, string[]>; make?: string; model?: string; logos: Record<string, ReactNode>; layout?: "filter" | "hero" }) {
  const [selectedMake, setSelectedMake] = useState(make);
  const [selectedModel, setSelectedModel] = useState(model);
  const makeLabelId = useId();
  const models = selectedMake
    ? modelsByMake[selectedMake] ?? []
    : [...new Set(Object.values(modelsByMake).flat())].sort((a, b) => a.localeCompare(b));

  return <>
    <div className={layout === "hero" ? "field" : "filter-make"}><span id={makeLabelId}>Make</span><MakeSelect name="make" makes={makes} value={make} logos={logos} labelledBy={makeLabelId} onChange={(next) => { setSelectedMake(next); setSelectedModel(""); }} /></div>
    <div className={layout === "hero" ? "field" : "filter-model"}><span>Model</span><ModelSelect models={models} value={selectedModel} onChange={setSelectedModel} placeholder="Any listed model" /></div>
  </>;
}
