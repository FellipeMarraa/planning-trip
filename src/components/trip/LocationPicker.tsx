// src/components/trip/LocationPicker.tsx
import { useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchAddress, reverseGeocode, type AddressResult } from '@/lib/geocoding';
import { MapAutoResize } from './MapAutoResize';

export interface LocationValue {
    location: string;
    coordinates?: { lat: number; lng: number };
}

interface LocationPickerProps {
    value: LocationValue;
    onChange: (next: LocationValue) => void;
}

const WORLD_VIEW_CENTER: [number, number] = [20, 0];
const WORLD_VIEW_ZOOM = 2;
const PIN_ZOOM = 14;

function ClickToPin({ onPick }: { onPick: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onPick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

export function LocationPicker({ value, onChange }: LocationPickerProps) {
    const [mode, setMode] = useState<'search' | 'map'>('search');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<AddressResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [reverseLoading, setReverseLoading] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!query.trim()) {
            setResults([]);
            return;
        }
        setSearching(true);
        debounceRef.current = setTimeout(async () => {
            const found = await searchAddress(query);
            setResults(found);
            setSearching(false);
        }, 600);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query]);

    const handlePickResult = (result: AddressResult) => {
        onChange({ location: result.label, coordinates: { lat: result.lat, lng: result.lng } });
        setResults([]);
        setQuery('');
    };

    const handleRemoveLocation = () => {
        onChange({ location: value.location, coordinates: undefined });
    };

    const handleMapPick = async (lat: number, lng: number) => {
        onChange({ location: value.location, coordinates: { lat, lng } });
        setReverseLoading(true);
        const label = await reverseGeocode(lat, lng);
        setReverseLoading(false);
        onChange({ location: label || `${lat.toFixed(5)}, ${lng.toFixed(5)}`, coordinates: { lat, lng } });
    };

    const mapCenter: [number, number] = value.coordinates
        ? [value.coordinates.lat, value.coordinates.lng]
        : WORLD_VIEW_CENTER;
    const mapZoom = value.coordinates ? PIN_ZOOM : WORLD_VIEW_ZOOM;

    return (
        <div className="space-y-3">
            <Input
                placeholder="Nome do local ou atração"
                className="h-10"
                value={value.location}
                onChange={(e) => onChange({ location: e.target.value, coordinates: value.coordinates })}
                required
            />

            <div className="flex gap-2">
                <Button
                    type="button"
                    size="sm"
                    variant={mode === 'search' ? 'default' : 'outline'}
                    onClick={() => setMode('search')}
                    className="flex-1 h-8 text-xs gap-1.5"
                >
                    <Search className="w-3 h-3" /> Buscar endereço
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant={mode === 'map' ? 'default' : 'outline'}
                    onClick={() => setMode('map')}
                    className="flex-1 h-8 text-xs gap-1.5"
                >
                    <MapPin className="w-3 h-3" /> Marcar no mapa
                </Button>
            </div>

            {value.coordinates && (
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-primary" /> Localização marcada no mapa
                    </span>
                    <button
                        type="button"
                        onClick={handleRemoveLocation}
                        className="text-xs text-destructive hover:underline flex items-center gap-1 shrink-0"
                    >
                        <X className="w-3 h-3" /> Remover
                    </button>
                </div>
            )}

            {mode === 'search' ? (
                <div className="space-y-2">
                    <div className="relative">
                        <Input
                            placeholder="Digite um endereço ou nome de lugar..."
                            className="h-9 text-sm pr-8"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        {searching && <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />}
                    </div>
                    {results.length > 0 && (
                        <div className="border border-border rounded-xl overflow-hidden divide-y divide-border max-h-40 overflow-y-auto">
                            {results.map((r, i) => (
                                <button
                                    key={`${r.lat}-${r.lng}-${i}`}
                                    type="button"
                                    onClick={() => handlePickResult(r)}
                                    className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-muted/60 transition-colors truncate"
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className={cn("rounded-xl overflow-hidden border border-border relative", reverseLoading && "opacity-70")}>
                    <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: 220, width: '100%' }} scrollWheelZoom={false}>
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <MapAutoResize />
                        <ClickToPin onPick={handleMapPick} />
                        {value.coordinates && <Marker position={[value.coordinates.lat, value.coordinates.lng]} />}
                    </MapContainer>
                    {reverseLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
