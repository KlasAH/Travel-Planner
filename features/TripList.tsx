

import React, { useState, useRef, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import { Layout, Button, Card, Input, Select, ChipGroup, DateInput } from '../components/Shared';
import { Plus, Calendar, MapPin, ChevronRight, Trash2, Globe, Tag, Sparkles, Filter, DownloadCloud, Upload } from 'lucide-react';
import { Trip, SharedTripData } from '../types';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { Tooltip } from "react-tooltip";

// GeoJSON Url for the world map
const GEO_URL = "https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries.json";

// Predefined Data
const COUNTRIES = [
  { value: "Afghanistan", label: "🇦🇫 Afghanistan" },
  { value: "Albania", label: "🇦🇱 Albania" },
  { value: "Algeria", label: "🇩🇿 Algeria" },
  { value: "Andorra", label: "🇦🇩 Andorra" },
  { value: "Angola", label: "🇦🇴 Angola" },
  { value: "Antigua and Barbuda", label: "🇦🇬 Antigua and Barbuda" },
  { value: "Argentina", label: "🇦🇷 Argentina" },
  { value: "Armenia", label: "🇦🇲 Armenia" },
  { value: "Australia", label: "🇦🇺 Australia" },
  { value: "Austria", label: "🇦🇹 Austria" },
  { value: "Azerbaijan", label: "🇦🇿 Azerbaijan" },
  { value: "Bahamas", label: "🇧🇸 Bahamas" },
  { value: "Bahrain", label: "🇧🇭 Bahrain" },
  { value: "Bangladesh", label: "🇧🇩 Bangladesh" },
  { value: "Barbados", label: "🇧🇧 Barbados" },
  { value: "Belarus", label: "🇧🇾 Belarus" },
  { value: "Belgium", label: "🇧🇪 Belgium" },
  { value: "Belize", label: "🇧🇿 Belize" },
  { value: "Benin", label: "🇧🇯 Benin" },
  { value: "Bhutan", label: "🇧🇹 Bhutan" },
  { value: "Bolivia", label: "🇧🇴 Bolivia" },
  { value: "Bosnia and Herzegovina", label: "🇧🇦 Bosnia and Herzegovina" },
  { value: "Botswana", label: "🇧🇼 Botswana" },
  { value: "Brazil", label: "🇧🇷 Brazil" },
  { value: "Brunei", label: "🇧🇳 Brunei" },
  { value: "Bulgaria", label: "🇧🇬 Bulgaria" },
  { value: "Burkina Faso", label: "🇧🇫 Burkina Faso" },
  { value: "Burundi", label: "🇧🇮 Burundi" },
  { value: "Cabo Verde", label: "🇨🇻 Cabo Verde" },
  { value: "Cambodia", label: "🇰🇭 Cambodia" },
  { value: "Cameroon", label: "🇨🇲 Cameroon" },
  { value: "Canada", label: "🇨🇦 Canada" },
  { value: "Central African Republic", label: "🇨🇫 Central African Republic" },
  { value: "Chad", label: "🇹🇩 Chad" },
  { value: "Chile", label: "🇨🇱 Chile" },
  { value: "China", label: "🇨🇳 China" },
  { value: "Colombia", label: "🇨🇴 Colombia" },
  { value: "Comoros", label: "🇰🇲 Comoros" },
  { value: "Congo (Congo-Brazzaville)", label: "🇨🇬 Congo (Congo-Brazzaville)" },
  { value: "Costa Rica", label: "🇨🇷 Costa Rica" },
  { value: "Croatia", label: "🇭🇷 Croatia" },
  { value: "Cuba", label: "🇨🇺 Cuba" },
  { value: "Cyprus", label: "🇨🇾 Cyprus" },
  { value: "Czechia (Czech Republic)", label: "🇨🇿 Czechia (Czech Republic)" },
  { value: "Democratic Republic of the Congo", label: "🇨🇩 Democratic Republic of the Congo" },
  { value: "Denmark", label: "🇩🇰 Denmark" },
  { value: "Djibouti", label: "🇩🇯 Djibouti" },
  { value: "Dominica", label: "🇩🇲 Dominica" },
  { value: "Dominican Republic", label: "🇩🇴 Dominican Republic" },
  { value: "Ecuador", label: "🇪🇨 Ecuador" },
  { value: "Egypt", label: "🇪🇬 Egypt" },
  { value: "El Salvador", label: "🇸🇻 El Salvador" },
  { value: "Equatorial Guinea", label: "🇬🇶 Equatorial Guinea" },
  { value: "Eritrea", label: "🇪🇷 Eritrea" },
  { value: "Estonia", label: "🇪🇪 Estonia" },
  { value: "Eswatini", label: "🇸🇿 Eswatini" },
  { value: "Ethiopia", label: "🇪🇹 Ethiopia" },
  { value: "Fiji", label: "🇫🇯 Fiji" },
  { value: "Finland", label: "🇫🇮 Finland" },
  { value: "France", label: "🇫🇷 France" },
  { value: "Gabon", label: "🇬🇦 Gabon" },
  { value: "Gambia", label: "🇬🇲 Gambia" },
  { value: "Georgia", label: "🇬🇪 Georgia" },
  { value: "Germany", label: "🇩🇪 Germany" },
  { value: "Ghana", label: "🇬🇭 Ghana" },
  { value: "Greece", label: "🇬🇷 Greece" },
  { value: "Grenada", label: "🇬🇩 Grenada" },
  { value: "Guatemala", label: "🇬🇹 Guatemala" },
  { value: "Guinea", label: "🇬🇳 Guinea" },
  { value: "Guinea-Bissau", label: "🇬🇼 Guinea-Bissau" },
  { value: "Guyana", label: "🇬🇾 Guyana" },
  { value: "Haiti", label: "🇭🇹 Haiti" },
  { value: "Honduras", label: "🇭🇳 Honduras" },
  { value: "Hungary", label: "🇭🇺 Hungary" },
  { value: "Iceland", label: "🇮🇸 Iceland" },
  { value: "India", label: "🇮🇳 India" },
  { value: "Indonesia", label: "🇮🇩 Indonesia" },
  { value: "Iran", label: "🇮🇷 Iran" },
  { value: "Iraq", label: "🇮🇶 Iraq" },
  { value: "Ireland", label: "🇮🇪 Ireland" },
  { value: "Israel", label: "🇮🇱 Israel" },
  { value: "Italy", label: "🇮🇹 Italy" },
  { value: "Jamaica", label: "🇯🇲 Jamaica" },
  { value: "Japan", label: "🇯🇵 Japan" },
  { value: "Jordan", label: "🇯🇴 Jordan" },
  { value: "Kazakhstan", label: "🇰🇿 Kazakhstan" },
  { value: "Kenya", label: "🇰🇪 Kenya" },
  { value: "Kiribati", label: "🇰🇮 Kiribati" },
  { value: "Kuwait", label: "🇰🇼 Kuwait" },
  { value: "Kyrgyzstan", label: "🇰🇬 Kyrgyzstan" },
  { value: "Laos", label: "🇱🇦 Laos" },
  { value: "Latvia", label: "🇱🇻 Latvia" },
  { value: "Lebanon", label: "🇱🇧 Lebanon" },
  { value: "Lesotho", label: "🇱🇸 Lesotho" },
  { value: "Liberia", label: "🇱🇷 Liberia" },
  { value: "Libya", label: "🇱🇾 Libya" },
  { value: "Liechtenstein", label: "🇱🇮 Liechtenstein" },
  { value: "Lithuania", label: "🇱🇹 Lithuania" },
  { value: "Luxembourg", label: "🇱🇺 Luxembourg" },
  { value: "Madagascar", label: "🇲🇬 Madagascar" },
  { value: "Malawi", label: "🇲🇼 Malawi" },
  { value: "Malaysia", label: "🇲🇾 Malaysia" },
  { value: "Maldives", label: "🇲🇻 Maldives" },
  { value: "Mali", label: "🇲🇱 Mali" },
  { value: "Malta", label: "🇲🇹 Malta" },
  { value: "Marshall Islands", label: "🇲🇭 Marshall Islands" },
  { value: "Mauritania", label: "🇲🇷 Mauritania" },
  { value: "Mauritius", label: "🇲🇺 Mauritius" },
  { value: "Mexico", label: "🇲🇽 Mexico" },
  { value: "Micronesia", label: "🇫🇲 Micronesia" },
  { value: "Moldova", label: "🇲🇩 Moldova" },
  { value: "Monaco", label: "🇲🇨 Monaco" },
  { value: "Mongolia", label: "🇲🇳 Mongolia" },
  { value: "Montenegro", label: "🇲🇪 Montenegro" },
  { value: "Morocco", label: "🇲🇦 Morocco" },
  { value: "Mozambique", label: "🇲🇿 Mozambique" },
  { value: "Myanmar (formerly Burma)", label: "🇲🇲 Myanmar (formerly Burma)" },
  { value: "Namibia", label: "🇳🇦 Namibia" },
  { value: "Nauru", label: "🇳🇷 Nauru" },
  { value: "Nepal", label: "🇳🇵 Nepal" },
  { value: "Netherlands", label: "🇳🇱 Netherlands" },
  { value: "New Zealand", label: "🇳🇿 New Zealand" },
  { value: "Nicaragua", label: "🇳🇮 Nicaragua" },
  { value: "Niger", label: "🇳🇪 Niger" },
  { value: "Nigeria", label: "🇳🇬 Nigeria" },
  { value: "North Korea", label: "🇰🇵 North Korea" },
  { value: "North Macedonia", label: "🇲🇰 North Macedonia" },
  { value: "Norway", label: "🇳🇴 Norway" },
  { value: "Oman", label: "🇴🇲 Oman" },
  { value: "Pakistan", label: "🇵🇰 Pakistan" },
  { value: "Palau", label: "🇵🇼 Palau" },
  { value: "Palestine State", label: "🇵🇸 Palestine State" },
  { value: "Panama", label: "🇵🇦 Panama" },
  { value: "Papua New Guinea", label: "🇵🇬 Papua New Guinea" },
  { value: "Paraguay", label: "🇵🇾 Paraguay" },
  { value: "Peru", label: "🇵🇪 Peru" },
  { value: "Philippines", label: "🇵🇭 Philippines" },
  { value: "Poland", label: "🇵🇱 Poland" },
  { value: "Portugal", label: "🇵🇹 Portugal" },
  { value: "Qatar", label: "🇶🇦 Qatar" },
  { value: "Romania", label: "🇷🇴 Romania" },
  { value: "Russia", label: "🇷🇺 Russia" },
  { value: "Rwanda", label: "🇷🇼 Rwanda" },
  { value: "Saint Kitts and Nevis", label: "🇰🇳 Saint Kitts and Nevis" },
  { value: "Saint Lucia", label: "🇱🇨 Saint Lucia" },
  { value: "Saint Vincent and the Grenadines", label: "🇻🇨 Saint Vincent and the Grenadines" },
  { value: "Samoa", label: "🇼🇸 Samoa" },
  { value: "San Marino", label: "🇸🇲 San Marino" },
  { value: "Sao Tome and Principe", label: "🇸🇹 Sao Tome and Principe" },
  { value: "Saudi Arabia", label: "🇸🇦 Saudi Arabia" },
  { value: "Senegal", label: "🇸🇳 Senegal" },
  { value: "Serbia", label: "🇷🇸 Serbia" },
  { value: "Seychelles", label: "🇸🇨 Seychelles" },
  { value: "Sierra Leone", label: "🇸🇱 Sierra Leone" },
  { value: "Singapore", label: "🇸🇬 Singapore" },
  { value: "Slovakia", label: "🇸🇰 Slovakia" },
  { value: "Slovenia", label: "🇸🇮 Slovenia" },
  { value: "Solomon Islands", label: "🇸🇧 Solomon Islands" },
  { value: "Somalia", label: "🇸🇴 Somalia" },
  { value: "South Africa", label: "🇿🇦 South Africa" },
  { value: "South Korea", label: "🇰🇷 South Korea" },
  { value: "South Sudan", label: "🇸🇸 South Sudan" },
  { value: "Spain", label: "🇪🇸 Spain" },
  { value: "Sri Lanka", label: "🇱🇰 Sri Lanka" },
  { value: "Sudan", label: "🇸🇩 Sudan" },
  { value: "Suriname", label: "🇸🇷 Suriname" },
  { value: "Sweden", label: "🇸🇪 Sweden" },
  { value: "Switzerland", label: "🇨🇭 Switzerland" },
  { value: "Syria", label: "🇸🇾 Syria" },
  { value: "Tajikistan", label: "🇹🇯 Tajikistan" },
  { value: "Tanzania", label: "🇹🇿 Tanzania" },
  { value: "Thailand", label: "🇹🇭 Thailand" },
  { value: "Timor-Leste", label: "🇹🇱 Timor-Leste" },
  { value: "Togo", label: "🇹🇬 Togo" },
  { value: "Tonga", label: "🇹🇴 Tonga" },
  { value: "Trinidad and Tobago", label: "🇹🇹 Trinidad and Tobago" },
  { value: "Tunisia", label: "🇹🇳 Tunisia" },
  { value: "Turkey", label: "🇹🇷 Turkey" },
  { value: "Turkmenistan", label: "🇹🇲 Turkmenistan" },
  { value: "Tuvalu", label: "🇹🇻 Tuvalu" },
  { value: "Uganda", label: "🇺🇬 Uganda" },
  { value: "Ukraine", label: "🇺🇦 Ukraine" },
  { value: "United Arab Emirates", label: "🇦🇪 United Arab Emirates" },
  { value: "United Kingdom", label: "🇬🇧 United Kingdom" },
  { value: "United States of America", label: "🇺🇸 United States of America" },
  { value: "Uruguay", label: "🇺🇾 Uruguay" },
  { value: "Uzbekistan", label: "🇺🇿 Uzbekistan" },
  { value: "Vanuatu", label: "🇻🇺 Vanuatu" },
  { value: "Venezuela", label: "🇻🇪 Venezuela" },
  { value: "Vietnam", label: "🇻🇳 Vietnam" },
  { value: "Yemen", label: "🇾🇪 Yemen" },
  { value: "Zambia", label: "🇿🇲 Zambia" },
  { value: "Zimbabwe", label: "🇿🇼 Zimbabwe" }
];

const INTERESTS = ['Food 🍜', 'Hiking 🥾', 'History 🏛️', 'Relaxing 🧖', 'Nightlife 🍸', 'Art 🎨', 'Beach 🏖️', 'Shopping 🛍️', 'Nature 🌲', 'Photography 📸'];

export const TripListPage = () => {
  const navigate = useNavigate();
  // Changed query to order by date descending for better "Many Trips" handling
  const trips = useLiveQuery(() => db.trips.orderBy('startDate').reverse().toArray());
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | 'ALL'>('ALL');

  // New Trip State
  const [newTrip, setNewTrip] = useState<Partial<Trip>>({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    tags: []
  });

  // Calculate distinct years from trips
  const years = useMemo(() => {
    if (!trips) return [];
    // Safely parse the year from YYYY-MM-DD
    const uniqueYears = new Set(trips.map(t => parseInt(t.startDate.split('-')[0])));
    return Array.from(uniqueYears).sort((a: number, b: number) => b - a);
  }, [trips]);

  // Filter trips based on selection
  const filteredTrips = useMemo(() => {
    if (!trips) return [];
    if (selectedYear === 'ALL') return trips;
    return trips.filter(t => parseInt(t.startDate.split('-')[0]) === selectedYear);
  }, [trips, selectedYear]);

  const handleStartDateChange = (date: string) => {
     if (!date) {
        setNewTrip(prev => ({ ...prev, startDate: '' }));
        return;
     }

     // Automatically set end date to start date + 7 days
     const start = new Date(date);
     const end = new Date(start);
     end.setDate(start.getDate() + 7);
     const endDateStr = end.toISOString().split('T')[0];

     setNewTrip(prev => ({ 
         ...prev, 
         startDate: date,
         endDate: endDateStr 
     }));
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrip.destination || !newTrip.startDate || !newTrip.endDate) return;

    const title = newTrip.title || `${newTrip.destination} Adventure`;
    
    // "Create Map" - Simulate by fetching a relevant cover image
    const coverImage = `https://picsum.photos/seed/${newTrip.destination + title}/800/400`;

    const tripId = await db.trips.add({
      title,
      destination: newTrip.destination,
      startDate: newTrip.startDate,
      endDate: newTrip.endDate,
      tags: newTrip.tags,
      notes: newTrip.tags?.join(', '), // Backwards compatibility
      coverImage
    } as Trip);

    setModalOpen(false);
    setNewTrip({ title: '', destination: '', startDate: '', endDate: '', tags: [] });
    navigate(`/trip/${tripId}`);
  };

  const handleImportTrip = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const sharedData: SharedTripData = JSON.parse(text);

        if (!sharedData.trip || !Array.isArray(sharedData.items)) {
          throw new Error("Invalid file format");
        }

        await (db as any).transaction('rw', db.trips, db.items, async () => {
          // Remove ID from imported trip to auto-increment a new one
          const { id, ...tripData } = sharedData.trip;
          const newTripId = await db.trips.add(tripData);

          // Add items with new tripId
          const newItems = sharedData.items.map(item => {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { id, tripId, ...itemData } = item;
              return { ...itemData, tripId: newTripId };
          });
          
          await db.items.bulkAdd(newItems);
        });

        alert(`Successfully imported trip: ${sharedData.trip.title || sharedData.trip.destination}`);
        // No need to reload, live query updates automatically
      } catch (err) {
        console.error(err);
        alert('Failed to import data. Invalid file format.');
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  const deleteTrip = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm("Delete this trip and all its items?")) {
      await (db as any).transaction('rw', db.trips, db.items, async () => {
        await db.trips.delete(id);
        await db.items.where('tripId').equals(id).delete();
      });
    }
  };

  const getDurationDays = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
    return diffDays;
  };

  return (
    <Layout title="My Trips">
       {/* World Map Visualization */}
       <div className="mb-8 bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-xl border-[6px] border-slate-300 dark:border-slate-700 overflow-hidden relative group">
          <div className="absolute top-6 left-8 z-10 pointer-events-none">
             <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-brand-500" />
                  Travel Map
                </h2>
                <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                   {selectedYear === 'ALL' ? 'All Time' : selectedYear} • {filteredTrips?.length || 0} Trips
                </p>
             </div>
          </div>
          
          <div className="h-[300px] sm:h-[400px] w-full bg-slate-50 dark:bg-slate-900/50">
             <ComposableMap projection="geoMercator" projectionConfig={{ scale: 110, center: [0, 20] }} style={{ width: "100%", height: "100%" }}>
                <ZoomableGroup zoom={1} minZoom={0.7} maxZoom={4}>
                  <Geographies geography={GEO_URL}>
                    {({ geographies }) =>
                      geographies.map((geo) => {
                        // Check if this country is in our FILTERED trips
                        const isVisited = filteredTrips?.some(t => 
                           t.destination === geo.properties.name || 
                           geo.properties.name.includes(t.destination) ||
                           t.destination.includes(geo.properties.name)
                        );
                        
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            data-tooltip-id="map-tooltip"
                            data-tooltip-content={geo.properties.name}
                            fill={isVisited ? "#0ea5e9" : "var(--map-default)"}
                            stroke="var(--map-stroke)"
                            strokeWidth={0.5}
                            style={{
                              default: { fill: isVisited ? "#0ea5e9" : "#cbd5e1", outline: "none", transition: "all 0.3s" },
                              hover: { fill: isVisited ? "#0284c7" : "#94a3b8", outline: "none", cursor: "pointer" },
                              pressed: { fill: "#0284c7", outline: "none" }
                            }}
                            className="transition-colors duration-300"
                          />
                        );
                      })
                    }
                  </Geographies>
                </ZoomableGroup>
             </ComposableMap>
          </div>
          <Tooltip id="map-tooltip" className="z-50 !bg-slate-900 !text-white !font-bold !rounded-xl !text-xs !py-1 !px-3" />
       </div>

      {/* Year Filter Tabs */}
      {years.length > 0 && (
          <div className="flex items-center gap-3 overflow-x-auto pb-2 mb-6 no-scrollbar">
             <div className="flex items-center gap-2 px-3 text-slate-400">
               <Filter className="w-5 h-5" />
             </div>
             <button
                onClick={() => setSelectedYear('ALL')}
                className={`px-5 py-2 rounded-xl font-black text-sm uppercase tracking-wide transition-all border-b-[3px] active:scale-95 whitespace-nowrap ${
                    selectedYear === 'ALL' 
                    ? 'bg-slate-800 text-white border-slate-950 dark:bg-white dark:text-slate-900 dark:border-slate-300' 
                    : 'bg-white text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-50'
                }`}
             >
                All Years
             </button>
             {years.map(year => (
                <button
                   key={year}
                   onClick={() => setSelectedYear(year)}
                   className={`px-5 py-2 rounded-xl font-black text-sm uppercase tracking-wide transition-all border-b-[3px] active:scale-95 ${
                       selectedYear === year
                       ? 'bg-brand-500 text-white border-brand-700 shadow-lg shadow-brand-500/30'
                       : 'bg-white text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-50'
                   }`}
                >
                   {year}
                </button>
             ))}
          </div>
      )}

      <div className="flex justify-end mb-4">
         <div className="relative overflow-hidden group">
            <Button size="sm" variant="secondary" className="pl-10">
                <Upload className="w-4 h-4 absolute left-4" />
                Import Trip
            </Button>
            <input 
                type="file" 
                accept=".json" 
                onChange={handleImportTrip}
                className="absolute inset-0 opacity-0 cursor-pointer"
                title="Import a trip file"
            />
         </div>
      </div>

      {trips && trips.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-32">
          {filteredTrips.map(trip => {
            const duration = getDurationDays(trip.startDate, trip.endDate);
            return (
            <Card key={trip.id} onClick={() => navigate(`/trip/${trip.id}`)} className="group flex flex-col h-full animate-in fade-in zoom-in duration-300">
              <div className="h-48 overflow-hidden relative border-b-4 border-slate-100 dark:border-slate-800">
                <img 
                  src={trip.coverImage} 
                  alt={trip.destination} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-6">
                  <div>
                    <h3 className="text-3xl font-black text-white tracking-tight drop-shadow-md leading-none mb-1">{trip.title || trip.destination}</h3>
                    {trip.title && trip.title !== trip.destination && <p className="text-white/80 font-bold uppercase tracking-wider text-xs flex items-center gap-1"><MapPin className="w-3 h-3"/> {trip.destination}</p>}
                  </div>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col bg-white dark:bg-slate-800">
                <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm mb-4 font-bold uppercase tracking-wider justify-between">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-brand-500" />
                    <span>{new Date(trip.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — {new Date(trip.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                   <span className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg text-[0.65rem] text-slate-500 dark:text-slate-300">{duration} Days</span>
                </div>
                
                {trip.tags && trip.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {trip.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg">{tag}</span>
                    ))}
                    {trip.tags.length > 3 && <span className="text-xs text-slate-400 font-bold self-center">+{trip.tags.length - 3}</span>}
                  </div>
                )}
                
                <div className="flex items-center justify-between mt-auto pt-4 border-t-2 border-slate-100 dark:border-slate-700/50">
                  <button 
                    onClick={(e) => deleteTrip(e, trip.id!)}
                    className="p-3 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <span className="text-brand-600 dark:text-brand-400 font-black text-sm uppercase tracking-wide flex items-center group-hover:translate-x-1 transition-transform bg-brand-50 dark:bg-brand-900/20 px-4 py-2 rounded-xl">
                    View Plan <ChevronRight className="w-5 h-5 ml-1" strokeWidth={3} />
                  </span>
                </div>
              </div>
            </Card>
          )})}

          {filteredTrips.length === 0 && selectedYear !== 'ALL' && (
             <div className="col-span-full py-10 flex flex-col items-center justify-center text-slate-400">
                <h3 className="text-xl font-black text-slate-300 dark:text-slate-600 uppercase">No trips in {selectedYear}</h3>
                <p className="text-sm font-bold">Time to plan one?</p>
             </div>
          )}
          
          {/* Add New Trip Card - Always visible or usually relevant */}
          <button 
             onClick={() => setModalOpen(true)}
             className="group relative flex flex-col items-center justify-center h-full min-h-[350px] rounded-[2rem] border-[4px] border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:border-brand-400 dark:hover:border-brand-500 hover:bg-brand-50/50 dark:hover:bg-slate-800 transition-all duration-300"
          >
             <div className="w-24 h-24 rounded-3xl bg-white dark:bg-slate-800 text-slate-300 group-hover:text-brand-500 flex items-center justify-center transition-all duration-300 shadow-sm group-hover:shadow-2xl group-hover:scale-110 mb-6 group-hover:-rotate-6 border-4 border-slate-100 dark:border-slate-700">
                <Plus className="w-12 h-12" strokeWidth={4} />
             </div>
             <span className="text-2xl font-black text-slate-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 uppercase tracking-wide transition-colors">Start New Adventure</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="space-y-3">
             <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Ready to go?</h2>
             <p className="text-slate-500 dark:text-slate-400 max-w-md text-xl font-bold">Build your dream itinerary in seconds with AI.</p>
          </div>
          
          <Button onClick={() => setModalOpen(true)} size="xl" className="shadow-brand-500/30 max-w-xs mx-auto">
            <Plus className="w-6 h-6 mr-2" strokeWidth={4} />
            Plan Adventure
          </Button>

          {/* Empty State Import Button */}
          <div className="relative overflow-hidden group inline-block">
             <Button size="md" variant="secondary" className="pl-10">
                 <Upload className="w-4 h-4 absolute left-4" />
                 Import from File
             </Button>
             <input 
                 type="file" 
                 accept=".json" 
                 onChange={handleImportTrip}
                 className="absolute inset-0 opacity-0 cursor-pointer"
             />
          </div>
        </div>
      )}

      {/* Create Trip Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-2xl w-full flex flex-col max-h-[95vh] animate-in fade-in zoom-in duration-300 border-[8px] border-slate-100 dark:border-slate-800 overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-8 py-6 bg-slate-50 dark:bg-slate-900 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between">
               <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                <span className="bg-brand-500 text-white p-2 rounded-xl shadow-lg shadow-brand-500/30">
                   <Sparkles className="w-6 h-6" fill="white" />
                </span>
                Plan Adventure
              </h3>
              <button onClick={() => setModalOpen(false)} className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-colors">
                <span className="text-2xl font-black leading-none">&times;</span>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateTrip} className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-white dark:bg-slate-900">
                  
                  {/* Trip Name */}
                  <Input 
                    label="Name your trip"
                    placeholder="e.g. Summer Break 2025" 
                    value={newTrip.title} 
                    onChange={e => setNewTrip({...newTrip, title: e.target.value})} 
                    autoFocus
                    icon={Tag}
                    iconColor="purple"
                    className="text-2xl"
                  />

                  {/* Destination (Select) */}
                  <Select 
                    label="Where to?"
                    icon={Globe}
                    iconColor="blue"
                    value={newTrip.destination}
                    onChange={e => setNewTrip({...newTrip, destination: e.target.value})}
                    required
                    options={COUNTRIES}
                  />
                  
                  {/* Dates Row */}
                  <div className="grid grid-cols-1 gap-6">
                    <DateInput 
                      label="Start Date" 
                      value={newTrip.startDate || ''} 
                      onChange={handleStartDateChange} 
                      required
                      icon={Calendar} 
                      iconColor="green"
                      className="cursor-pointer"
                    />
                    <DateInput 
                      label="End Date" 
                      value={newTrip.endDate || ''} 
                      onChange={val => setNewTrip({...newTrip, endDate: val})} 
                      required 
                      icon={Calendar}
                      iconColor="red"
                      className="cursor-pointer"
                    />
                  </div>
                  
                  {/* Connected Words (Interests) */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800">
                    <ChipGroup 
                      label="Connect words to adjust trip"
                      options={INTERESTS}
                      selected={newTrip.tags || []}
                      onChange={(tags) => setNewTrip({...newTrip, tags})}
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 bg-white dark:bg-slate-900 border-t-2 border-slate-100 dark:border-slate-800 relative z-20">
                    <Button type="submit" variant="primary" size="xl" className="shadow-brand-500/40">
                       Create Trip
                    </Button>
                </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};
