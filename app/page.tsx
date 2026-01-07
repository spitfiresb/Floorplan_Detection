"use client";

import React, { useState } from 'react';
import { Header } from '../components/Header';
import { Landing } from '../components/Landing';
import { UploadZone } from '../components/UploadZone';
import { Viewer } from '../components/Viewer';
import { analyzeFloorPlan } from '../lib/analysis';
import { AppState, AnalysisResult } from '../types';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [state, setState] = useState<AppState>('landing');
  const [image, setImage] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStart = () => setState('uploading');
  const handleGoHome = () => {
    setState('landing');
    setImage(null);
    setAnalysisData(null);
    setError(null);
  };

  const handleImageSelected = async (base64: string) => {
    setImage(base64);
    setState('analyzing');
    setError(null);

    try {
      const result = await analyzeFloorPlan(base64);
      // Ensure we have IDs for elements if Gemini doesn't provide them
      const elementsWithIds = result.elements.map((el, i) => ({
        ...el,
        id: el.id || `el-${i}`
      }));

      setAnalysisData({ ...result, elements: elementsWithIds });
      setState('viewing');
    } catch (err) {
      setError("Failed to analyze floor plan. Please try again.");
      setState('uploading');
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink font-sans selection:bg-sketch-pink selection:text-white">
      <Header onGoHome={handleGoHome} />

      <main className="container mx-auto pb-12">
        {state === 'landing' && <Landing onStart={handleStart} />}

        {state === 'uploading' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <UploadZone onImageSelected={handleImageSelected} />
            {error && (
              <div className="mt-4 p-4 bg-red-50 border-2 border-red-500 text-red-700 font-hand text-xl rounded shadow-sketch">
                Error: {error}
              </div>
            )}
          </div>
        )}

        {state === 'analyzing' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-pulse">
            <div className="relative">
              <div className="w-32 h-32 border-4 border-ink border-dashed rounded-full animate-spin-slow"></div>
              <Loader2 className="w-16 h-16 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" />
            </div>
            <h2 className="font-hand text-4xl">Analyzing Architecture...</h2>
            <p className="font-hand text-xl text-gray-500">Identifying walls, windows, and doors.</p>
          </div>
        )}

        {(state === 'viewing' || state === 'editing') && image && analysisData && (
          <div className="mt-8 animate-fade-in-up">
            <Viewer image={image} data={analysisData} />
          </div>
        )}
      </main>

      <footer className="w-full text-center py-8 border-t-2 border-gray-200 mt-auto bg-white/50">
        <div className="flex flex-col gap-2 font-hand text-lg text-gray-500">
          <p>Designed by <span className="text-sketch-pink font-bold">Stitch</span></p>
          <p className="text-sm">Powered by Roboflow</p>
        </div>
      </footer>
    </div>
  );
}
