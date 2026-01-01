

export interface Trip {
  id?: number;
  title?: string; // Name of the trip
  destination: string; // Country/Place
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  tags?: string[]; // Interests connected words
  notes?: string; // Legacy notes or extra details
  coverImage?: string;
  customMapImage?: string; // User uploaded map
}

export type ItemType = 'flight' | 'car' | 'stay' | 'activity' | 'note';

export interface TripItem {
  id?: number;
  tripId: number;
  type: ItemType;
  title: string;
  date: string; // Start Date (YYYY-MM-DD)
  endDate?: string; // For Stays/Car Rentals (YYYY-MM-DD)
  
  // Time
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  
  // Common
  location?: string; // General location / Hotel Address / Activity spot
  cost?: number;
  details?: string; // Notes / Description
  bookingRef?: string; // Booking Number
  completed?: boolean;
  
  // New Fields
  bookingLink?: string;
  imageUrl?: string;

  // Flight Specific
  departureAirport?: string;
  arrivalAirport?: string;
  duration?: string;

  // Car Rental Specific
  pickupLocation?: string;
  dropoffLocation?: string;
  
  // Stay Specific
  // Uses location for Hotel Name, date/endDate for Check-in/out
}

export interface BackupData {
  trips: Trip[];
  items: TripItem[];
  exportedAt: string;
}

export interface SharedTripData {
  trip: Trip;
  items: TripItem[];
  sharedAt: string;
  version: number;
}

export interface AIItineraryRequest {
  destination: string;
  startDate: string;
  endDate: string;
  interests: string;
}