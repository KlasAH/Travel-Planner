
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Trip, TripItem, ItemType, SharedTripData } from '../types';
import { Layout, Button, Card, CategoryIcon, Input, Fab, DateInput, TimeInput } from '../components/Shared';
import { Plus, Trash2, Calendar, MapPin, Clock, DollarSign, Check, Wand2, Tag, AlignLeft, Hash, Plane, Key, Home, Car, X, Link as LinkIcon, ExternalLink, ArrowRight, Globe, ChevronRight, Share2, Copy, ImageIcon, AlertTriangle, Upload, Map } from 'lucide-react';
import { generateItinerary, Suggestion } from '../services/geminiService';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { feature } from 'topojson-client';
import { geoBounds, geoCentroid } from 'd3-geo';

// Highcharts World Map (TopoJSON) - Reliable CDN
const GEO_URL = "https://code.highcharts.com/mapdata/custom/world.topo.json";

// Colorful Palette for Countries
const MAP_PALETTE = [
  "#FCA5A5", // Red 300
  "#FDBA74", // Orange 300
  "#FCD34D", // Amber 300
  "#BEF264", // Lime 300
  "#86EFAC", // Green 300
  "#67E8F9", // Cyan 300
  "#93C5FD", // Blue 300
  "#C4B5FD", // Violet 300
  "#F0ABFC", // Fuchsia 300
  "#FDA4AF", // Rose 300
  "#CBD5E1", // Slate 300
  "#A5B4FC", // Indigo 300
  "#5EEAD4", // Teal 300
];

const getCountryColor = (name: string) => {
  if (!name) return "#E2E8F0"; // Default slate-200
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return MAP_PALETTE[Math.abs(hash) % MAP_PALETTE.length];
};

// Helper to get array of dates between start and end (UTC Safe)
const getDaysArray = (start: string, end: string) => {
  const arr = [];
  const [sy, sm, sd] = start.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  
  const dt = new Date(Date.UTC(sy, sm - 1, sd));
  const endDt = new Date(Date.UTC(ey, em - 1, ed));

  while (dt <= endDt) {
    const iso = dt.toISOString().split('T')[0];
    arr.push(iso);
    dt.setUTCDate(dt.getUTCDate() + 1);
  }
  return arr;
};

// --- Country Zoom Map Component ---
const CountryFocusMap = ({ countryName }: { countryName: string }) => {
  const [geoData, setGeoData] = useState<any>(null);
  const [mapConfig, setMapConfig] = useState({ center: [0, 0] as [number, number], zoom: 1 });

  useEffect(() => {
    fetch(GEO_URL)
      .then(res => res.json())
      .then(data => {
        setGeoData(data);
        
        // Calculate Zoom and Center logic
        if (data && countryName) {
            const world = feature(data, data.objects.default);
            // Loose matching for country name
            const countryFeature = world.features.find((f: any) => {
                const name = f.properties.name || f.properties["hc-a2"];
                return name && (name === countryName || countryName.includes(name) || name.includes(countryName));
            });

            if (countryFeature) {
                const centroid = geoCentroid(countryFeature);
                const bounds = geoBounds(countryFeature); // [[x0, y0], [x1, y1]]
                
                const dx = bounds[1][0] - bounds[0][0];
                const dy = bounds[1][1] - bounds[0][1];
                const maxDim = Math.max(dx, dy);
                
                // Heuristic zoom calculation
                // Base 360 deg width. 
                // Zoom 1 shows ~360 deg. Zoom 2 shows ~180.
                // We want to show 'maxDim' degrees with some padding (multiply by 1.5 for padding).
                // But ComposableMap logic is different.
                // Standard formula: scale = 0.9 / Math.max(dx / width, dy / height)
                // In react-simple-maps ZoomableGroup:
                // Let's approximate.
                
                let zoom = 1;
                if (maxDim > 0) {
                    zoom = 300 / Math.max(maxDim, 5); // 300 is a magic number for "good fit" in this container
                    // Cap max zoom for tiny islands to avoid pixelation/empty screen
                    if (zoom > 50) zoom = 50; 
                    if (zoom < 1) zoom = 1;
                }

                setMapConfig({ center: centroid as [number, number], zoom });
            }
        }
      });
  }, [countryName]);

  return (
    <div className="w-full h-full bg-slate-900 relative overflow-hidden rounded-[2.5rem]">
        {/* Decorative Grid */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        
        <ComposableMap projection="geoMercator" projectionConfig={{ scale: 100 }} style={{ width: "100%", height: "100%" }}>
            <ZoomableGroup center={mapConfig.center} zoom={mapConfig.zoom} minZoom={1} maxZoom={100}>
                {geoData && <Geographies geography={geoData}>
                    {({ geographies }) =>
                    geographies.map((geo) => {
                        const name = geo.properties.name || geo.properties["hc-a2"];
                        const isTarget = name && countryName && (name === countryName || countryName.includes(name) || name.includes(countryName));
                        
                        // Only render target country nicely, fade others out completely or ghost them
                        if (!isTarget) return null; // Don't render others for clean "blueprint" look

                        return (
                        <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={getCountryColor(name)}
                            stroke="#ffffff"
                            strokeWidth={0.5}
                            style={{
                                default: { outline: "none", filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.5))" },
                                hover: { outline: "none" },
                                pressed: { outline: "none" },
                            }}
                        />
                        );
                    })
                    }
                </Geographies>}
            </ZoomableGroup>
        </ComposableMap>
        
        {/* Overlay Label */}
        <div className="absolute bottom-6 right-8 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
            <span className="text-white font-mono text-xs uppercase tracking-widest">
                MAP_VIEW: {countryName.toUpperCase().slice(0, 12)}...
            </span>
        </div>
    </div>
  );
};

