"use client";

import { useProductionState } from "@/lib/use-production-state";
import { WhatToCookColumn } from "@/components/production/what-to-cook-column";
import { CookingColumn } from "@/components/production/cooking-column";
import { HeldColumn } from "@/components/production/held-column";
import { WasteColumn } from "@/components/production/waste-column";
import { AlertBanner } from "@/components/production/alert-banner";

export function ProductionBoard() {
  const { state, startCooking, confirmDisposal } = useProductionState();

  return (
    <div className="flex flex-col gap-4">
      <AlertBanner />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-3 overflow-y-auto lg:max-h-[calc(100vh-10rem)]">
          <WhatToCookColumn
            items={state.whatToCook}
            onStartCooking={startCooking}
          />
        </div>
        <div className="flex flex-col gap-3 overflow-y-auto lg:max-h-[calc(100vh-10rem)]">
          <CookingColumn batches={state.cooking} />
        </div>
        <div className="flex flex-col gap-3 overflow-y-auto lg:max-h-[calc(100vh-10rem)]">
          <HeldColumn batches={state.held} />
        </div>
        <div className="flex flex-col gap-3 overflow-y-auto lg:max-h-[calc(100vh-10rem)]">
          <WasteColumn
            entries={state.waste}
            onConfirmDisposal={confirmDisposal}
          />
        </div>
      </div>
    </div>
  );
}
