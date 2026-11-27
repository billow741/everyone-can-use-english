import React from "react";
import { FamilySampleSection } from "@renderer/components/phonics/family-sample";

export default function FamiliesIndex() {
  return (
    <div className="min-h-full px-4 pt-4 sm:py-6 pb-44 min-[1280px]:pb-8 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* 页头之下渲染 FamilySampleSection */}
      <FamilySampleSection />
    </div>
  );
}
