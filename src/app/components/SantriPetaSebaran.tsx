import React from "react";
import { SantriMapModal } from "./SantriMapModal";
import { SantriData } from "../data/santriData";

interface SantriPetaSebaranProps {
  onClose?: () => void;
  santriList?: SantriData[];
  isPage?: boolean;
}

export function SantriPetaSebaran({ onClose = () => {}, santriList, isPage = false }: SantriPetaSebaranProps) {
  return (
    <SantriMapModal
      onClose={onClose}
      santriList={santriList}
      isPage={isPage}
    />
  );
}