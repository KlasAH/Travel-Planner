import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { TripListPage } from './features/TripList';
import { TripDetailPage } from './features/TripDetail';
import { SettingsPage } from './features/Settings';

const App = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<TripListPage />} />
        <Route path="/trip/:id" element={<TripDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
