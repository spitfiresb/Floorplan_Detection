"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Check, Trash2, Plus, MousePointer2 } from "lucide-react";

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
    const [localPredictions, setLocalPredictions] = useState<Prediction[]>(predictions);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [hiddenClasses, setHiddenClasses] = useState<Set<string>>(new Set());

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [activeTool, setActiveTool] = useState<"add" | "remove">("add");
    const [selectedClass, setSelectedClass] = useState<string>("Door");

    // Drawing State
    const [drawStart, setDrawStart] = useState<{ x: number, y: number } | null>(null);
    const [drawCurrent, setDrawCurrent] = useState<{ x: number, y: number } | null>(null);
    const imageRef = useRef<HTMLImageElement>(null);

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
    const sortedPredictions = [...localPredictions].sort((a, b) => {
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

    // Calculate summary statistics
    const summaryData = sortedPredictions.reduce((acc, curr, idx) => {
        if (!acc[curr.class]) {
            acc[curr.class] = { count: 0, firstIndex: idx };
        }
        acc[curr.class].count += 1;
        return acc;
    }, {} as Record<string, { count: number; firstIndex: number }>);

    // Get all unique classes for the selector, plus some defaults
    const availableClasses = Array.from(new Set([...Object.keys(summaryData), "Door", "Window", "Opening", "Stairs", "Shower", "Toilet", "Sink"]));

    // --- Interaction Handlers ---

    const handleMouseDown = (e: React.MouseEvent) => {
        // Only allow drawing if in Edit Mode AND Add Tool is selected
        if (!isEditing || activeTool !== "add" || !imageRef.current) return;

        const rect = imageRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setDrawStart({ x, y });
        setDrawCurrent({ x, y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isEditing || activeTool !== "add" || !drawStart || !imageRef.current) return;

        const rect = imageRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

        setDrawCurrent({ x, y });
    };

    const handleMouseUp = () => {
        if (!isEditing || activeTool !== "add" || !drawStart || !drawCurrent || !imageRef.current || !imageWidth || !imageHeight) {
            setDrawStart(null);
            setDrawCurrent(null);
            return;
        }

        // Calculate box dimensions in displayed pixels
        const x1 = Math.min(drawStart.x, drawCurrent.x);
        const y1 = Math.min(drawStart.y, drawCurrent.y);
        const w = Math.abs(drawCurrent.x - drawStart.x);
        const h = Math.abs(drawCurrent.y - drawStart.y);

        // Ignore tiny accidental clicks
        if (w < 10 || h < 10) {
            setDrawStart(null);
            setDrawCurrent(null);
            return;
        }

        // Convert to original image coordinates
        const rect = imageRef.current.getBoundingClientRect();
        const scaleX = imageWidth / rect.width;
        const scaleY = imageHeight / rect.height;

        const centerX = (x1 + w / 2) * scaleX;
        const centerY = (y1 + h / 2) * scaleY;
        const newWidth = w * scaleX;
        const newHeight = h * scaleY;

        const newPrediction: Prediction = {
            class: selectedClass,
            x: centerX,
            y: centerY,
            width: newWidth,
            height: newHeight,
            confidence: 1.0,
            id: Math.random().toString(36).substr(2, 9)
        };

        setLocalPredictions(prev => [...prev, newPrediction]);
        setDrawStart(null);
        setDrawCurrent(null);
    };

    const removePrediction = (predToRemove: Prediction) => {
        // Only allow removal if in Edit Mode AND Remove Tool is selected
        if (!isEditing || activeTool !== "remove") return;
        setLocalPredictions(prev => prev.filter(p => p !== predToRemove));
    };

    return (
        <div className="w-full h-full flex items-center justify-center overflow-hidden bg-black relative p-8">

            <div className="flex items-center justify-center gap-10 max-w-full max-h-full translate-y-6">
                {/* Summary Panel - Dynamic Side Section */}
                <div className="flex flex-col gap-2 pointer-events-none z-40 shrink-0 min-w-[160px]">
                    <AnimatePresence>
                        {Object.entries(summaryData).map(([className, data]) => {
                            const color = classColors.get(className);
                            return (
                                <motion.div
                                    key={className}
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{
                                        delay: data.firstIndex * 0.05,
                                        type: "spring",
                                        stiffness: 100
                                    }}
                                    onClick={() => toggleClass(className)}
                                    className={`pointer-events-auto flex items-center justify-between gap-4 bg-black p-3 border transition-all duration-200 cursor-pointer group
                                        ${hiddenClasses.has(className)
                                            ? "opacity-50 grayscale border-slate-900"
                                            : "border-slate-800 hover:border-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Color Indicator */}
                                        <div
                                            className="w-2 h-2 rounded-none"
                                            style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}80` }}
                                        />
                                        <span className={`text-xs font-bold uppercase tracking-widest transition-colors ${hiddenClasses.has(className) ? "text-slate-600" : "text-slate-300 group-hover:text-white"}`}>
                                            {className}
                                        </span>
                                    </div>
                                    <span className={`text-xl font-bold ${hiddenClasses.has(className) ? "text-slate-700" : "text-white"}`}>
                                        {data.count}
                                    </span>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {/* Image Viewer Area */}
                <div
                    className="relative inline-block max-w-full max-h-full shrink group/image select-none"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {/* Image rendering */}
                    <img
                        ref={imageRef}
                        src={imageSrc}
                        alt="Floor Plan"
                        className={`max-h-[85vh] max-w-full w-auto object-contain rounded-lg shadow-2xl transition-all duration-300 ${isEditing && activeTool === "add" ? "cursor-crosshair opacity-90" : ""} ${isEditing && activeTool === "remove" ? "opacity-90 grayscale-[0.3]" : ""}`}
                        draggable={false}
                    />

                    {/* Overlay Layer */}
                    <div className="absolute inset-0 pointer-events-none">
                        <AnimatePresence>
                            {sortedPredictions
                                .filter(pred => !hiddenClasses.has(pred.class))
                                .map((pred, idx) => {
                                    const color = classColors.get(pred.class) || "#fff";
                                    const uniqueKey = pred.id || `${pred.class}-${pred.x}-${pred.y}-${pred.width}-${pred.height}`;
                                    const isHovered = hoveredId === uniqueKey;

                                    if (!imageWidth || !imageHeight) return null;

                                    const left = ((pred.x - pred.width / 2) / imageWidth) * 100;
                                    const top = ((pred.y - pred.height / 2) / imageHeight) * 100;
                                    const width = (pred.width / imageWidth) * 100;
                                    const height = (pred.height / imageHeight) * 100;

                                    // Determine styling based on state
                                    const isRemoveMode = isEditing && activeTool === "remove";

                                    // Visual states
                                    let borderColor = color;
                                    let backgroundColor = isHovered ? `${color}33` : "transparent";
                                    let boxShadow = isHovered ? `0 0 20px ${color}40` : "none";

                                    if (isRemoveMode && isHovered) {
                                        borderColor = "#ef4444";
                                        backgroundColor = "#ef444455";
                                        boxShadow = "0 0 20px #ef444480";
                                    }

                                    return (
                                        <motion.div
                                            key={uniqueKey}
                                            initial={{ opacity: 0, scale: 0 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{
                                                duration: 0.5,
                                                delay: idx * 0.05,
                                                type: "spring",
                                                stiffness: 200,
                                                damping: 20
                                            }}
                                            exit={{ opacity: 0, scale: 0 }}
                                            className={`absolute border-[3px] md:border-4 pointer-events-auto transition-colors duration-200 
                                                ${!isEditing ? "cursor-pointer group" : ""}
                                                ${isRemoveMode ? "cursor-pointer hover:z-50" : ""}
                                            `}
                                            style={{
                                                left: `${left}%`,
                                                top: `${top}%`,
                                                width: `${width}%`,
                                                height: `${height}%`,
                                                borderColor,
                                                backgroundColor,
                                                zIndex: isRemoveMode && isHovered ? 100 : 10 + idx,
                                                boxShadow
                                            }}
                                            onMouseEnter={() => setHoveredId(uniqueKey)}
                                            onMouseLeave={() => setHoveredId(null)}
                                            onClick={(e) => {
                                                if (isRemoveMode) {
                                                    e.stopPropagation();
                                                    removePrediction(pred);
                                                }
                                            }}
                                        >
                                            {/* Tooltip (Show when NOT editing, OR when in Remove mode to identify what you're deleting) */}
                                            {isHovered && (!isEditing || isRemoveMode) && (
                                                <div
                                                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 rounded-none bg-black border border-slate-700 text-xs font-bold text-white whitespace-nowrap z-50 shadow-xl pointer-events-none"
                                                    style={{
                                                        boxShadow: `0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)`
                                                    }}
                                                >
                                                    {isRemoveMode ? `DELETE ${pred.class}` : pred.class}
                                                </div>
                                            )}

                                            {/* Delete Icon (Only show if Remove Mode and Hovering) */}
                                            {isHovered && isRemoveMode && (
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-2 bg-red-600 rounded-none shadow-lg text-white">
                                                    <Trash2 size={24} />
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                        </AnimatePresence>

                        {/* Drawing Preview Box */}
                        {isEditing && activeTool === "add" && drawStart && drawCurrent && (
                            <div
                                className="absolute border-2 border-white bg-white/20 z-50 pointer-events-none"
                                style={{
                                    left: Math.min(drawStart.x, drawCurrent.x),
                                    top: Math.min(drawStart.y, drawCurrent.y),
                                    width: Math.abs(drawCurrent.x - drawStart.x),
                                    height: Math.abs(drawCurrent.y - drawStart.y),
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* Edit Panel (Right Side) - REFAC T ORED UI */}
                <div className="flex flex-col gap-3 pointer-events-none z-40 shrink-0 h-[85vh] items-end">

                    {/* Main Edit Toggle */}
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`pointer-events-auto w-14 h-14 flex items-center justify-center rounded-none shadow-xl transition-all duration-200 border border-slate-700
                            ${isEditing
                                ? "bg-blue-600 text-white border-blue-500"
                                : "bg-black text-slate-400 hover:text-white hover:border-blue-500 hover:shadow-blue-900/20"
                            }`}
                        title={isEditing ? "Done Editing" : "Edit Elements"}
                    >
                        {isEditing ? <Check size={24} /> : <Pencil size={24} />}
                    </button>

                    <AnimatePresence>
                        {isEditing && (
                            <motion.div
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: 20, opacity: 0 }}
                                transition={{ type: "tween", duration: 0.2 }}
                                className="pointer-events-auto flex flex-col gap-4 bg-black p-4 rounded-none border border-slate-800 shadow-2xl min-w-[240px]"
                            >
                                {/* Tool Selection */}
                                <div className="flex flex-col gap-2">
                                    <div className="text-[10px] items-center text-slate-500 uppercase tracking-widest font-bold flex gap-2">
                                        <div className="h-[1px] bg-slate-800 flex-grow"></div>
                                        Tools
                                        <div className="h-[1px] bg-slate-800 flex-grow"></div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setActiveTool("add")}
                                            className={`flex flex-col items-center justify-center p-3 gap-2 border transition-all duration-200
                                                ${activeTool === "add"
                                                    ? "bg-slate-900 border-blue-500 text-blue-500"
                                                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-white"
                                                }`}
                                        >
                                            <Plus size={20} />
                                            <span className="text-xs font-bold uppercase">Add</span>
                                        </button>

                                        <button
                                            onClick={() => setActiveTool("remove")}
                                            className={`flex flex-col items-center justify-center p-3 gap-2 border transition-all duration-200
                                                ${activeTool === "remove"
                                                    ? "bg-slate-900 border-red-500 text-red-500"
                                                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-white"
                                                }`}
                                        >
                                            <Trash2 size={20} />
                                            <span className="text-xs font-bold uppercase">Remove</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Class Selection (Only for Add Tool) */}
                                <AnimatePresence mode="popLayout">
                                    {activeTool === "add" && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="flex flex-col gap-2 overflow-hidden"
                                        >
                                            <div className="text-[10px] items-center text-slate-500 uppercase tracking-widest font-bold flex gap-2 mt-2">
                                                <div className="h-[1px] bg-slate-800 flex-grow"></div>
                                                Class
                                                <div className="h-[1px] bg-slate-800 flex-grow"></div>
                                            </div>

                                            <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                                                {availableClasses.map(cls => (
                                                    <button
                                                        key={cls}
                                                        onClick={() => setSelectedClass(cls)}
                                                        className={`flex items-center justify-between p-3 text-sm transition-all border border-l-4
                                                            ${selectedClass === cls
                                                                ? "bg-slate-900 border-slate-800 border-l-blue-500 text-white"
                                                                : "bg-transparent border-transparent border-l-transparent text-slate-400 hover:bg-slate-900 hover:text-white"
                                                            }`}
                                                    >
                                                        {cls}
                                                        {selectedClass === cls && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>}
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Instructions (For Remove Tool) */}
                                    {activeTool === "remove" && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="p-4 bg-slate-900/50 border border-slate-800 text-center"
                                        >
                                            <p className="text-xs text-slate-400 leading-relaxed">
                                                Click on any highlighted box in the image to remove it permanently from the list.
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

            </div>
        </div>
    );
}
