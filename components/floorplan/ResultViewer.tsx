"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface Prediction {
    class: string;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
    color?: string;
    id?: string;
}

interface ResultViewerProps {
    imageSrc: string;
    predictions: Prediction[];
    imageWidth?: number;
    imageHeight?: number;
}

// Color palette for classes
const COLORS = [
    "#6366f1", // Indigo
    "#ec4899", // Pink
    "#22c55e", // Green
    "#f97316", // Orange
    "#a855f7", // Purple
    "#0ea5e9", // Sky
    "#eab308", // Yellow
    "#ef4444", // Red
];

export default function ResultViewer({ imageSrc, predictions, imageWidth, imageHeight }: ResultViewerProps) {
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [hiddenClasses, setHiddenClasses] = useState<Set<string>>(new Set());

    const toggleClass = (className: string) => {
        setHiddenClasses(prev => {
            const next = new Set(prev);
            if (next.has(className)) {
                next.delete(className);
            } else {
                next.add(className);
            }
            return next;
        });
    };

    // Sort predictions by area (descending) so smaller items render on top (appear later in DOM)
    const sortedPredictions = [...predictions].sort((a, b) => {
        const areaA = a.width * a.height;
        const areaB = b.width * b.height;
        return areaB - areaA;
    });

    // Assign colors to classes consistently
    const classColors = new Map<string, string>();
    sortedPredictions.forEach((p) => {
        if (!classColors.has(p.class)) {
            classColors.set(p.class, COLORS[classColors.size % COLORS.length]);
        }
    });

    // Calculate summary statistics and find first appearance for sync
    const summaryData = sortedPredictions.reduce((acc, curr, idx) => {
        if (!acc[curr.class]) {
            acc[curr.class] = { count: 0, firstIndex: idx };
        }
        acc[curr.class].count += 1;
        return acc;
    }, {} as Record<string, { count: number; firstIndex: number }>);

    return (
        <div className="w-full h-full flex items-center justify-center overflow-hidden bg-slate-950 relative">

            {/* Summary Panel - Dynamic Side Section */}
            <div className="absolute top-1/2 -translate-y-1/2 left-8 z-40 flex flex-col gap-3 pointer-events-none">
                <AnimatePresence>
                    {Object.entries(summaryData).map(([className, data]) => {
                        const color = classColors.get(className);
                        return (
                            <motion.div
                                key={className}
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{
                                    delay: data.firstIndex * 0.05, // Sync exactly with the first box of this class
                                    type: "spring",
                                    stiffness: 100
                                }}
                                onClick={() => toggleClass(className)}
                                className={`pointer-events-auto flex items-center gap-3 bg-slate-900/80 backdrop-blur-md p-3 pr-6 rounded-l-md rounded-r-xl border-l-4 shadow-xl border-white/10 cursor-pointer hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all duration-200 ${hiddenClasses.has(className) ? "opacity-50 grayscale" : ""
                                    }`}
                                style={{ borderLeftColor: color }}
                            >
                                <span className="text-2xl font-bold text-white">{data.count}</span>
                                <span className="text-sm font-medium text-slate-300 uppercase tracking-wider">{className}</span>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Image Viewer Area */}
            {/* We center the image in the full screen container */}
            <div className="relative inline-block max-w-full max-h-full">
                <img
                    src={imageSrc}
                    alt="Floor Plan"
                    className="max-h-screen w-auto object-contain rounded-lg shadow-2xl"
                />

                {/* Overlay Layer */}
                <div className="absolute inset-0 pointer-events-none">
                    <AnimatePresence>
                        {sortedPredictions
                            .filter(pred => !hiddenClasses.has(pred.class))
                            .map((pred, idx) => {
                                const color = classColors.get(pred.class) || "#fff";
                                // Create a stable key for animation to work correctly when filtering
                                const uniqueKey = `${pred.class}-${pred.x}-${pred.y}-${pred.width}-${pred.height}`;
                                const isHovered = hoveredId === uniqueKey;

                                // Safe guard against missing dimensions
                                if (!imageWidth || !imageHeight) return null;

                                const left = ((pred.x - pred.width / 2) / imageWidth) * 100;
                                const top = ((pred.y - pred.height / 2) / imageHeight) * 100;
                                const width = (pred.width / imageWidth) * 100;
                                const height = (pred.height / imageHeight) * 100;

                                return (
                                    <motion.div
                                        key={uniqueKey}
                                        initial={{ opacity: 0, scale: 0 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{
                                            duration: 0.5,
                                            delay: idx * 0.05, // Stagger effect
                                            type: "spring",
                                            stiffness: 200,
                                            damping: 20
                                        }}
                                        exit={{ opacity: 0, scale: 0 }}
                                        className="absolute border-[3px] md:border-4 pointer-events-auto cursor-pointer group"
                                        style={{
                                            left: `${left}%`,
                                            top: `${top}%`,
                                            width: `${width}%`,
                                            height: `${height}%`,
                                            borderColor: color,
                                            backgroundColor: isHovered ? `${color}33` : "transparent",
                                            zIndex: 10 + idx, // Explicit z-index stack: Smaller items (higher idx) on top
                                            boxShadow: `0 0 20px ${color}40` // Glow effect
                                        }}
                                        onMouseEnter={() => setHoveredId(uniqueKey)}
                                        onMouseLeave={() => setHoveredId(null)}
                                    >
                                        {/* Tooltip */}
                                        {isHovered && (
                                            <div
                                                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 rounded-md text-xs font-bold text-white whitespace-nowrap z-50 shadow-lg pointer-events-none"
                                                style={{ backgroundColor: color }}
                                            >
                                                {pred.class} ({Math.round(pred.confidence * 100)}%)
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}
                    </AnimatePresence>
                </div>
            </div>

        </div>
    );
}
