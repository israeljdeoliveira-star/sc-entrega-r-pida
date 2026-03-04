import { useState, useRef, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface NominatimCity {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
  };
}

export interface CitySelection {
  cityName: string;
  state: string;
  lat: number;
  lng: number;
  cityId?: string;
  stateServed?: boolean;
}

interface CityAutocompleteProps {
  placeholder?: string;
  disabled?: boolean;
  value?: string;
  onSelect: (selection: CitySelection) => void;
}

interface ServedState {
  id: string;
  state_code: string;
  state_name: string;
  is_active: boolean;
}

/** Normalize: trim, collapse spaces, fix glued commas */
function normalizeQuery(input: string): string {
  let q = input.trim();
  q = q.replace(/\s{2,}/g, " ");
  q = q.replace(/,(\S)/g, ", $1");
  return q;
}

export default function CityAutocomplete({
  placeholder = "Digite o nome da cidade...",
  disabled = false,
  value,
  onSelect,
}: CityAutocompleteProps) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState<NominatimCity[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const servedStatesRef = useRef<ServedState[] | null>(null);

  useEffect(() => {
    if (value !== undefined && value !== query) setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    supabase.from("served_states").select("id, state_code, state_name, is_active").eq("is_active", true)
      .then(({ data }) => { if (data) servedStatesRef.current = data as ServedState[]; });
  }, []);

  const search = useCallback((q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const normalized = normalizeQuery(q);
    if (normalized.length < 2) { setResults([]); setIsOpen(false); return; }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        // Search without restrictive viewbox — all of Brazil
        const params = new URLSearchParams({
          q: `${normalized}, Brazil`,
          format: "json",
          addressdetails: "1",
          limit: "10",
          countrycodes: "br",
          featuretype: "city",
        });
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?${params}`,
          { headers: { "User-Agent": "FreteGarca/1.0" } }
        );
        let data: NominatimCity[] = await res.json();

        // If featuretype=city returned nothing, retry without it
        if (data.length === 0) {
          const fallbackParams = new URLSearchParams({
            q: `${normalized}, Brazil`,
            format: "json",
            addressdetails: "1",
            limit: "10",
            countrycodes: "br",
          });
          const fallbackRes = await fetch(
            `https://nominatim.openstreetmap.org/search?${fallbackParams}`,
            { headers: { "User-Agent": "FreteGarca/1.0" } }
          );
          data = await fallbackRes.json();
        }

        const filtered = data.filter(
          (r) => r.address?.city || r.address?.town || r.address?.village || r.address?.municipality
        );

        // Deduplicate by city name
        const seen = new Set<string>();
        const merged: NominatimCity[] = [];
        for (const r of filtered) {
          const name = getCityName(r).toLowerCase();
          const state = getStateName(r).toLowerCase();
          const key = `${name}-${state}`;
          if (!seen.has(key)) { seen.add(key); merged.push(r); }
        }

        setResults(merged);
        setIsOpen(merged.length > 0);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 400);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    search(v);
  };

  const getCityName = (r: NominatimCity): string =>
    r.address?.city || r.address?.town || r.address?.village || r.address?.municipality || r.display_name.split(",")[0];
  
  const getStateName = (r: NominatimCity): string => r.address?.state || "";

  const getStateCode = (stateName: string): string => {
    const map: Record<string, string> = {
      "acre": "AC", "alagoas": "AL", "amapá": "AP", "amazonas": "AM", "bahia": "BA",
      "ceará": "CE", "distrito federal": "DF", "espírito santo": "ES", "goiás": "GO",
      "maranhão": "MA", "mato grosso": "MT", "mato grosso do sul": "MS", "minas gerais": "MG",
      "pará": "PA", "paraíba": "PB", "paraná": "PR", "pernambuco": "PE", "piauí": "PI",
      "rio de janeiro": "RJ", "rio grande do norte": "RN", "rio grande do sul": "RS",
      "rondônia": "RO", "roraima": "RR", "santa catarina": "SC", "são paulo": "SP",
      "sergipe": "SE", "tocantins": "TO",
    };
    return map[stateName.toLowerCase()] || "";
  };

  const formatResult = (r: NominatimCity) => {
    const city = getCityName(r);
    const state = getStateName(r);
    const code = getStateCode(state);
    const served = servedStatesRef.current?.some(s => s.state_code === code);
    return `${city} - ${code || state}${served === false ? " ⚠️" : ""}`;
  };

  const handleSelect = async (r: NominatimCity) => {
    const cityName = getCityName(r);
    const state = getStateName(r);
    const code = getStateCode(state);
    setQuery(`${cityName} - ${code || state}`);
    setIsOpen(false);

    const served = servedStatesRef.current?.some(s => s.state_code === code);

    onSelect({
      cityName,
      state: code || state,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      stateServed: served,
    });
  };

  return (
    <div ref={containerRef} className="relative">
      <Input value={query} onChange={handleChange} placeholder={placeholder} disabled={disabled} autoComplete="off" />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-48 overflow-y-auto">
          {results.map((r, i) => (
            <button key={i} type="button" className="w-full px-3 py-2.5 text-left text-sm hover:bg-accent transition-colors border-b last:border-0" onClick={() => handleSelect(r)}>
              {formatResult(r)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