// --- Add Item Modal ---
const AddItemModal = ({ tripId, isOpen, onClose, date, initialType = 'activity' }: { tripId: number, isOpen: boolean, onClose: () => void, date?: string, initialType?: ItemType }) => {
  const [formData, setFormData] = useState<Partial<TripItem>>({
    type: initialType,
    date: date || new Date().toISOString().split('T')[0],
    endDate: date || new Date().toISOString().split('T')[0], // Default end date same as start
    title: '',
    details: '',
    location: '',
    startTime: '09:00',
    bookingRef: '',
    bookingLink: '',
    cost: undefined,
    imageUrl: '',
  });

  // State for multiple flight segments
  const [flightSegments, setFlightSegments] = useState<Partial<TripItem>[]>([]);

  useEffect(() => {
    if (isOpen) {
        const d = date || new Date().toISOString().split('T')[0];
        setFormData(prev => ({ 
          ...prev, 
          type: initialType,
          date: d,
          endDate: d,
          // Reset specific fields when opening
          title: '', details: '', location: '', bookingRef: '', bookingLink: '',
          departureAirport: '', arrivalAirport: '', pickupLocation: '', dropoffLocation: '',
          cost: undefined,
          imageUrl: ''
        }));
        setFlightSegments([]);
    }
  }, [isOpen, date, initialType]);

  const handleStartDateChange = (val: string) => {
    // Automatically set end date to the same day when start date changes
    setFormData(prev => ({
        ...prev,
        date: val,
        endDate: val 
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      // Create an image element to resize it (prevent huge files in IndexedDB)
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const MAX_WIDTH = 800; // Resize to max 800px width
        const scaleSize = MAX_WIDTH / img.width;
        
        // Calculate new dimensions
        if (img.width > MAX_WIDTH) {
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
        } else {
            canvas.width = img.width;
            canvas.height = img.height;
        }

        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // 70% quality JPEG
        setFormData(prev => ({ ...prev, imageUrl: dataUrl }));
      };
      if (event.target?.result) {
          img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddFlightSegment = () => {
      if (!formData.date) return;

      const segment = { ...formData };
      if (!segment.title) {
          segment.title = `Flight ${segment.departureAirport || ''} -> ${segment.arrivalAirport || ''}`;
      }
      
      // Default endDate to startDate if missing, for logic purposes
      if (!segment.endDate) segment.endDate = segment.date;

      setFlightSegments([...flightSegments, segment]);

      // Reset for next segment
      setFormData(prev => ({
          ...prev,
          title: '',
          // Auto-fill next departure with previous arrival
          departureAirport: prev.arrivalAirport || '', 
          arrivalAirport: '',
          // Auto-fill next date with previous arrival date
          date: prev.endDate || prev.date,
          endDate: prev.endDate || prev.date, // Auto set next end date too
          startTime: '',
          endTime: '',
          // Keep bookingRef
      }));
  };

  const removeSegment = (index: number) => {
      setFlightSegments(flightSegments.filter((_, i) => i !== index));
  };

  const fetchImage = (item: Partial<TripItem>) => {
      // Prioritize user provided URL/Upload
      if (item.imageUrl && item.imageUrl.trim() !== '') return item.imageUrl;

      const loc = item.location || item.pickupLocation || '';
      const seed = `${item.title} ${loc} ${item.type}`;
      return `https://picsum.photos/seed/${encodeURIComponent(seed)}/300/300`;
  };

  const saveItem = async () => {
    // Determine items to save
    const itemsToSave: Partial<TripItem>[] = [];

    if (formData.type === 'flight') {
        // Add already added segments
        itemsToSave.push(...flightSegments);
        
        // Add current form if it has minimal data
        if (formData.date && (formData.departureAirport || formData.arrivalAirport || formData.title)) {
             let finalTitle = formData.title;
             if (!finalTitle) finalTitle = `Flight ${formData.departureAirport || ''} -> ${formData.arrivalAirport || ''}`;
             itemsToSave.push({ ...formData, title: finalTitle });
        }
    } else {
        // Single item types
         if (!formData.title || !formData.date) return false;
         let finalTitle = formData.title;
         itemsToSave.push({ ...formData, title: finalTitle });
    }

    if (itemsToSave.length === 0) return false;

    const totalCost = formData.cost ? Number(formData.cost) : undefined;
    
    await (db as any).transaction('rw', db.items, async () => {
        for (const [index, item] of itemsToSave.entries()) {
            // Assign total cost to the first item (e.g. main booking)
            const itemCost = index === 0 ? totalCost : 0;
            const imageUrl = fetchImage(item);
            
            await db.items.add({
                tripId,
                type: formData.type as ItemType,
                title: item.title || 'Untitled',
                date: item.date || new Date().toISOString().split('T')[0],
                endDate: item.endDate,
                details: item.details,
                startTime: item.startTime,
                endTime: item.endTime,
                location: item.location,
                cost: itemCost,
                completed: false,
                bookingRef: item.bookingRef, 
                bookingLink: item.bookingLink,
                imageUrl: imageUrl,
                departureAirport: item.departureAirport,
                arrivalAirport: item.arrivalAirport,
                duration: item.duration,
                pickupLocation: item.pickupLocation,
                dropoffLocation: item.dropoffLocation
            });
        }
    });

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(await saveItem()) {
       onClose();
       setFlightSegments([]);
       resetForm();
    }
  };
  
  const handleSaveAndAddAnother = async (e: React.MouseEvent) => {
    e.preventDefault();
    if(await saveItem()) {
        resetForm();
        setFlightSegments([]);
    }
  };

  const resetForm = () => {
    setFormData({ 
        type: formData.type, 
        date: date || new Date().toISOString().split('T')[0], 
        title: '', 
        startTime: '09:00', 
        location: '', 
        details: '',
        bookingRef: '',
        bookingLink: '',
        cost: undefined,
        departureAirport: '',
        arrivalAirport: '',
        endDate: '',
        imageUrl: ''
    });
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl max-w-lg w-full p-8 animate-in fade-in zoom-in duration-200 border-[6px] border-slate-100 dark:border-slate-700 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <h3 className="text-2xl font-black mb-6 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <span className="text-brand-500">Add Item</span>
        </h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-4 gap-2 p-2 bg-slate-100 dark:bg-slate-700/50 rounded-2xl border-2 border-slate-200 dark:border-slate-700">
             {(['flight', 'car', 'stay', 'activity'] as ItemType[]).map(t => (
               <button
                 type="button"
                 key={t}
                 onClick={() => { setFormData({...formData, type: t, title: ''}); setFlightSegments([]); }}
                 className={`py-3 text-xs sm:text-sm font-bold rounded-xl capitalize transition-all duration-200 flex flex-col items-center gap-1 ${
                    formData.type === t 
                    ? 'bg-white dark:bg-slate-600 shadow-md text-brand-600 dark:text-white scale-100 ring-2 ring-brand-200 dark:ring-brand-900' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                 }`}
               >
                 <CategoryIcon type={t} className="w-5 h-5" />
                 {t}
               </button>
             ))}
          </div>

          {/* DYNAMIC FORM FIELDS */}
          
          {/* FLIGHT FIELDS */}
          {formData.type === 'flight' && (
             <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                {/* Segments List */}
                {flightSegments.length > 0 && (
                    <div className="space-y-2 mb-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border-2 border-slate-100 dark:border-slate-700">
                        <label className="text-xs font-black uppercase text-slate-400 pl-1 mb-2 block">Planned Segments</label>
                        {flightSegments.map((seg, i) => (
                            <div key={i} className="flex items-center justify-between p-3 mb-2 bg-white dark:bg-slate-700 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600">
                                <div className="flex-1">
                                    <div className="text-sm font-bold dark:text-white flex items-center gap-2">
                                        <span className="text-brand-600 dark:text-brand-400">{seg.departureAirport}</span>
                                        <ArrowRight className="w-3 h-3 text-slate-400" />
                                        <span className="text-brand-600 dark:text-brand-400">{seg.arrivalAirport}</span>
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                        {seg.date} {seg.startTime} — {seg.endDate ? seg.endDate : seg.date} {seg.endTime}
                                    </div>
                                </div>
                                <button type="button" onClick={() => removeSegment(i)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <Input 
                    label="Airline / Flight No." 
                    placeholder="e.g. BA249" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})} 
                    icon={Plane}
                />
                <Input 
                    label="Booking Reference" 
                    placeholder="PNR / Ticket #" 
                    value={formData.bookingRef} 
                    onChange={e => setFormData({...formData, bookingRef: e.target.value})} 
                    icon={Hash}
                    iconColor="slate"
                />
                
                {/* Departure Group */}
                <div className="space-y-3">
                    <DateInput 
                        label="Departure Date" 
                        value={formData.date || ''} 
                        onChange={handleStartDateChange} 
                        required
                        icon={Calendar}
                        iconColor="green"
                    />
                    <TimeInput 
                        label="Dep. Time" 
                        value={formData.startTime || '09:00'} 
                        onChange={val => setFormData({...formData, startTime: val})} 
                        icon={Clock}
                    />
                    <Input 
                        label="Departure Airport" 
                        placeholder="e.g. LHR" 
                        value={formData.departureAirport} 
                        onChange={e => setFormData({...formData, departureAirport: e.target.value})} 
                        icon={MapPin}
                        iconColor="red"
                    />
                </div>
                
                <div className="border-t-2 border-dashed border-slate-200 dark:border-slate-700 my-4 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 p-1 rounded-full text-slate-300">
                        <Plane className="w-4 h-4 rotate-90" />
                    </div>
                </div>

                {/* Arrival Group */}
                <div className="space-y-3">
                     <DateInput 
                        label="Arrival Date (Optional)" 
                        placeholder="Same as departure"
                        value={formData.endDate || ''} 
                        onChange={val => setFormData({...formData, endDate: val})} 
                        icon={Calendar}
                        iconColor="purple"
                    />
                     <TimeInput 
                        label="Arr. Time" 
                        value={formData.endTime || '12:00'} 
                        onChange={val => setFormData({...formData, endTime: val})} 
                        icon={Clock}
                        iconColor="purple"
                    />
                     <Input 
                        label="Arrival Airport" 
                        placeholder="e.g. JFK" 
                        value={formData.arrivalAirport} 
                        onChange={e => setFormData({...formData, arrivalAirport: e.target.value})} 
                        icon={MapPin}
                        iconColor="red"
                    />
                </div>

                <Button type="button" variant="secondary" onClick={handleAddFlightSegment} className="w-full mt-4 border-dashed border-2 border-brand-200 dark:border-slate-600 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-slate-700">
                    <Plus className="w-5 h-5 mr-2" /> Add Next Flight Leg
                </Button>
             </div>
          )}

          {/* CAR RENTAL FIELDS */}
          {formData.type === 'car' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <Input 
                    label="Rental Company" 
                    placeholder="e.g. Hertz, Avis" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})} 
                    icon={Car}
                    iconColor="orange"
                  />
                  
                  <Input 
                    label="Booking Ref" 
                    placeholder="Reservation #" 
                    value={formData.bookingRef} 
                    onChange={e => setFormData({...formData, bookingRef: e.target.value})} 
                    icon={Hash}
                    iconColor="slate"
                  />
                  
                  <Input 
                    label="Booking Site Link" 
                    placeholder="https://rental.com/..." 
                    value={formData.bookingLink} 
                    onChange={e => setFormData({...formData, bookingLink: e.target.value})} 
                    icon={LinkIcon}
                    iconColor="green"
                  />
                  
                  {/* Pickup Section */}
                  <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl space-y-4 border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
                          <MapPin className="w-4 h-4" />
                          <span className="text-xs font-black uppercase tracking-wider">Pick-up Details</span>
                      </div>
                      
                      <div className="space-y-3">
                         <DateInput 
                            label="Pick-up Date"
                            value={formData.date || ''} 
                            onChange={handleStartDateChange} 
                            required
                            icon={Calendar}
                            iconColor="blue"
                        />
                         <TimeInput 
                            label="Pick-up Time"
                            value={formData.startTime || '09:00'} 
                            onChange={val => setFormData({...formData, startTime: val})} 
                            icon={Clock}
                            iconColor="blue"
                        />
                      </div>
                      <Input 
                        label="Pick-up Location"
                        placeholder="e.g. LAX Terminal 4"
                        value={formData.pickupLocation}
                        onChange={e => setFormData({...formData, pickupLocation: e.target.value})}
                        icon={MapPin}
                        iconColor="blue"
                      />
                  </div>

                  {/* Dropoff Section */}
                  <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl space-y-4 border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                          <MapPin className="w-4 h-4" />
                          <span className="text-xs font-black uppercase tracking-wider">Drop-off Details</span>
                      </div>

                      <div className="space-y-3">
                         <DateInput 
                            label="Drop-off Date"
                            value={formData.endDate || ''} 
                            onChange={val => setFormData({...formData, endDate: val})} 
                            placeholder="Drop date"
                            icon={Calendar}
                            iconColor="orange"
                        />
                         <TimeInput 
                            label="Drop-off Time"
                            value={formData.endTime || '09:00'} 
                            onChange={val => setFormData({...formData, endTime: val})} 
                            icon={Clock}
                            iconColor="orange"
                        />
                      </div>
                      <Input 
                        label="Drop-off Location"
                        placeholder="e.g. Same as pick-up"
                        value={formData.dropoffLocation}
                        onChange={e => setFormData({...formData, dropoffLocation: e.target.value})}
                        icon={MapPin}
                        iconColor="orange"
                      />
                  </div>
              </div>
          )}

          {/* STAY FIELDS */}
          {formData.type === 'stay' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                   <Input 
                    label="Hotel / Place Name" 
                    placeholder="e.g. The Ritz" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})} 
                    icon={Home}
                    iconColor="blue"
                  />
                  <Input 
                    label="Address" 
                    value={formData.location} 
                    onChange={e => setFormData({...formData, location: e.target.value})} 
                    icon={MapPin}
                    iconColor="red"
                  />
                  <Input 
                    label="Booking Site Link" 
                    placeholder="https://booking.com/..." 
                    value={formData.bookingLink} 
                    onChange={e => setFormData({...formData, bookingLink: e.target.value})} 
                    icon={LinkIcon}
                    iconColor="green"
                  />
                  
                  <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-slate-400">Check-in</label>
                        <DateInput 
                            value={formData.date || ''} 
                            onChange={handleStartDateChange} 
                            required
                            icon={Calendar}
                        />
                        <TimeInput 
                            value={formData.startTime || '15:00'}
                            onChange={val => setFormData({...formData, startTime: val})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-slate-400">Check-out</label>
                        <DateInput 
                            value={formData.endDate || ''} 
                            onChange={val => setFormData({...formData, endDate: val})} 
                            icon={Calendar}
                            iconColor="red"
                        />
                        <TimeInput 
                            value={formData.endTime || '11:00'}
                            onChange={val => setFormData({...formData, endTime: val})}
                        />
                      </div>
                  </div>
                  
                  <Input 
                    label="Info / Notes" 
                    placeholder="Room type, access codes..." 
                    value={formData.details} 
                    onChange={e => setFormData({...formData, details: e.target.value})} 
                    icon={AlignLeft}
                    iconColor="slate"
                    multiline
                  />
              </div>
          )}

          {/* ACTIVITY (Default) FIELDS */}
          {formData.type === 'activity' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                 <Input 
                    label="Title" 
                    placeholder="What are we doing?" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})} 
                    required
                    icon={Tag}
                    iconColor="blue"
                 />
                 <div className="space-y-3">
                    <DateInput 
                        label="Date" 
                        value={formData.date || ''} 
                        onChange={handleStartDateChange} 
                        required
                        icon={Calendar}
                        iconColor="green"
                    />
                    <TimeInput 
                        label="Time" 
                        value={formData.startTime || '09:00'} 
                        onChange={val => setFormData({...formData, startTime: val})} 
                        icon={Clock}
                        iconColor="purple"
                    />
                 </div>
                 <Input 
                    label="Location" 
                    placeholder="Where is it?" 
                    value={formData.location} 
                    onChange={e => setFormData({...formData, location: e.target.value})}
                    icon={MapPin}
                    iconColor="red" 
                 />
                  <Input 
                    label="Notes" 
                    placeholder="Details..." 
                    value={formData.details} 
                    onChange={e => setFormData({...formData, details: e.target.value})}
                    icon={AlignLeft}
                    iconColor="orange"
                    multiline
                  />
              </div>
          )}
          
          {/* COMMON FIELDS (Cost + Image) */}
          <div className="mt-8 pt-4 border-t-2 border-slate-100 dark:border-slate-700 space-y-4">
             <Input 
                label="Total Cost" 
                type="number" 
                placeholder="0.00" 
                value={formData.cost} 
                onChange={e => setFormData({...formData, cost: parseFloat(e.target.value)})}
                icon={DollarSign}
                iconColor="green"
            />
             
             {/* Image Upload Replacement */}
             <div className="w-full">
                <label className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest pl-2">Photo / Ticket</label>
                <div className="flex items-center gap-3">
                   <div className="w-[4.5rem] h-[4.5rem] shrink-0 flex items-center justify-center rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 shadow-pink-500/50 border-b-[6px] border-pink-600 text-white">
                      <ImageIcon className="w-8 h-8 drop-shadow-md" strokeWidth={3} />
                   </div>
                   <div className="flex-1 relative h-[4.5rem]">
                      <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 rounded-2xl border-[3px] border-slate-300 dark:border-slate-700 shadow-inner flex items-center px-5">
                          <span className="text-slate-400 font-bold truncate">
                              {formData.imageUrl ? 'Image Selected (Ready to Save)' : 'Tap to upload image...'}
                          </span>
                      </div>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                   </div>
                </div>
                {formData.imageUrl && (
                    <div className="mt-2 ml-[5.25rem]">
                        <img src={formData.imageUrl} alt="Preview" className="h-20 w-auto rounded-lg border-2 border-white shadow-md object-cover" />
                    </div>
                )}
             </div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <Button type="submit" size="lg" className="w-full">
                {flightSegments.length > 0 ? `Save ${flightSegments.length + 1} Flights` : 'Save Item'}
            </Button>
            <div className="flex gap-3">
                 <Button type="button" variant="secondary" onClick={handleSaveAndAddAnother} className="flex-1">Save & Add Another</Button>
                 <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- TripItemCard Component ---
