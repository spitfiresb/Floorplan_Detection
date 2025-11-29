import os
import glob
import shutil
import argparse
import numpy as np
import yaml
from xml.dom import minidom
from tqdm import tqdm
from pathlib import Path
from collections import defaultdict
import random

# Target classes for production pipeline
CLASSES = ["toilet", "sink", "door", "window", "outlet", "switch"]
CLASS_MAP = {name: i for i, name in enumerate(CLASSES)}

# Mapping from CubiCasa5K icon names to our target classes
# Note: 'outlet' and 'switch' are not standard CubiCasa classes but kept for extensibility
ICON_MAPPING = {
    # Windows
    "Window": "window",
    
    # Doors
    "Door": "door",
    
    # Toilets
    "Toilet": "toilet",
    "Urinal": "toilet",
    
    # Sinks
    "Sink": "sink",
    "RoundSink": "sink",
    "CornerSink": "sink",
    "DoubleSink": "sink",
    "DoubleSinkRight": "sink",
    "SideSink": "sink",
    "WaterTap": "sink",
    
    # Outlets/Switches (Placeholder if found in custom data)
    "Outlet": "outlet",
    "Switch": "switch",
    "ElectricalOutlet": "outlet",
    "LightSwitch": "switch"
}

def get_polygon_bounds(pol_str):
    """Parses a polygon string 'x,y x,y ...' and returns min/max x,y."""
    points = pol_str.strip().split(' ')
    xs = []
    ys = []
    for p in points:
        if ',' not in p: continue
        try:
            x, y = map(float, p.split(','))
            xs.append(x)
            ys.append(y)
        except ValueError:
            continue
            
    if not xs:
        return None
    return min(xs), max(xs), min(ys), max(ys)

def parse_svg(svg_path):
    """
    Parses a CubiCasa5K SVG file and returns a list of annotations.
    Each annotation is {'class': label, 'bbox': [x_center, y_center, w, h]} (absolute coords).
    Returns (annotations, unmapped_count).
    """
    try:
        doc = minidom.parse(svg_path)
    except Exception as e:
        print(f"Error parsing {svg_path}: {e}")
        return [], 0

    annotations = []
    unmapped_count = 0
    
    def process_element(e, label):
        min_x, max_x, min_y, max_y = None, None, None, None
        
        # Check for polygon
        polys = e.getElementsByTagName('polygon')
        if polys:
            points = polys[0].getAttribute('points')
            bounds = get_polygon_bounds(points)
            if bounds:
                min_x, max_x, min_y, max_y = bounds
        
        # Fallback: check for path (simplistic bounding box from path string if possible, or skip)
        # For now, we rely on polygons as most CubiCasa icons use them.
        
        if min_x is not None:
            w = max_x - min_x
            h = max_y - min_y
            x_c = min_x + w / 2
            y_c = min_y + h / 2
            annotations.append({
                'class': label,
                'bbox': [x_c, y_c, w, h]
            })

    # 1. Windows and Doors (IDs)
    for e in doc.getElementsByTagName('g'):
        eid = e.getAttribute('id')
        if eid in ICON_MAPPING:
            process_element(e, ICON_MAPPING[eid])
            continue
            
        # 2. FixedFurniture (Class)
        eclass = e.getAttribute('class')
        if 'FixedFurniture' in eclass:
            # Format: "FixedFurniture IconName"
            parts = eclass.split(' ')
            if len(parts) > 1:
                icon_name = parts[1]
                if icon_name in ICON_MAPPING:
                    process_element(e, ICON_MAPPING[icon_name])
                else:
                    unmapped_count += 1
        elif 'Space' not in eclass and eid not in ['Wall', 'Railing']:
             # Potentially other icons, check mapping
             pass

    return annotations, unmapped_count

