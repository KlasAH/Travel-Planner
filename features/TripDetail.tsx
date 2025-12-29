
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { TripItem, ItemType } from '../types';
import { Layout, Button, Card, CategoryIcon, Input, Fab, DateInput, TimeInput } from '../components/Shared';
import { Plus, Trash2, Calendar, MapPin, Clock, DollarSign, Check, Wand2, Tag, AlignLeft, Hash, Plane, Key, Home, Car, X, Link as LinkIcon, ExternalLink, ArrowRight, Globe } from 'lucide-react';
import { generateItinerary, Suggestion } from '../services/geminiService';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { Tooltip } from "react-tooltip";

// GeoJSON Url for the world map
const GEO_URL = "https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries.json";

// Helper to get array of dates between start and end
const getDaysArray = (start: string, end: string) => {
  const arr = [];
  const dt = new Date(start);
  const endDt = new Date(end);
  while (dt <= endDt) {
    arr.push(new Date(dt).toISOString().split('T')[0]);
    dt.setDate(dt.getDate() + 1);
  }
  return arr;
};

// --- Add Item Modal ---
const AddItemModal = ({ tripId, isOpen, onClose, date, initialType = 'activity' }: { tripId: number, isOpen: boolean, onClose: () => void, date?: string, initialType?: ItemType }) => {
  const [formData, setFormData] = useState<Partial<TripItem>>({
    type: initialType,
    date: date || new Date().toISOString().split('T')[0],
    title: '',
    details: '',
    location: '',
    startTime: '09:00',
    bookingRef: '',
    bookingLink: '',
    cost: undefined,
  });

  // State for multiple flight segments
  const [flightSegments, setFlightSegments] = useState<Partial<TripItem>[]>([]);

  useEffect(() => {
    if (isOpen) {
        setFormData(prev => ({ 
          ...prev, 
          type: initialType,
          date: date || new Date().toISOString().split('T')[0],
          // Reset specific fields when opening
          title: '', details: '', location: '', bookingRef: '', bookingLink: '',
          departureAirport: '', arrivalAirport: '', pickupLocation: '', dropoffLocation: '', endDate: '',
          cost: undefined
        }));
        setFlightSegments([]);
    }
  }, [isOpen, date, initialType]);

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
          endDate: '', // Clear arrival date for new segment
          startTime: '',
          endTime: '',
          // Keep bookingRef
      }));
  };

  const removeSegment = (index: number) => {
      setFlightSegments(flightSegments.filter((_, i) => i !== index));
  };

  // Simulate fetching an image from a site based on the item details
  const fetchImage = (item: Partial<TripItem>) => {
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
        endDate: ''
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
                        onChange={val => setFormData({...formData, date: val})} 
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
                            onChange={val => setFormData({...formData, date: val})} 
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
                            onChange={val => setFormData({...formData, date: val})} 
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
                        onChange={val => setFormData({...formData, date: val})} 
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
          
          {/* COMMON FIELDS (Cost) */}
          <div className="mt-8 pt-4 border-t-2 border-slate-100 dark:border-slate-700">
             <Input 
                label="Total Cost" 
                type="number"
                placeholder="0.00" 
                value={formData.cost} 
                onChange={e => setFormData({...formData, cost: parseFloat(e.target.value)})}
                icon={DollarSign}
                iconColor="green"
            />
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
const TripItemCard = ({ item }: { item: TripItem }) => {

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

  return (
    <Card className="flex flex-col h-full group">
       <div className="relative h-48 overflow-hidden border-b-4 border-slate-100 dark:border-slate-800">
           <img src={item.imageUrl || `https://picsum.photos/seed/${item.title}/400/300`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.title} />
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
       
       <div className="p-5 flex-1 flex flex-col space-y-3 bg-white dark:bg-slate-800">
           <div className="flex justify-between items-start">
              <h4 className="text-xl font-black text-slate-800 dark:text-white leading-tight">{item.title}</h4>
              <button 
                onClick={(e) => { 
                    e.stopPropagation(); 
                    if(confirm('Delete item?')) {
                        db.items.delete(item.id!);
                    } 
                }}
                className="text-slate-300 hover:text-red-500 transition-colors p-1"
              >
                  <Trash2 className="w-4 h-4" />
              </button>
           </div>
           
           <div className="space-y-2">
               {/* Time */}
               {(item.startTime || item.endTime) && (
                   <div className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                       <Clock className="w-4 h-4 text-brand-500" />
                       <span>{formatTime(item.startTime)} {item.endTime ? `- ${formatTime(item.endTime)}` : ''}</span>
                   </div>
               )}

               {/* Location */}
               {(item.location || item.pickupLocation || item.departureAirport) && (
                   <div className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                       <MapPin className="w-4 h-4 text-brand-500" />
                       <span className="truncate">{item.location || item.pickupLocation || `${item.departureAirport} -> ${item.arrivalAirport}`}</span>
                   </div>
               )}
               
               {/* Details truncated */}
               {item.details && (
                   <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-2 font-medium bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                       {item.details}
                   </p>
               )}
           </div>

           {/* Booking Ref / Link */}
           {(item.bookingRef || item.bookingLink) && (
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
  const tripId = parseInt(id || '0');
  const trip = useLiveQuery(() => db.trips.get(tripId));
  const allTrips = useLiveQuery(() => db.trips.toArray());
  const items = useLiveQuery(() => db.items.where('tripId').equals(tripId).sortBy('date')); // Sort by date primarily
  const [activeTab, setActiveTab] = useState<'itinerary' | 'flight' | 'car' | 'stay' | 'activity' | 'map'>('itinerary');
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedDateForAdd, setSelectedDateForAdd] = useState<string | undefined>(undefined);
  const [generating, setGenerating] = useState(false);

  // Derive days
  const days = trip ? getDaysArray(trip.startDate, trip.endDate) : [];

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
              imageUrl: imageUrl // Sharing image for the day's first activity or generating distinct ones would be better, but this works
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

  // Determine which type to default to when opening modal based on current tab
  const modalDefaultType: ItemType = (activeTab !== 'itinerary' && activeTab !== 'note' && activeTab !== 'map') ? activeTab : 'activity';

  return (
    <Layout title={trip.title || trip.destination}>
      {/* Hero Section */}
      <div className="relative rounded-[2.5rem] overflow-hidden h-64 sm:h-80 mb-8 group border-[6px] border-slate-200 dark:border-slate-800 shadow-2xl">
        <img 
          src={trip.coverImage || `https://picsum.photos/seed/${trip.destination}/1000/400`} 
          alt={trip.destination} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-8 sm:p-10">
          <div className="flex items-start justify-between">
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
            
            <div className="text-right hidden sm:block">
              <div className="bg-black/30 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 text-white font-black text-xl">
                 {days.length} Days
              </div>
            </div>
          </div>
        </div>
        
        {/* Magic Plan Button */}
        {(!items || items.length === 0) && (
           <div className="absolute top-6 right-6 z-10">
             <Button onClick={handleGenerateAI} disabled={generating} className="bg-white/90 text-brand-800 hover:bg-white border-0 shadow-xl backdrop-blur-md">
               <Wand2 className={`w-5 h-5 mr-2 ${generating ? 'animate-spin' : ''}`} />
               {generating ? 'Planning...' : 'Auto-Plan with AI'}
             </Button>
           </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto gap-3 pb-4 mb-4 no-scrollbar">
        {(['itinerary', 'flight', 'car', 'stay', 'activity', 'map'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-wider whitespace-nowrap transition-all border-b-[4px] active:border-b-0 active:translate-y-[4px] shadow-sm ${
              activeTab === tab 
                ? 'bg-[#0ea5e9] border-[#0369a1] text-white shadow-[#0ea5e9]/30' 
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {tab === 'map' ? (
                <span className="flex items-center gap-2"><Globe className="w-4 h-4" /> Map</span>
            ) : (
                tab.charAt(0).toUpperCase() + tab.slice(1)
            )}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="pb-32">
      {activeTab === 'map' ? (
        <Card className="p-0 overflow-hidden h-[500px] border-slate-200 dark:border-slate-700">
             <div className="relative w-full h-full bg-slate-50 dark:bg-slate-900">
                 <div className="absolute top-4 left-4 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm max-w-xs">
                     <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Travel Context</h3>
                     <div className="space-y-2 text-xs font-bold uppercase tracking-wide">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-brand-500 shadow-brand-500/50 shadow-sm"></span>
                            <span className="text-slate-600 dark:text-slate-300">Current Trip: {trip.destination}</span>
                        </div>
                        {allTrips && allTrips.length > 1 && (
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-indigo-300 dark:bg-indigo-700"></span>
                                <span className="text-slate-500 dark:text-slate-400">Other Trips ({allTrips.length - 1})</span>
                            </div>
                        )}
                     </div>
                 </div>
                 <ComposableMap projection="geoMercator" projectionConfig={{ scale: 110, center: [0, 20] }} style={{ width: "100%", height: "100%" }}>
                    <ZoomableGroup zoom={1} minZoom={0.7} maxZoom={4}>
                      <Geographies geography={GEO_URL}>
                        {({ geographies }) =>
                          geographies.map((geo) => {
                            const countryName = geo.properties.name;
                            const isCurrent = trip.destination === countryName || countryName.includes(trip.destination) || trip.destination.includes(countryName);
                            const isVisited = !isCurrent && allTrips?.some(t => 
                               t.destination === countryName || 
                               countryName.includes(t.destination) ||
                               t.destination.includes(countryName)
                            );
                            
                            return (
                              <Geography
                                key={geo.rsmKey}
                                geography={geo}
                                data-tooltip-id="detail-map-tooltip"
                                data-tooltip-content={countryName}
                                fill={isCurrent ? "#0ea5e9" : isVisited ? "#818cf8" : "var(--map-default)"}
                                stroke="var(--map-stroke)"
                                strokeWidth={0.5}
                                style={{
                                  default: { 
                                      fill: isCurrent ? "#0ea5e9" : isVisited ? "#6366f1" : "#cbd5e1", 
                                      outline: "none", 
                                      transition: "all 0.3s",
                                      filter: isCurrent ? "drop-shadow(0 0 8px rgba(14,165,233,0.4))" : "none"
                                  },
                                  hover: { 
                                      fill: isCurrent ? "#0284c7" : isVisited ? "#4f46e5" : "#94a3b8", 
                                      outline: "none", 
                                      cursor: "pointer" 
                                  },
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
                 <Tooltip id="detail-map-tooltip" className="z-50 !bg-slate-900 !text-white !font-bold !rounded-xl !text-xs !py-1 !px-3" />
             </div>
        </Card>
      ) : activeTab === 'itinerary' ? (
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
                    dayItems.map(item => (
                      <TripItemCard key={item.id} item={item} />
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
          {filteredItems?.map(item => (
            <TripItemCard key={item.id} item={item} />
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
    </Layout>
  );
};
