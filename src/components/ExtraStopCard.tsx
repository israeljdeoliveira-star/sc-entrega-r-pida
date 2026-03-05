import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, X, MapPin, GripVertical } from "lucide-react";
import AddressAutocomplete, { type AddressSelection } from "@/components/AddressAutocomplete";
import type { Tables } from "@/integrations/supabase/types";

type City = Tables<"cities">;

export type RoutePointType = "origin" | "stop" | "destination";

export interface ExtraStop {
  id: string;
  cityName: string;
  cityState: string;
  address: AddressSelection | null;
  reference: string;
  manualOrder: number;
}

export function createExtraStop(order: number): ExtraStop {
  return {
    id: crypto.randomUUID(),
    cityName: "",
    cityState: "",
    address: null,
    reference: "",
    manualOrder: order,
  };
}

interface ExtraStopCardProps {
  stop: ExtraStop;
  index: number;
  total: number;
  cities: City[];
  onUpdate: (id: string, updates: Partial<ExtraStop>) => void;
  onRemove: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDragStart?: (id: string) => void;
  onDragOver?: (id: string) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  isDragOver?: boolean;
  label?: string;
  pointType?: RoutePointType;
}

export default function ExtraStopCard({
  stop,
  index,
  total,
  cities,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  isDragOver,
  label,
  pointType = "stop",
}: ExtraStopCardProps) {
  const handleCityChange = useCallback((cityName: string) => {
    onUpdate(stop.id, { cityName, cityState: "SC", address: null });
  }, [stop.id, onUpdate]);

  const handleAddressSelect = useCallback((sel: AddressSelection) => {
    onUpdate(stop.id, { address: sel });
  }, [stop.id, onUpdate]);

  const handleRefChange = useCallback((ref: string) => {
    onUpdate(stop.id, { reference: ref });
  }, [stop.id, onUpdate]);

  const isRemovable = pointType === "stop";

  return (
    <div
      className={`space-y-2 rounded-lg border p-3 bg-background transition-all ${
        isDragging ? "opacity-50 scale-95" : ""
      } ${isDragOver ? "border-primary ring-1 ring-primary/30" : ""}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.(stop.id);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOver?.(stop.id);
      }}
      onDragEnd={() => onDragEnd?.()}
      onDrop={(e) => {
        e.preventDefault();
        onDragEnd?.();
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
          <Badge variant="secondary" className="text-xs font-semibold">
            {label ? (
              <><span className="inline-flex items-center justify-center h-4 w-4 rounded-full text-[10px] font-bold text-white mr-1.5" style={{ background: "hsl(217, 91%, 60%)" }}>{label}</span> Parada</>
            ) : (
              <><MapPin className="h-3 w-3 mr-1" /> Parada {index + 1}</>
            )}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={index === 0}
            onClick={() => onMoveUp(stop.id)}
            title="Subir"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={index === total - 1}
            onClick={() => onMoveDown(stop.id)}
            title="Descer"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          {isRemovable && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onRemove(stop.id)}
              title="Remover parada"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* City selector */}
      <div className="space-y-1">
        <Label className="text-xs">Cidade</Label>
        <Select value={stop.cityName} onValueChange={handleCityChange}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Selecione a cidade" />
          </SelectTrigger>
          <SelectContent>
            {cities.map(c => (
              <SelectItem key={c.id} value={c.name}>{c.name} - {c.state}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Address */}
      <div className="space-y-1">
        <Label className="text-xs">Rua + Número</Label>
        <AddressAutocomplete
          placeholder={stop.cityName ? `Endereço em ${stop.cityName}` : "Selecione a cidade primeiro"}
          cityName={stop.cityName}
          disabled={!stop.cityName}
          onSelect={handleAddressSelect}
        />
      </div>

      {/* Reference */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Referência (opcional)</Label>
        <Input
          value={stop.reference}
          onChange={e => handleRefChange(e.target.value)}
          placeholder="Ex: Portão azul..."
          className="text-sm h-9"
        />
      </div>
    </div>
  );
}
