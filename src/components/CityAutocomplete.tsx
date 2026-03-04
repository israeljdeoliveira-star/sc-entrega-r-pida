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
    state?: string;
  };
}

export interface CitySelection {
  cityName: string;
  state: string;
  lat: number;
  lng: number;
  cityId?: string; // If exists in our DB
}

interface CityAutocompleteProps {
  placeholder?: string;
  disabled?: boolean;
  value?: string;
  onSelect: (selection: CitySelection) => void;
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

  useEffect(() => {
    if (value !== undefined && value !== query) setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const search = useCallback((q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        // Viewbox prioritizing Itapema/SC region but allowing all Brazil
        const params = new URLSearchParams({
          q: `${q}, Brazil`,
          format: "json",
          addressdetails: "1",
          limit: "8",
          countrycodes: "br",
          featuretype: "city",
          viewbox: "-49.5,-27.8,-48.0,-26.5",
          bounded: "0",
        });
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?${params}`,
          { headers: { "User-Agent": "FreteGarca/1.0" } }
        );
        const data: NominatimCity[] = await res.json();
        // Filter to only results that look like cities
        const filtered = data.filter((r) => {
          const addr = r.address;
          return addr?.city || addr?.town || addr?.village;
        });
        setResults(filtered);
        setIsOpen(filtered.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 600);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    search(v);
  };

  const getCityName = (r: NominatimCity): string => {
    return r.address?.city || r.address?.town || r.address?.village || r.display_name.split(",")[0];
  };

  const getStateName = (r: NominatimCity): string => {
    return r.address?.state || "";
  };

  const formatResult = (r: NominatimCity) => {
    const city = getCityName(r);
    const state = getStateName(r);
    return state ? `${city} - ${state}` : city;
  };

  const handleSelect = async (r: NominatimCity) => {
    const cityName = getCityName(r);
    const state = getStateName(r);
    setQuery(`${cityName} - ${state}`);
    setIsOpen(false);

    // Check if city exists in our DB
    const { data: dbCities } = await supabase
      .from("cities")
      .select("id, name")
      .eq("is_active", true);

    const match = dbCities?.find(
      (c) => c.name.toLowerCase() === cityName.toLowerCase()
    );

    onSelect({
      cityName,
      state,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      cityId: match?.id,
    });
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-48 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              className="w-full px-3 py-2.5 text-left text-sm hover:bg-accent transition-colors border-b last:border-0"
              onClick={() => handleSelect(r)}
            >
              {formatResult(r)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
