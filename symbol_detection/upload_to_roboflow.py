import os
import argparse
import xml.etree.ElementTree as ET
import cv2
import numpy as np
from roboflow import Roboflow
from tqdm import tqdm
from pathlib import Path

# Mapping CubiCasa classes to our target classes
CLASS_MAPPING = {
    'Window': 'window',
    'Door': 'door',
    'FixedFurniture Toilet': 'toilet',
    'FixedFurniture Sink': 'sink',
    'Electrical Outlet': 'outlet',
    'Electrical Switch': 'switch'
}

def parse_svg(svg_path, width, height):
    """
    Parses CubiCasa SVG and returns a list of annotations.
    Each annotation is: {'class': class_name, 'points': [[x,y], ...]}
    """
    tree = ET.parse(svg_path)
    root = tree.getroot()
    
    annotations = []
    
    # CubiCasa SVGs use groups <g> to define classes
    # We look for <g> tags that have an 'id' or 'class' attribute matching our targets
    for g in root.iter('{http://www.w3.org/2000/svg}g'):
        obj_class = None
        
        # Check 'id' (e.g. id="Window")
        g_id = g.get('id')
        if g_id in CLASS_MAPPING:
            obj_class = CLASS_MAPPING[g_id]
            
        # Check 'class' (e.g. class="FixedFurniture Toilet")
        # Note: class attribute might contain multiple classes, we need exact match or substring
        g_class = g.get('class')
        if not obj_class and g_class:
            # Clean up class string (remove extra spaces)
            g_class = " ".join(g_class.split())
            if g_class in CLASS_MAPPING:
                obj_class = CLASS_MAPPING[g_class]
                
        if obj_class:
            # Found a target class, extract polygons
            for polygon in g.iter('{http://www.w3.org/2000/svg}polygon'):
                points_str = polygon.get('points')
                if points_str:
                    # Parse "x1,y1 x2,y2 ..."
                    points = []
                    for p in points_str.strip().split():
                        x, y = map(float, p.split(','))
                        points.append([x, y])
                    
                    if len(points) >= 3:
                        annotations.append({
                            'class': obj_class,
                            'points': points
                        })
                        
    return annotations

def upload_dataset(api_key, project_name, data_root, limit=100):
    rf = Roboflow(api_key=api_key)
    workspace = rf.workspace()
    project = workspace.project(project_name)
    
    print(f"Uploading to project: {project_name}")
    
    image_paths = list(Path(data_root).rglob('F1_original.png'))
    print(f"Found {len(image_paths)} images in {data_root}")
    
    count = 0
    for img_path in tqdm(image_paths):
        if count >= limit:
            break
            
        # Check for corresponding SVG
        svg_path = img_path.parent / 'model.svg'
        if not svg_path.exists():
            continue
            
        # Read image to get dimensions
        img = cv2.imread(str(img_path))
        if img is None:
            continue
        h, w, _ = img.shape
        
        # Parse annotations
        try:
            annotations = parse_svg(svg_path, w, h)
        except Exception as e:
            print(f"Error parsing {svg_path}: {e}")
            continue
            
        if not annotations:
            continue
            
        # Prepare annotation file (YOLO format for upload, or just pass to API if supported)
        # Roboflow Python SDK supports uploading image + annotation file.
        # It's easiest to generate a temporary annotation file.
        # Actually, the single_upload method allows passing annotation_path.
        # We will create a temporary JSON or XML or just let Roboflow handle it?
        # Roboflow API is easiest with an image and a separate annotation file.
        # Let's create a temporary YOLO txt file.
        
        txt_path = img_path.with_suffix('.txt')
        with open(txt_path, 'w') as f:
            for ann in annotations:
                # Convert polygon to bounding box for YOLO (x_center, y_center, w, h) normalized
                pts = np.array(ann['points'])
                x_min = np.min(pts[:, 0])
                x_max = np.max(pts[:, 0])
                y_min = np.min(pts[:, 1])
                y_max = np.max(pts[:, 1])
                
                # Normalize
                x_center = ((x_min + x_max) / 2) / w
                y_center = ((y_min + y_max) / 2) / h
                width = (x_max - x_min) / w
                height = (y_max - y_min) / h
                
                # We need to map class name to ID? Roboflow upload usually takes class names if using JSON/XML, 
                # but for YOLO txt it needs IDs.
                # To avoid ID confusion, let's use the 'single_upload' with 'annotation_label' if possible?
                # No, standard way is to upload image and then add annotations.
                # EASIER STRATEGY: Create a VOC XML file. Roboflow handles class names in XML perfectly.
                pass

        # Let's write a simple VOC XML writer
        xml_content = f"""
<annotation>
    <folder>images</folder>
    <filename>{img_path.name}</filename>
    <size>
        <width>{w}</width>
        <height>{h}</height>
        <depth>3</depth>
    </size>
    <segmented>0</segmented>
"""
        for ann in annotations:
            pts = np.array(ann['points'])
            x_min = int(np.min(pts[:, 0]))
            x_max = int(np.max(pts[:, 0]))
            y_min = int(np.min(pts[:, 1]))
            y_max = int(np.max(pts[:, 1]))
            
            xml_content += f"""
    <object>
        <name>{ann['class']}</name>
        <pose>Unspecified</pose>
        <truncated>0</truncated>
        <difficult>0</difficult>
        <bndbox>
            <xmin>{x_min}</xmin>
            <ymin>{y_min}</ymin>
            <xmax>{x_max}</xmax>
            <ymax>{y_max}</ymax>
        </bndbox>
    </object>
"""

        xml_content += "</annotation>"
        
        xml_path = img_path.with_suffix('.xml')
        with open(xml_path, 'w') as f:
            f.write(xml_content)
            
        # Upload
        try:
            project.upload(
                image_path=str(img_path),
                annotation_path=str(xml_path),
                split="train",
                num_retry_uploads=0
            )
            count += 1
        except Exception as e:
            print(f"Error uploading {img_path.name}: {e}")
        finally:
            # Clean up XML
            if xml_path.exists():
                os.remove(xml_path)

    print(f"Successfully uploaded {count} images.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--api-key', type=str, required=True, help='Roboflow API Key')
    parser.add_argument('--project', type=str, default='floor-plan-ai-object-detection', help='Roboflow Project Name/ID')
    parser.add_argument('--data-root', type=str, default='data', help='Root directory of CubiCasa dataset')
    parser.add_argument('--limit', type=int, default=100, help='Max images to upload (to avoid hitting limits)')
    
    args = parser.parse_args()
    
    upload_dataset(args.api_key, args.project, args.data_root, args.limit)
