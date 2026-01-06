"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Check, Trash2, Plus, MousePointer2, Download, X } from "lucide-react";
import { toPng } from "html-to-image";

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
    // Helper to normalize class names to Title Case
    const formatClassName = (name: string) => {
        if (!name) return "";
        return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    };

    const [localPredictions, setLocalPredictions] = useState<Prediction[]>(() =>
        predictions.map(p => ({
            ...p,
            class: formatClassName(p.class)
        }))
    );
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [hiddenClasses, setHiddenClasses] = useState<Set<string>>(new Set());
    const captureRef = useRef<HTMLDivElement>(null);
    // exportRef removed as we capture the main view now

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
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
    const availableClasses = ["Perimeter", "Bathroom", "Window", "Door", "Stairs"];

    const [exportImageSrc, setExportImageSrc] = useState<string>("");

    // --- Image Handling Helpers ---

    const convertBlobToDataUrl = async (blobUrl: string): Promise<string> => {
        try {
            const response = await fetch(blobUrl);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (typeof reader.result === 'string') resolve(reader.result);
                    else reject(new Error("Failed to convert blob to base64"));
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.error("Image conversion failed", e);
            return blobUrl; // Fallback
        }
    };

    // Effect to convert blob URL to data URL on mount/change
    useEffect(() => {
        if (imageSrc && !exportImageSrc) {
            convertBlobToDataUrl(imageSrc).then(setExportImageSrc);
        }
    }, [imageSrc]);

    // --- Interaction Handlers ---

    const handleGeneratePreview = async () => {
        if (!captureRef.current) return;

        try {
            // Ensure we have a robust Data URL source before capturing
            let activeSrc = exportImageSrc;
            if (!activeSrc && imageSrc) {
                console.log("Generating Data URL for export...");
                activeSrc = await convertBlobToDataUrl(imageSrc);
                setExportImageSrc(activeSrc); // Update state for future

                // CRITICAL FIX: Manually update the DOM element immediately to bypass React render cycle lag
                if (imageRef.current) {
                    imageRef.current.src = activeSrc;
                }
            }

            // Ensure the image element is fully decoded and ready
            if (imageRef.current) {
                // Wait for the new source to load if it changed or wasn't ready
                if (!imageRef.current.complete || imageRef.current.src !== (activeSrc || imageSrc)) {
                    await new Promise((resolve) => {
                        if (!imageRef.current) return resolve(null);
                        imageRef.current.onload = resolve;
                        imageRef.current.onerror = resolve;
                        // Timeout just in case
                        setTimeout(resolve, 500);
                    });
                }
                // Force decode ensuring it's painted
                try { await imageRef.current.decode(); } catch (e) { }
            }

            // Generate screenshot
            const dataUrl = await toPng(captureRef.current, {
                pixelRatio: 2,
                backgroundColor: "#000000",
                filter: (node) => {
                    if (node instanceof HTMLElement && node.classList.contains('exclude-from-export')) {
                        return false;
                    }
                    return true;
                }
            });

            setPreviewImage(dataUrl);
            setShowExportModal(true);
        } catch (error) {
            console.error("Preview generation failed:", error);
        }
    };

    const handleSaveImage = () => {
        if (!previewImage) return;
        const link = document.createElement('a');
        link.download = 'floorplan-analysis.png';
        link.href = previewImage;
        link.click();
    };

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
        <div className="w-full h-screen flex items-center justify-center relative p-8">

            {/* Download Button */}
            <button
                onClick={handleGeneratePreview}
                className="absolute top-8 right-8 z-50 p-3 bg-black/50 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-white/10 hover:scale-110 active:scale-95 transition-all shadow-xl group"
                title="Save Image"
            >
                <Download size={24} className="group-hover:text-blue-400 transition-colors" />
            </button>

            <div ref={captureRef} className="flex items-center justify-center gap-10 max-w-full max-h-full p-4 bg-black"> {/* Added bg-black to ensure captured background is black */}
                {/* Summary Panel - Dynamic Side Section */}
                <div className="flex flex-col gap-2 pointer-events-none z-40 shrink-0 min-w-[160px] border-r border-dashed border-white/10 pr-6 mr-2">
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
                                    className={`pointer-events-auto flex items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-sm p-3 border transition-all duration-200 cursor-pointer group
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
                                    <span className={`text-xl font-bold font-mono-nums ${hiddenClasses.has(className) ? "text-slate-700" : "text-white"}`}>
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
                        src={exportImageSrc || imageSrc}
                        alt="Floor Plan"
                        className={`max-h-[85vh] max-w-full w-auto object-contain rounded-lg shadow-2xl shadow-blue-900/20 transition-all duration-300 ${isEditing && activeTool === "add" ? "cursor-crosshair opacity-90" : ""} ${isEditing && activeTool === "remove" ? "opacity-90 grayscale-[0.3]" : ""}`}
                        draggable={false}
                        crossOrigin="anonymous"
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
                                        backgroundColor = "#ef444440";
                                        boxShadow = "0 0 15px #ef444440";
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
                                                zIndex: 10 + idx,
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
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto flex items-center justify-center w-14 h-14 group">
                                                    <div className="text-red-100 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] transition-all duration-200 group-hover:scale-125 group-hover:text-red-500 group-hover:drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]">
                                                        <Trash2 size={24} />
                                                    </div>
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

                    {/* Edit Panel - Attached to Right Side of Image - Tagged for exclusion */}
                    <div
                        className="absolute left-full top-1/2 -translate-y-1/2 ml-4 flex flex-row items-center gap-4 pointer-events-none z-50 exclude-from-export"
                        data-html2canvas-ignore="true"
                    >

                        <motion.div
                            layout
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            onClick={() => !isEditing && setIsEditing(true)}
                            className={`pointer-events-auto transition-colors duration-200 border border-slate-700 shadow-2xl overflow-hidden
                                ${isEditing
                                    ? "bg-slate-950/80 backdrop-blur-md p-5 rounded-2xl border-white/10 min-w-[260px] cursor-default"
                                    : "bg-black hover:border-blue-500 w-14 h-14 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 shadow-blue-900/20"
                                }
                            `}
                        >
                            <AnimatePresence mode="popLayout" initial={false}>
                                {isEditing ? (
                                    <motion.div
                                        key="panel-content"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)", transition: { duration: 0.1 } }}
                                        className="flex flex-col gap-6 min-w-[260px]"
                                    >
                                        {/* Header with Done Button */}
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-white font-bold text-lg tracking-tight">Edit Mode</h3>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsEditing(false);
                                                }}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-full transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 active:scale-95 outline-none focus:outline-none focus:ring-0"
                                            >
                                                <Check size={14} />
                                                DONE
                                            </button>
                                        </div>

                                        {/* Tools Segmented Control */}
                                        <div className="flex bg-slate-900/50 p-1 rounded-lg border border-white/5">
                                            <button
                                                onClick={() => setActiveTool("add")}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all text-xs font-bold uppercase tracking-wide outline-none focus:outline-none focus:ring-0
                                                    ${activeTool === "add"
                                                        ? "bg-slate-800 text-white shadow-md border border-white/5"
                                                        : "text-slate-500 hover:text-slate-300"
                                                    }`}
                                            >
                                                <Plus size={14} />
                                                Add
                                            </button>
                                            <button
                                                onClick={() => setActiveTool("remove")}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all text-xs font-bold uppercase tracking-wide outline-none focus:outline-none focus:ring-0
                                                    ${activeTool === "remove"
                                                        ? "bg-slate-800 text-red-400 shadow-md border border-white/5"
                                                        : "text-slate-500 hover:text-slate-300"
                                                    }`}
                                            >
                                                <Trash2 size={14} />
                                                Remove
                                            </button>
                                        </div>

                                        {/* Class Selection List */}
                                        <div className={`flex flex-col gap-1 transition-all duration-300 ${activeTool === "remove" ? "opacity-30 pointer-events-none blur-sm" : ""}`}>
                                            <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
                                                {availableClasses.map(cls => (
                                                    <button
                                                        key={cls}
                                                        onClick={() => setSelectedClass(cls)}
                                                        className={`group flex items-center justify-between p-3 rounded-lg text-sm transition-all border border-transparent outline-none ring-0 focus:outline-none focus:ring-0
                                                            ${selectedClass === cls
                                                                ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                                                                : "hover:bg-white/5 text-slate-400 hover:text-white"
                                                            }`}
                                                    >
                                                        <span className="font-medium">{cls}</span>
                                                        {selectedClass === cls && (
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="pencil-icon"
                                        initial={{ opacity: 0, rotate: -90 }}
                                        animate={{ opacity: 1, rotate: 0 }}
                                        exit={{ opacity: 0, rotate: 90 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <Pencil size={24} className="text-white" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                </div>

            </div>

            {/* --- EXPORT PREVIEW MODAL --- */}
            <AnimatePresence>
                {showExportModal && previewImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-8"
                    >
                        {/* Modal Header actions */}
                        <div className="absolute top-8 right-8 flex items-center gap-4 z-[110]">
                            <button
                                onClick={() => setShowExportModal(false)}
                                className="p-3 text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>
                            <button
                                onClick={handleSaveImage}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full transition-all shadow-lg hover:shadow-blue-500/50 active:scale-95"
                            >
                                <Download size={20} />
                                SAVE IMAGE
                            </button>
                        </div>

                        {/* Image Preview */}
                        <div className="w-full h-full flex items-center justify-center overflow-auto p-12">
                            <img
                                src={previewImage}
                                alt="Export Preview"
                                className="max-w-full max-h-full object-contain rounded-xl border border-white/10 shadow-2xl"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
