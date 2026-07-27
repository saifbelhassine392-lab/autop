"use client";

import React, { useState, useEffect, useRef } from "react";
import { getBrandSuggestions, getModelSuggestions, ModelSuggestion } from "@/lib/vehiclesData";
import { Car, ChevronDown, Check, X } from "lucide-react";

interface VehicleAutocompleteProps {
  brand: string;
  model: string;
  onBrandChange: (brand: string) => void;
  onModelChange: (model: string) => void;
  brandPlaceholder?: string;
  modelPlaceholder?: string;
  brandLabel?: string;
  modelLabel?: string;
  className?: string;
  inputClassName?: string;
}

export default function VehicleAutocomplete({
  brand,
  model,
  onBrandChange,
  onModelChange,
  brandPlaceholder = "Ex: Peugeot, Renault...",
  modelPlaceholder = "Ex: 308, Clio...",
  brandLabel = "MARQUE DU VÉHICULE",
  modelLabel = "MODÈLE DU VÉHICULE",
  className = "",
  inputClassName = ""
}: VehicleAutocompleteProps) {
  const [brandOpen, setBrandOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);

  const [brandQuery, setBrandQuery] = useState(brand);
  const [modelQuery, setModelQuery] = useState(model);

  const brandRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);

  // Sync internal queries with props
  useEffect(() => {
    setBrandQuery(brand);
  }, [brand]);

  useEffect(() => {
    setModelQuery(model);
  }, [model]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (brandRef.current && !brandRef.current.contains(e.target as Node)) {
        setBrandOpen(false);
      }
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) {
        setModelOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const brandSuggestions = getBrandSuggestions(brandQuery);
  const modelSuggestions = getModelSuggestions(brand, modelQuery);

  const handleSelectBrand = (selectedBrand: string) => {
    if (selectedBrand.toUpperCase() !== brand.toUpperCase()) {
      onModelChange("");
      setModelQuery("");
    }
    onBrandChange(selectedBrand);
    setBrandQuery(selectedBrand);
    setBrandOpen(false);

    // Auto-focus model field after selecting brand
    setTimeout(() => {
      modelInputRef.current?.focus();
      setModelOpen(true);
    }, 100);
  };

  const handleSelectModel = (suggestion: ModelSuggestion) => {
    onModelChange(suggestion.model);
    setModelQuery(suggestion.model);

    // If brand wasn't specified, auto-fill brand as well!
    if (!brand || brand.trim() === "") {
      onBrandChange(suggestion.brand);
      setBrandQuery(suggestion.brand);
    }

    setModelOpen(false);
  };

  const defaultInputStyle = "w-full bg-slate-950/60 text-slate-100 p-3 pr-9 rounded-xl border border-slate-800 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-medium placeholder-slate-500";

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      {/* Field 1: MARQUE DU VÉHICULE */}
      <div className="flex flex-col relative" ref={brandRef}>
        <label className="text-xs font-semibold text-slate-400 mb-1 flex items-center justify-between">
          <span>{brandLabel}</span>
          {brand && (
            <span className="text-[10px] text-red-400 font-normal uppercase tracking-wider">
              Marque sélectionnée
            </span>
          )}
        </label>

        <div className="relative flex items-center">
          <input
            type="text"
            placeholder={brandPlaceholder}
            className={inputClassName || defaultInputStyle}
            value={brandQuery}
            onChange={(e) => {
              const val = e.target.value;
              setBrandQuery(val);
              onBrandChange(val);
              setBrandOpen(true);
            }}
            onFocus={() => setBrandOpen(true)}
            autoComplete="off"
          />

          <div className="absolute right-3 flex items-center gap-1.5 text-slate-400 pointer-events-none">
            {brandQuery ? (
              <button
                type="button"
                className="pointer-events-auto text-slate-500 hover:text-slate-200 transition p-0.5 rounded"
                onClick={() => {
                  setBrandQuery("");
                  onBrandChange("");
                  setBrandOpen(true);
                }}
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${brandOpen ? "rotate-180 text-red-500" : ""}`} />
            )}
          </div>
        </div>

        {/* Brand Dropdown Menu */}
        {brandOpen && brandSuggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-950/40 sticky top-0 backdrop-blur-md">
              Marques ({brandSuggestions.length})
            </div>
            {brandSuggestions.map((b) => {
              const isSelected = brand.toUpperCase() === b.toUpperCase();
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => handleSelectBrand(b)}
                  className={`w-full text-left px-3.5 py-2.5 text-sm transition flex items-center justify-between group ${
                    isSelected
                      ? "bg-red-600/20 text-red-400 font-semibold border-l-2 border-red-500"
                      : "text-slate-200 hover:bg-slate-800/80 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Car className="w-3.5 h-3.5 text-slate-500 group-hover:text-red-400 transition" />
                    {b}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-red-500" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Field 2: MODÈLE DU VÉHICULE */}
      <div className="flex flex-col relative" ref={modelRef}>
        <label className="text-xs font-semibold text-slate-400 mb-1 flex items-center justify-between">
          <span>{modelLabel}</span>
          {brand && (
            <span className="text-[10px] text-slate-400 font-normal">
              Modèles <span className="text-red-400 font-semibold">{brand.toUpperCase()}</span>
            </span>
          )}
        </label>

        <div className="relative flex items-center">
          <input
            ref={modelInputRef}
            type="text"
            placeholder={modelPlaceholder}
            className={inputClassName || defaultInputStyle}
            value={modelQuery}
            onChange={(e) => {
              const val = e.target.value;
              setModelQuery(val);
              onModelChange(val);
              setModelOpen(true);
            }}
            onFocus={() => setModelOpen(true)}
            autoComplete="off"
          />

          <div className="absolute right-3 flex items-center gap-1.5 text-slate-400 pointer-events-none">
            {modelQuery ? (
              <button
                type="button"
                className="pointer-events-auto text-slate-500 hover:text-slate-200 transition p-0.5 rounded"
                onClick={() => {
                  setModelQuery("");
                  onModelChange("");
                  setModelOpen(true);
                }}
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${modelOpen ? "rotate-180 text-red-500" : ""}`} />
            )}
          </div>
        </div>

        {/* Model Dropdown Menu */}
        {modelOpen && modelSuggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-950/40 sticky top-0 backdrop-blur-md flex items-center justify-between">
              <span>Modèles de véhicules</span>
              {brand && <span className="text-red-400 font-semibold">{brand}</span>}
            </div>
            {modelSuggestions.map((s, idx) => {
              const isSelected = model.toUpperCase() === s.model.toUpperCase();
              return (
                <button
                  key={`${s.brand}-${s.model}-${idx}`}
                  type="button"
                  onClick={() => handleSelectModel(s)}
                  className={`w-full text-left px-3.5 py-2.5 text-sm transition flex items-center justify-between group ${
                    isSelected
                      ? "bg-red-600/20 text-red-400 font-semibold border-l-2 border-red-500"
                      : "text-slate-200 hover:bg-slate-800/80 hover:text-white"
                  }`}
                >
                  <span className="font-medium text-slate-100 group-hover:text-white">
                    {s.model}
                  </span>
                  {!brand && (
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 group-hover:border-red-500/40 group-hover:text-red-400 transition">
                      {s.brand}
                    </span>
                  )}
                  {isSelected && <Check className="w-4 h-4 text-red-500" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