def create_dataset(data_root, output_root, include_low_quality=False, limit=None):
    """
    Generates YOLO dataset structure.
    """
    data_path = Path(data_root)
    out_path = Path(output_root)
    
    # Create directories
    for split in ['train', 'val', 'test']:
        (out_path / 'images' / split).mkdir(parents=True, exist_ok=True)
        (out_path / 'labels' / split).mkdir(parents=True, exist_ok=True)
    
    print(f"Searching for SVGs in {data_path}...")
    
    # CubiCasa5K structure: high_quality/ID/model.svg, low_quality/ID/model.svg
    # Also support flat structure or dummy data structure
    svg_files = list(data_path.rglob('model.svg'))
    
    if not include_low_quality:
        # Filter out low_quality if present in path
        svg_files = [f for f in svg_files if 'low_quality' not in str(f)]
        
    if not svg_files:
        print("No model.svg files found! Please check data directory.")
        return

    if limit:
        print(f"Limiting to {limit} samples.")
        svg_files = svg_files[:limit]

    print(f"Found {len(svg_files)} samples. Processing...")
    
    # Shuffle and split (70/20/10)
    random.seed(42)
    random.shuffle(svg_files)
    
    n = len(svg_files)
    train_end = int(n * 0.7)
    val_end = int(n * 0.9)
    
    splits = {
        'train': svg_files[:train_end],
        'val': svg_files[train_end:val_end],
        'test': svg_files[val_end:]
    }
    
    stats = {
        'images': defaultdict(int),
        'classes': defaultdict(lambda: defaultdict(int)),
        'unmapped': 0
    }
    
    import cv2 # Import here to avoid dependency if just checking help
    
    for split, files in splits.items():
        for svg_file in tqdm(files, desc=f"Processing {split}"):
            folder = svg_file.parent
            
            # Find image
            img_file = folder / 'F1_original.png'
            if not img_file.exists():
                img_file = folder / 'F1_original.jpg'
                if not img_file.exists():
                    # Try F1_scaled.png if original missing
                    img_file = folder / 'F1_scaled.png'
                    if not img_file.exists():
                        continue
            
            # Parse SVG
            anns, unmapped = parse_svg(str(svg_file))
            stats['unmapped'] += unmapped
            
            if not anns:
                continue
                
            # Read image for size
            img = cv2.imread(str(img_file))
            if img is None:
                continue
            h_img, w_img, _ = img.shape
            
            # Prepare labels
            label_lines = []
            has_valid_ann = False
            
            for ann in anns:
                cls_name = ann['class']
                if cls_name not in CLASS_MAP:
                    continue
                
                cls_id = CLASS_MAP[cls_name]
                x_c, y_c, w, h = ann['bbox']
                
                # Normalize
                x_n = x_c / w_img
                y_n = y_c / h_img
                w_n = w / w_img
                h_n = h / h_img
                
                # Clamp
                x_n = max(0, min(1, x_n))
                y_n = max(0, min(1, y_n))
                w_n = max(0, min(1, w_n))
                h_n = max(0, min(1, h_n))
                
                label_lines.append(f"{cls_id} {x_n:.6f} {y_n:.6f} {w_n:.6f} {h_n:.6f}")
                stats['classes'][split][cls_name] += 1
                has_valid_ann = True
            
            if not has_valid_ann:
                continue

            # Save
            stats['images'][split] += 1
            
            # Symlink image
            dst_img = out_path / 'images' / split / (folder.name + img_file.suffix)
            if dst_img.exists():
                dst_img.unlink()
            try:
                os.symlink(img_file.resolve(), dst_img)
            except OSError:
                shutil.copy(img_file, dst_img)
            
            # Write label
            dst_lbl = out_path / 'labels' / split / (folder.name + '.txt')
            with open(dst_lbl, 'w') as f:
                f.write('\n'.join(label_lines))

    # Create dataset.yaml
    yaml_content = {
        'path': str(out_path.resolve()),
        'train': 'images/train',
        'val': 'images/val',
        'test': 'images/test',
        'names': {i: name for i, name in enumerate(CLASSES)}
    }
    
    with open(out_path / 'dataset.yaml', 'w') as f:
        yaml.dump(yaml_content, f, sort_keys=False)
    
    # Print Summary
    print("\n" + "="*40)
    print("DATASET GENERATION SUMMARY")
    print("="*40)
    print(f"Output: {out_path}")
    print(f"Unmapped icons skipped: {stats['unmapped']}")
    print("-" * 40)
    print(f"{'Split':<10} | {'Images':<10} | {'Classes Distribution'}")
    print("-" * 40)
    for split in ['train', 'val', 'test']:
        dist = ", ".join([f"{k}:{v}" for k, v in stats['classes'][split].items()])
        print(f"{split:<10} | {stats['images'][split]:<10} | {dist}")
    print("="*40)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert CubiCasa5K data to YOLO format.")
    parser.add_argument('--data-root', type=str, default='data', help='Path to CubiCasa5K data root')
    parser.add_argument('--output-root', type=str, default='symbol_detection/datasets', help='Output path for YOLO dataset')
    parser.add_argument('--include-low-quality', action='store_true', help='Include low_quality folders')
    parser.add_argument('--limit', type=int, default=None, help='Limit number of samples for testing')
    
    # Backward compatibility for demo script
    parser.add_argument('--data', type=str, help='Alias for --data-root')
    parser.add_argument('--output', type=str, help='Alias for --output-root')
    
    args = parser.parse_args()
    
    # Handle aliases
    data_root = args.data if args.data else args.data_root
    output_root = args.output if args.output else args.output_root
    
    create_dataset(data_root, output_root, args.include_low_quality, args.limit)
