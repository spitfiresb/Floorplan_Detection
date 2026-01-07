import React from 'react';
import { Home } from 'lucide-react';

export const Header: React.FC<{ onGoHome: () => void }> = ({ onGoHome }) => {
  return (
    <header className="w-full border-b-2 border-ink py-4 px-6 md:px-12 flex justify-between items-center bg-paper sticky top-0 z-50">
      <div
        className="flex items-center gap-3 cursor-pointer group"
        onClick={onGoHome}
      >
        <Home className="w-8 h-8 text-ink group-hover:scale-110 transition-transform" />
        <h1 className="text-2xl font-hand font-bold text-ink">FloorSense</h1>
      </div>

      <div className="hidden md:flex gap-6 font-hand text-lg">
        <span>Intelligent Floorplan Analysis</span>
      </div>


    </header>
  );
};