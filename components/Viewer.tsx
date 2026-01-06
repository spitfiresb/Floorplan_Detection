import React, { useState, useEffect, useRef } from 'react';
import { AnalysisResult, PlanElement, ElementType } from '../types';
import { Button } from './Button';
import { Save, Edit2, Check, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ViewerProps {
  image: string;
  data: AnalysisResult;
}

// Color mapping for different element types
const COLORS = {
  perimeter: '#4a90e2', // sketch-blue
  bathroom: '#e24a8d',  // sketch-pink
  window: '#50e3c2',    // sketch-green
  door: '#f5a623',      // sketch-orange
  stairs: '#9b59b6',
  furniture: '#95a5a6'
};

export const Viewer: React.FC<ViewerProps> = ({ image, data }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [elements, setElements] = useState<PlanElement[]>(data.elements);
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({
    perimeter: true,
    bathroom: true,
    window: true,
    door: true,
    stairs: true
  });

  // Edit Mode State
  const [editAction, setEditAction] = useState<'none' | 'add' | 'remove'>('none');
  const [selectedType, setSelectedType] = useState<ElementType>('window');
  const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null);
  const [currentDrag, setCurrentDrag] = useState<{ x: number, y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Sync elements if data changes (e.g. new upload)
  useEffect(() => {
    // Sort elements by xmin (index 1 of box_2d) to ensure left-to-right animation
    const sorted = [...data.elements].sort((a, b) => a.box_2d[1] - b.box_2d[1]);
    setElements(sorted);
  }, [data]);

  const toggleLayer = (key: string) => {
    setActiveLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getStyleForBox = (box: number[]) => {
    // box is [ymin, xmin, ymax, xmax] normalized 0-1000
    // CSS top/left/width/height in %
    const [ymin, xmin, ymax, xmax] = box;
    return {
      top: `${ymin / 10}%`,
      left: `${xmin / 10}%`,
      height: `${(ymax - ymin) / 10}%`,
      width: `${(xmax - xmin) / 10}%`,
    };
  };

  // Convert client coordinates to 0-1000 normalized coordinates
  const getNormalizedCoords = (e: React.MouseEvent) => {
    if (!containerRef.current || !imgRef.current) return null;
    const rect = imgRef.current.getBoundingClientRect();

    // Relative to image
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Normalize
    const normX = Math.max(0, Math.min(1000, Math.round((x / rect.width) * 1000)));
    const normY = Math.max(0, Math.min(1000, Math.round((y / rect.height) * 1000)));

    return { x: normX, y: normY };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (editAction !== 'add') return;
    const coords = getNormalizedCoords(e);
    if (coords) {
      setDragStart(coords);
      setCurrentDrag(coords);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (editAction !== 'add' || !dragStart) return;
    const coords = getNormalizedCoords(e);
    if (coords) {
      setCurrentDrag(coords);
    }
  };

  const handleMouseUp = () => {
    if (editAction !== 'add' || !dragStart || !currentDrag) return;

    // Create new element
    // Box format: [ymin, xmin, ymax, xmax]
    const ymin = Math.min(dragStart.y, currentDrag.y);
    const xmin = Math.min(dragStart.x, currentDrag.x);
    const ymax = Math.max(dragStart.y, currentDrag.y);
    const xmax = Math.max(dragStart.x, currentDrag.x);

    // Min size check to avoid accidental clicks creating tiny boxes
    if (Math.abs(xmax - xmin) > 10 && Math.abs(ymax - ymin) > 10) {
      const newEl = {
        id: `custom-${Date.now()}`,
        type: selectedType,
        label: `${selectedType} (Manual)`,
        box_2d: [ymin, xmin, ymax, xmax]
      };
      setElements([...elements, newEl]);
    }

    setDragStart(null);
    setCurrentDrag(null);
  };

  const handleBoxClick = (id: string, e: React.MouseEvent) => {
    if (editAction === 'remove') {
      e.stopPropagation(); // Prevent potentially triggering other clicks
      setElements(elements.filter(el => el.id !== id));
    }
  };

  const downloadImage = () => {
    const link = document.createElement('a');
    link.href = image;
    link.download = 'floorplan_analyzed.png';
    link.click();
  };

  // Calculate summary dynamically from current elements state
  const currentSummary = elements.reduce((acc, el) => {
    acc[el.type] = (acc[el.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const boxVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: (i: number) => ({
      opacity: 1,
      scale: 1,
      transition: {
        delay: i * 0.1, // Stagger effect
        duration: 0.5,
        type: "spring" as const,
        stiffness: 200,
        damping: 15
      }
    })
  };

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-8 p-6 max-w-[1600px] mx-auto relative overflow-hidden">
      {/* Left Sidebar: Stats (View Mode) or Legend */}
      {/* Left Sidebar: Stats (View Mode) or Legend */}
      <div className="w-full lg:w-36 flex-shrink-0 lg:block hidden">
        <div className="border-2 border-ink p-3 bg-white shadow-sketch relative">
          {/* Decorative paper lines */}
          <div className="absolute top-0 left-3 bottom-0 w-[1px] bg-red-100/50"></div>
          <div className="absolute top-0 left-4 bottom-0 w-[1px] bg-red-100/50"></div>

          <h3 className="font-hand text-lg font-bold mb-4 border-b-2 border-gray-200 pb-1">Analysis</h3>

          <div className="space-y-4">
            {(Object.keys(COLORS) as Array<keyof typeof COLORS>).map(type => {
              const count = currentSummary[type] || 0;
              // Hide if count is 0
              if (count === 0 && !activeLayers[type]) return null;

              return (
                <div key={type} className="flex items-center justify-between group cursor-pointer" onClick={() => toggleLayer(type)}>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-5 h-5 border-2 border-ink rounded-sm shadow-sm transition-opacity ${!activeLayers[type] ? 'opacity-30' : ''}`}
                      style={{ backgroundColor: COLORS[type] }}
                    />
                    <span className="font-hand text-xs uppercase tracking-wide">{type}</span>
                  </div>
                  <span className="font-hand text-sm font-bold">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content: Image Viewer */}
      <div className="flex-grow flex flex-col relative min-h-[500px] bg-[#f0f0f0] border-2 border-ink rounded-sm overflow-hidden shadow-inner select-none">
        <div
          ref={containerRef}
          className={`relative m-auto max-h-[80vh] w-auto inline-block ${editAction === 'add' ? 'cursor-crosshair' : ''}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { setDragStart(null); setCurrentDrag(null); }}
        >
          <img
            ref={imgRef}
            src={image}
            alt="Floor Plan"
            className="max-h-[80vh] w-auto object-contain block pointer-events-none"
          />

          {/* Overlay Layers */}
          {elements
            .filter(el => activeLayers[el.type])
            .map((el, idx) => (
              <motion.div
                key={el.id}
                custom={idx}
                variants={boxVariants}
                initial="hidden"
                animate="visible"
                className={`absolute border-[3px] border-transparent opacity-70 hover:opacity-100 z-10 
                            ${editAction === 'remove' ? 'cursor-no-drop hover:bg-red-500/20 hover:border-red-500' : 'cursor-pointer'}
                        `}
                style={{
                  ...getStyleForBox(el.box_2d),
                  borderColor: editAction === 'remove' ? undefined : (COLORS[el.type as keyof typeof COLORS] || 'black'),
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.3)'
                }}
                title={`${el.label} (${el.type})`}
                onClick={(e) => handleBoxClick(el.id, e)}
              >
                {/* Label on hover - only show if not removing */}
                {editAction !== 'remove' && (
                  <div className="opacity-0 hover:opacity-100 absolute -bottom-8 left-1/2 -translate-x-1/2 bg-ink text-white text-xs px-2 py-1 rounded font-sans whitespace-nowrap z-20 pointer-events-none transition-opacity">
                    {el.type}
                  </div>
                )}
                {/* Remove Icon overlay */}
                {editAction === 'remove' && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100">
                    <Minus className="w-6 h-6 text-red-600 bg-white rounded-full p-1 border border-red-600" />
                  </div>
                )}
              </motion.div>
            ))}

          {/* Drag Preview Box */}
          {dragStart && currentDrag && editAction === 'add' && (
            <div
              className="absolute border-[3px] border-dashed z-20 pointer-events-none"
              style={{
                ...getStyleForBox([
                  Math.min(dragStart.y, currentDrag.y),
                  Math.min(dragStart.x, currentDrag.x),
                  Math.max(dragStart.y, currentDrag.y),
                  Math.max(dragStart.x, currentDrag.x)
                ]),
                borderColor: COLORS[selectedType as keyof typeof COLORS] || 'black',
              }}
            />
          )}
        </div>

        {/* Floating Controls for View Mode */}
        {!isEditing && (
          <div className="absolute bottom-6 right-6 flex gap-4">
            <Button onClick={() => setIsEditing(true)}>
              Edit <Edit2 className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>

      {/* Right Sidebar: Edit Controls */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            layout
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 250, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex-shrink-0 h-full z-20 overflow-hidden"
          >
            <div className="w-[250px] h-full border-2 border-ink p-4 bg-white shadow-sketch flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-hand text-lg font-bold">EDIT MODE</h3>
              </div>

              <div className="flex gap-2 mb-4">
                <Button
                  variant={editAction === 'add' ? 'primary' : 'secondary'}
                  className="flex-1 text-xs py-1 px-1 h-8"
                  onClick={() => setEditAction(editAction === 'add' ? 'none' : 'add')}
                >
                  ADD <Plus className="w-3 h-3" />
                </Button>
                <Button
                  variant={editAction === 'remove' ? 'primary' : 'secondary'}
                  className="flex-1 text-xs py-1 px-1 h-8"
                  onClick={() => setEditAction(editAction === 'remove' ? 'none' : 'remove')}
                >
                  REMOVE <Minus className="w-3 h-3" />
                </Button>
              </div>

              {/* Type Selector for Adding */}
              <AnimatePresence>
                {editAction === 'add' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded">
                      <p className="font-hand text-sm mb-2">Item to Add:</p>
                      <div className="grid grid-cols-2 gap-1">
                        {(Object.keys(COLORS) as Array<keyof typeof COLORS>)
                          .filter(type => type !== 'furniture')
                          .map(type => (
                            <button
                              key={type}
                              onClick={() => setSelectedType(type)}
                              className={`
                                            px-1 py-1 text-xs rounded border-2 transition-all capitalize font-hand
                                            ${selectedType === type
                                  ? 'bg-ink text-white border-ink'
                                  : 'bg-white border-gray-300 hover:border-gray-500'
                                }
                                        `}
                            >
                              {type}
                            </button>
                          ))
                        }
                      </div>
                      <p className="text-[10px] text-gray-500 mt-2 font-sans italic leading-tight">
                        Click and drag on the image to draw a new {selectedType}.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {editAction === 'remove' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                      <p className="font-hand text-sm text-red-700">Select items to remove</p>
                      <p className="text-[10px] text-red-500 mt-1 font-sans italic leading-tight">
                        Click any box on the image to delete it.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-3 overflow-y-auto max-h-[40vh]">
                <p className="font-hand text-sm border-b pb-1 mb-1">Visibility</p>
                {/* Filter out furniture */}
                {(Object.keys(COLORS) as Array<keyof typeof COLORS>)
                  .filter(type => type !== 'furniture')
                  .map(type => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer select-none">
                      <div className="relative">
                        <input
                          type="checkbox"
                          className="peer appearance-none w-4 h-4 border-2 border-ink rounded-sm checked:bg-ink transition-colors"
                          checked={activeLayers[type]}
                          onChange={() => toggleLayer(type)}
                        />
                        <Check className="w-3 h-3 text-white absolute top-0.5 left-0.5 opacity-0 peer-checked:opacity-100 pointer-events-none" />
                      </div>
                      <span className="font-hand text-sm capitalize">{type}</span>
                    </label>
                  ))}
              </div>

              <div className="mt-4 space-y-2 pt-4 border-t-2 border-dashed border-gray-300">
                <Button className="w-full bg-blue-100 hover:bg-blue-200 text-xs py-1" onClick={downloadImage}>
                  SAVE IMAGE <Save className="w-3 h-3" />
                </Button>
                <Button className="w-full text-xs py-1" onClick={() => { setIsEditing(false); setEditAction('none'); }}>
                  DONE
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Button for View Mode (Top Right usually) */}
      {
        !isEditing && (
          <div className="absolute top-24 right-8 lg:static lg:block hidden">
            {/* Placeholder to balance layout if needed */}
          </div>
        )
      }
    </div >
  );
};
