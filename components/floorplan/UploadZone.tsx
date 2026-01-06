"use client";

import { Upload, FileImage, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils"; // We might need to create this util or just inline it

// Simplified util since we didn't strictly set up @/lib/utils yet, I'll keep it inline if simpler, but let's assume raw className
function UploadZone({ onFileSelect, isProcessing }: { onFileSelect: (file: File) => void, isProcessing: boolean }) {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith("image/")) {
                onFileSelect(file);
            }
        }
    }, [onFileSelect]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    }, [onFileSelect]);

    return (
        <div className="flex flex-col items-center gap-6 animate-fade-in">
            <div
                className={`
                    group relative overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-300 ease-out cursor-pointer
                    w-full max-w-2xl h-80 flex flex-col items-center justify-center gap-4
                    ${isDragging
                        ? "border-blue-500 bg-blue-500/10 scale-[1.02]"
                        : "border-slate-700 bg-slate-950/30 hover:bg-slate-900/50 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10"
                    }
                    ${isProcessing ? "opacity-50 pointer-events-none grayscale" : ""}
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload')?.click()}
            >

                <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    onChange={handleFileInput}
                    accept="image/*"
                    disabled={isProcessing}
                />

                <div className="relative z-10 flex flex-col items-center gap-4">
                    {isProcessing ? (
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                            <span className="text-blue-500 font-medium animate-pulse">Processing Image...</span>
                        </div>
                    ) : (
                        <>
                            <div className={`p-6 rounded-full bg-slate-900 border border-slate-800 group-hover:border-blue-500/50 group-hover:scale-110 transition-all duration-300 ${isDragging ? "border-blue-500 bg-blue-500/20 text-blue-400" : "text-slate-400 group-hover:text-blue-400"}`}>
                                <Upload className="w-10 h-10" />
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <span className="font-bold text-lg text-slate-200 group-hover:text-white transition-colors">
                                    Drop your floor plan here
                                </span>
                                <span className="text-slate-500 text-sm font-medium">
                                    or click to browse
                                </span>
                            </div>
                        </>
                    )}
                </div>

                {/* Shine effect on hover */}
                <div className="absolute inset-0 z-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>

            <p className="text-sm text-slate-500 font-medium">
                Supported formats: PNG, JPG
            </p>

            <div className="w-full pt-8 border-t border-slate-800/50 flex flex-col items-center gap-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                    Or try one of these
                </p>
                <div className="grid grid-cols-3 gap-6 w-full max-w-2xl">
                    {[1, 2, 3].map((i) => (
                        <button
                            key={i}
                            onClick={async () => {
                                try {
                                    const response = await fetch(`/examples/sample_${i}.png`);
                                    const blob = await response.blob();
                                    const file = new File([blob], `sample_${i}.png`, { type: "image/png" });
                                    onFileSelect(file);
                                } catch (error) {
                                    console.error("Error loading sample:", error);
                                }
                            }}
                            className="group/thumb relative aspect-square rounded-2xl overflow-hidden border border-slate-800 hover:border-blue-500 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-blue-500/20"
                            disabled={isProcessing}
                        >
                            <img
                                src={`/examples/sample_${i}.png`}
                                alt={`Sample ${i}`}
                                className="w-full h-full object-cover opacity-50 grayscale group-hover/thumb:opacity-100 group-hover/thumb:grayscale-0 transition-all duration-500 scale-105 group-hover/thumb:scale-100"
                            />
                            {/* Overlay for hover state */}
                            <div className="absolute inset-0 bg-blue-500/0 group-hover/thumb:bg-blue-500/10 transition-colors duration-300" />

                            {/* Hover Badge */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-all duration-300 transform translate-y-4 group-hover/thumb:translate-y-0">
                                <span className="px-3 py-1 bg-black/80 backdrop-blur text-white text-xs font-bold rounded-full border border-white/10">
                                    Try This
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div >
    );
}

export default UploadZone;