const TripItemCard: React.FC<{ item: TripItem }> = ({ item }) => {

  const formatTime = (time?: string) => {
    if (!time) return '';
    const [h, m] = time.split(':');
    const d = new Date();
    d.setHours(parseInt(h), parseInt(m));
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const getIconColor = (type: string) => {
    switch (type) {
        case 'flight': return 'text-sky-500 bg-sky-100 dark:bg-sky-900/30 dark:text-sky-400';
        case 'stay': return 'text-purple-500 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400';
        case 'car': return 'text-orange-500 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400';
        default: return 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400';
    }
  }

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `
Trip: ${item.title}
When: ${item.date} ${item.startTime || ''}
Location: ${item.location || item.departureAirport || ''}
Booking: ${item.bookingRef || 'N/A'}
Details: ${item.details || ''}
    `.trim();
    navigator.clipboard.writeText(text);
    alert("Trip details copied!");
  };

  return (
    <Card className={`flex flex-col h-full group overflow-visible ${item.type === 'car' ? 'border-orange-200 dark:border-orange-900/50' : ''}`}>
       
       {/* 1. HEADER (Title, Time, Actions) */}
       <div className="p-5 flex flex-col space-y-2 bg-white dark:bg-slate-800 border-b-2 border-slate-50 dark:border-slate-700 relative z-20 rounded-t-[1.8rem]">
           <div className="flex justify-between items-start">
               <div className="flex flex-col pr-4">
                   <h4 className="text-xl font-black text-slate-800 dark:text-white leading-tight">{item.title}</h4>
                   {(item.startTime || item.endTime) && (
                       <div className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">
                           <Clock className="w-4 h-4 text-brand-500" />
                           <span>{formatTime(item.startTime)} {item.endTime ? `- ${formatTime(item.endTime)}` : ''}</span>
                       </div>
                   )}
               </div>
               <div className="flex items-center gap-1 shrink-0">
                  <button onClick={handleCopy} className="p-2 text-slate-300 hover:text-brand-500 transition-colors bg-slate-50 dark:bg-slate-700 rounded-lg" title="Copy Details">
                      <Copy className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        if(confirm('Delete item?')) {
                            db.items.delete(item.id!);
                        } 
                    }}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors bg-slate-50 dark:bg-slate-700 rounded-lg"
                  >
                      <Trash2 className="w-4 h-4" />
                  </button>
               </div>
           </div>
       </div>

       {/* 2. IMAGE SECTION (Below Text) */}
       <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-900 z-10">
           <img src={item.imageUrl || `https://picsum.photos/seed/${item.title}/400/300`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90 group-hover:opacity-100" alt={item.title} />
           <div className="absolute top-4 left-4">
               <div className={`p-3 rounded-xl shadow-lg backdrop-blur-md font-bold ${getIconColor(item.type)}`}>
                   <CategoryIcon type={item.type} className="w-6 h-6" />
               </div>
           </div>
           {item.cost && (
               <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-white font-black text-sm flex items-center gap-1">
                   <DollarSign className="w-3 h-3 text-green-400" /> {item.cost}
               </div>
           )}
       </div>
       
       {/* 3. DETAILS BODY */}
       <div className="p-5 flex-1 flex flex-col space-y-4 bg-white dark:bg-slate-800 rounded-b-[1.8rem]">
           
           {/* Special Highlighting for Car Rentals */}
           {item.type === 'car' && (
               <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl border-2 border-orange-200 dark:border-orange-800 space-y-2 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-orange-200 to-transparent opacity-20 pointer-events-none rounded-bl-full"></div>
                   {item.bookingRef && (
                       <div className="flex items-center justify-between border-b border-orange-100 dark:border-orange-800/50 pb-2 mb-2">
                           <span className="text-xs font-black uppercase text-orange-600 dark:text-orange-400 tracking-wider">Ref #</span>
                           <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 px-2 py-0.5 rounded shadow-sm">{item.bookingRef}</span>
                       </div>
                   )}
                   {(item.pickupLocation || item.dropoffLocation) && (
                       <div className="text-xs font-bold text-slate-600 dark:text-slate-300 flex flex-col gap-2">
                           {item.pickupLocation && <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500"></div><span><span className="text-orange-500 opacity-75">PICKUP:</span> {item.pickupLocation}</span></div>}
                           {item.dropoffLocation && <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-300"></div><span><span className="text-orange-500 opacity-75">DROP:</span> {item.dropoffLocation}</span></div>}
                       </div>
                   )}
               </div>
           )}

           <div className="space-y-2">
               {/* Location */}
               {(item.location || item.departureAirport) && item.type !== 'car' && (
                   <div className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                       <MapPin className="w-4 h-4 text-brand-500" />
                       <span className="truncate">{item.location || `${item.departureAirport} -> ${item.arrivalAirport}`}</span>
                   </div>
               )}
               
               {/* Details truncated */}
               {item.details && (
                   <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 font-medium bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                       {item.details}
                   </p>
               )}
           </div>

           {/* Booking Ref / Link (General) */}
           {item.type !== 'car' && (item.bookingRef || item.bookingLink) && (
               <div className="pt-3 mt-auto flex items-center gap-2">
                   {item.bookingRef && (
                       <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-md text-xs font-mono font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                           #{item.bookingRef}
                       </span>
                   )}
                   {item.bookingLink && (
                       <a href={item.bookingLink} target="_blank" rel="noreferrer" className="ml-auto text-brand-500 hover:underline text-xs font-bold flex items-center gap-1">
                           Link <ExternalLink className="w-3 h-3" />
                       </a>
                   )}
               </div>
           )}
       </div>
    </Card>
  );
};

export const TripDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const tripId = parseInt(id || '0');
  const trip = useLiveQuery(() => db.trips.get(tripId));
  const items = useLiveQuery(() => db.items.where('tripId').equals(tripId).sortBy('date')); // Sort by date primarily
  const [activeTab, setActiveTab] = useState<'itinerary' | 'flight' | 'car' | 'stay' | 'activity'>('itinerary');
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedDateForAdd, setSelectedDateForAdd] = useState<string | undefined>(undefined);
  const [generating, setGenerating] = useState(false);
  const [isMapModalOpen, setMapModalOpen] = useState(false);
  
  // --- Notification Logic ---
  useEffect(() => {
    if (!items || items.length === 0) return;
    
    // Request permission on load
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }

    const checkUpcoming = () => {
        const now = new Date();
        items.forEach(item => {
            if (!item.date || !item.startTime) return;
            // Create item date object
            const itemTime = new Date(`${item.date}T${item.startTime}`);
            const diffMs = itemTime.getTime() - now.getTime();
            const diffMins = Math.floor(diffMs / 60000);

            // Alert if event is in exactly 60 minutes (or close enough in the interval)
            // Using a range (59-61) to catch it during interval checks
            if (diffMins >= 59 && diffMins <= 61) {
                if (Notification.permission === 'granted') {
                    new Notification(`Upcoming: ${item.title}`, {
                        body: `Starting in 1 hour at ${item.startTime}.`,
                        icon: '/favicon.ico'
                    });
                }
            }
        });
    };

    const interval = setInterval(checkUpcoming, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [items]);

  // Derive days
  const days = trip ? getDaysArray(trip.startDate, trip.endDate) : [];

  const handleShareTrip = async () => {
    if (!trip || !items) return;
    try {
        const shareData: SharedTripData = {
            trip,
            items,
            sharedAt: new Date().toISOString(),
            version: 1
        };
        
        const fileName = `trip-${trip.destination.toLowerCase().replace(/\s+/g, '-')}.json`;
        const jsonString = JSON.stringify(shareData, null, 2);
        
        // Try Native Share API first (Mobile/Tablets/Modern Desktops)
        if (navigator.share) {
            const file = new File([jsonString], fileName, { type: 'application/json' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: `Trip to ${trip.destination}`,
                    text: `Here is my travel plan for ${trip.destination}. Import this file into your Travel Planner app!`,
                    files: [file]
                });
                return;
            }
        }

        // Fallback to Download
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error(e);
        if ((e as Error).name !== 'AbortError') {
             alert("Could not share. Please try again or check browser permissions.");
        }
    }
  };

  const handleGenerateAI = async () => {
    if (!trip) return;
    setGenerating(true);
    try {
      // Use tags or legacy notes
      const interests = (trip.tags?.join(', ') || trip.notes) || 'General sightseeing';
      const suggestions = await generateItinerary(trip.destination, days.length, interests);
      
      // Bulk add suggestions
      await (db as any).transaction('rw', db.items, async () => {
        for (const dayData of suggestions) {
          const dateStr = days[dayData.day - 1];
          if (!dateStr) continue;
          
          const seed = `${dayData.activities[0].title} ${dayData.activities[0].location} activity`;
          const imageUrl = `https://picsum.photos/seed/${encodeURIComponent(seed)}/300/300`;

          for (const act of dayData.activities) {
            await db.items.add({
              tripId,
              type: 'activity',
              title: act.title,
              details: act.description,
              location: act.location,
              cost: act.estimatedCost,
              date: dateStr,
              startTime: act.timeOfDay === 'Morning' ? '09:00' : act.timeOfDay === 'Afternoon' ? '14:00' : '19:00',
              completed: false,
              imageUrl: imageUrl
            });
          }
        }
      });
    } catch (e) {
      alert("Could not generate itinerary. Check API Key or try again.");
    } finally {
      setGenerating(false);
    }
  };

  if (!trip) return <div className="p-12 text-center text-slate-500 dark:text-slate-400 font-bold text-xl">Loading trip...</div>;

  const filteredItems = activeTab === 'itinerary' ? items : items?.filter(i => i.type === activeTab);

  const modalDefaultType: ItemType = (activeTab !== 'itinerary') ? activeTab : 'activity';

  return (
    <Layout title={trip.title || trip.destination}>
      
      {/* Dynamic Map Hero Section */}
      <div className="relative rounded-[2.5rem] overflow-hidden h-[450px] mb-8 group border-[6px] border-slate-200 dark:border-slate-800 shadow-2xl">
        <CountryFocusMap countryName={trip.destination} />
        
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-8 sm:p-10">
          <div className="flex items-start justify-between pointer-events-auto">
            <div className="space-y-2">
               <h2 className="text-4xl sm:text-5xl font-black text-white drop-shadow-lg tracking-tighter leading-none">{trip.title || trip.destination}</h2>
               {trip.title !== trip.destination && (
                 <div className="flex items-center text-white/80 font-bold text-lg">
                   <MapPin className="w-5 h-5 mr-1" /> {trip.destination}
                 </div>
               )}
               <div className="flex flex-wrap gap-2 mt-2">
                 {trip.tags?.map(tag => (
                   <span key={tag} className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-xs font-bold text-white border border-white/10">
                     {tag}
                   </span>
                 ))}
               </div>
            </div>
            
            <div className="flex flex-col gap-3 items-end">
                <div className="text-right hidden sm:block">
                    <div className="bg-black/30 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 text-white font-black text-xl">
                        {days.length} Days
                    </div>
                </div>
                
                <div className="flex gap-2">
                    {trip.customMapImage && (
                        <Button onClick={() => setMapModalOpen(true)} className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border-white/40 shadow-xl flex" size="sm">
                            <Map className="w-4 h-4 mr-2" /> Show Map
                        </Button>
                    )}
                    <Button onClick={handleShareTrip} className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border-white/40 shadow-xl flex" size="sm">
                        <Share2 className="w-4 h-4 mr-2" /> Share Trip
                    </Button>
                </div>
            </div>
          </div>
        </div>
        
        {/* Magic Plan Button */}
        {(!items || items.length === 0) && (
           <div className="absolute top-6 right-6 z-10 pointer-events-auto">
             <Button onClick={handleGenerateAI} disabled={generating} className="bg-white/90 text-brand-800 hover:bg-white border-0 shadow-xl backdrop-blur-md">
               <Wand2 className={`w-5 h-5 mr-2 ${generating ? 'animate-spin' : ''}`} />
               {generating ? 'Planning...' : 'Auto-Plan with AI'}
             </Button>
           </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto gap-3 pb-4 mb-4 no-scrollbar">
        {(['itinerary', 'flight', 'car', 'stay', 'activity'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-wider whitespace-nowrap transition-all border-b-[4px] active:border-b-0 active:translate-y-[4px] shadow-sm ${
              activeTab === tab 
                ? 'bg-[#0ea5e9] border-[#0369a1] text-white shadow-[#0ea5e9]/30' 
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="pb-32">
      {activeTab === 'itinerary' ? (
        <div className="space-y-10">
          {days.map((day, index) => {
            const dayItems = items?.filter(i => i.date === day);
            const isToday = new Date().toISOString().split('T')[0] === day;

            return (
              <div key={day} className="relative pl-6 sm:pl-0">
                {/* Timeline line for mobile */}
                <div className="absolute left-2.5 top-0 bottom-0 w-1 bg-slate-200 dark:bg-slate-800 sm:hidden rounded-full"></div>
                
                <div className="mb-6 flex items-center gap-4 sticky top-28 z-20 bg-slate-100/95 dark:bg-slate-950/95 py-3 backdrop-blur-md sm:static sm:bg-transparent rounded-2xl sm:rounded-none px-3 sm:px-0 border border-white/50 sm:border-none shadow-sm sm:shadow-none">
                  <div className={`w-4 h-4 rounded-full border-4 absolute left-[12px] sm:hidden z-10 ${isToday ? 'bg-brand-500 border-brand-200' : 'bg-slate-300 border-slate-100 dark:bg-slate-700 dark:border-slate-800'}`}></div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                    <h3 className={`text-2xl font-black uppercase tracking-tight ${isToday ? 'text-brand-600 dark:text-brand-400' : 'text-slate-800 dark:text-slate-200'}`}>Day {index + 1}</h3>
                    <span className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider">{new Date(day).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                  </div>

                  <button 
                    onClick={() => { setSelectedDateForAdd(day); setModalOpen(true); }}
                    className="ml-auto text-xs text-brand-700 dark:text-brand-400 font-black uppercase tracking-wider px-4 py-2 rounded-xl bg-brand-100 dark:bg-brand-900/30 hover:bg-brand-200 dark:hover:bg-brand-900/50 transition-colors border border-brand-200 dark:border-brand-800"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dayItems && dayItems.length > 0 ? (
                    dayItems.map((item, idx) => (
                      <TripItemCard key={item.id || idx} item={item} />
                    ))
                  ) : (
                    <div className="col-span-full border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center text-slate-400 text-base font-medium hover:border-brand-300 dark:hover:border-brand-700 transition-colors bg-white/50 dark:bg-slate-900/50">
                      <p>No plans yet.</p>
                      <button onClick={() => { setSelectedDateForAdd(day); setModalOpen(true); }} className="mt-2 text-brand-600 font-bold hover:underline">Plan something for this day</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems?.map((item, idx) => (
            <TripItemCard key={item.id || idx} item={item} />
          ))}
          {filteredItems?.length === 0 && (
            <div className="col-span-full text-center py-20 text-slate-400 dark:text-slate-500 font-bold text-lg">
              No {activeTab}s found. 
              <br/>
              <button onClick={() => { setModalOpen(true); }} className="mt-4 text-brand-600 dark:text-brand-400 hover:underline">Add your first {activeTab}</button>
            </div>
          )}
        </div>
      )}
      </div>

      <Fab icon={Plus} onClick={() => { setSelectedDateForAdd(undefined); setModalOpen(true); }} label="Add" />

      <AddItemModal 
        tripId={tripId} 
        isOpen={isModalOpen} 
        onClose={() => setModalOpen(false)} 
        date={selectedDateForAdd}
        initialType={modalDefaultType}
      />

      {/* Full Screen Map Modal */}
      {isMapModalOpen && trip.customMapImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200 p-4" onClick={() => setMapModalOpen(false)}>
            <div className="relative max-w-5xl w-full max-h-full flex flex-col items-center justify-center">
                 <button onClick={() => setMapModalOpen(false)} className="absolute top-4 right-4 z-50 p-3 bg-white/10 text-white rounded-full backdrop-blur-md hover:bg-white/20">
                    <X className="w-8 h-8" strokeWidth={3} />
                 </button>
                 <img 
                    src={trip.customMapImage} 
                    alt="Custom Map" 
                    className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border-4 border-white/10" 
                    onClick={e => e.stopPropagation()} 
                 />
                 <p className="mt-4 text-white/70 font-bold text-center">Tap outside to close</p>
            </div>
        </div>
      )}
    </Layout>
  );
};
