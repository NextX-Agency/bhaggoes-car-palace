"use client";

import { useId, useState, type ReactNode } from "react";
import { MakeSelect } from "@/components/make-select";
import { modelsForMake } from "@/lib/vehicle-models";

export function VehicleMakeModelFilter({ makes, make = "", model = "", logos }: { makes: string[]; make?: string; model?: string; logos: Record<string, ReactNode> }) {
  const [selectedMake, setSelectedMake] = useState(make);
  const [selectedModel, setSelectedModel] = useState(model);
  const models = modelsForMake(selectedMake);
  const listId = useId();

  return <>
    <div className="filter-make"><span id="filter-make-label">Make</span><MakeSelect name="make" makes={makes} value={make} logos={logos} labelledBy="filter-make-label" onChange={(next) => { setSelectedMake(next); setSelectedModel(""); }} /></div>
    <label>Model<input name="model" value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)} list={models.length ? listId : undefined} placeholder={selectedMake ? "Choose or type a model" : "Any model"} autoComplete="off" />
      {models.length ? <datalist id={listId}>{models.map((item) => <option key={item} value={item} />)}</datalist> : null}
    </label>
  </>;
}
