
import Dexie, { Table } from 'dexie';
import { Trip, TripItem } from './types';

class TravelPlannerDB extends Dexie {
  trips!: Table<Trip>;
  items!: Table<TripItem>;

  constructor() {
    super('TravelPlannerDB');
    (this as any).version(1).stores({
      trips: '++id, destination, startDate, endDate',
      items: '++id, tripId, type, date, endDate'
    });
    // Version 2 to support title indexing if we wanted to be strict, but V1 works for implicit fields.
    // Keeping implicit update for now to avoid migration complexity in this snippet.
  }
}

export const db = new TravelPlannerDB();
