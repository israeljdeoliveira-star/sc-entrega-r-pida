import { useState, useRef, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    house_number?: string;
    suburb?: string;
    neighbourhood?: string;
    city_district?: string;
  };
}

export interface AddressSelection {
  street: string;
  houseNumber: string;
  neighborhood: string;
  lat: number;
  lng: number;
  displayText: string;
}

interface AddressAutocompleteProps {
  cityName: string;
  state?: string;
  placeholder?: string;
  disabled?: boolean;
  value?: string;
  onSelect: (selection: AddressSelection) => void;
}

function extractNumberFromInput(input: string): string {
  const match = input.match(/,\s*(\d+)/);
  return match ? match[1] : "";
}

function getNeighborhood(r: NominatimResult): string {
  if (r.address?.suburb) return r.address.suburb;
  if (r.address?.neighbourhood) return r.address.neighbourhood;
  if (r.address?.city_district) return r.address.city_district;
  // fallback: try 2nd segment of display_name
  const parts = r.display_name.split(",").map((s) => s.trim());
  return parts[1] || "";
}

export default function AddressAutocomplete({
  cityName,
  state = "SC",
  placeholder = "Digite o nome da rua...",
  disabled = false,
  value,
  onSelect,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("");
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

  const search = useCallback(
    (q: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (q.length < 3 || !cityName) {
        setResults([]);
        setIsOpen(false);
        return;
      }
      timerRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const params = new URLSearchParams({
            q: `${q}, ${cityName}, ${state}, Brazil`,
            format: "json",
            addressdetails: "1",
            limit: "6",
            countrycodes: "br",
          });
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?${params}`,
            { headers: { "User-Agent": "FreteGarca/1.0" } }
          );
          const data: NominatimResult[] = await res.json();
          const filtered = data.filter((r) => {
            const dn = r.display_name.toLowerCase();
            return dn.includes(cityName.toLowerCase());
          });
          setResults(filtered);
          setIsOpen(filtered.length > 0);
        } catch {
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, 800);
    },
    [cityName, state]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    setSelectedNeighborhood("");
    search(v);
  };

  const formatResult = (r: NominatimResult) => {
    const road = r.address?.road || "";
    const number = r.address?.house_number || extractNumberFromInput(query);
    const neighborhood = getNeighborhood(r);

    let text = road || r.display_name.split(",")[0];
    if (number) text += `, ${number}`;
    if (neighborhood) text += ` - ${neighborhood}`;
    return text;
  };

  const handleSelect = (r: NominatimResult) => {
    const street = r.address?.road || r.display_name.split(",")[0];
    const houseNumber = r.address?.house_number || extractNumberFromInput(query);
    const neighborhood = getNeighborhood(r);
    const displayText = formatResult(r);

    setQuery(displayText);
    setIsOpen(false);
    setSelectedNeighborhood(neighborhood);

    onSelect({
      street,
      houseNumber,
      neighborhood,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      displayText,
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
      {selectedNeighborhood && (
        <div className="mt-1.5">
          <Badge variant="secondary" className="text-xs font-normal">
            📍 Bairro: {selectedNeighborhood}
          </Badge>
        </div>
      )}
    </div>
  );
}
