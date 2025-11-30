from roboflow import Roboflow
import argparse
import os
import json
import cv2
import numpy as np
from pathlib import Path

def run_inference(source, api_key, project_name, version_number, output_dir='symbol_detection/outputs', conf_thres=0.4):
    """
    Runs inference on source images using Roboflow API.
    """
    print("Initializing Roboflow...")
    rf = Roboflow(api_key=api_key)
    project = rf.workspace().project(project_name)
    model = project.version(version_number).model

    # Handle source (file or directory)
    source_path = Path(source)
    if source_path.is_dir():
        # Get all images
        images = list(source_path.glob('*.png')) + list(source_path.glob('*.jpg')) + list(source_path.glob('*.jpeg'))
    else:
        images = [source_path]

    if not images:
        print(f"No images found at {source}")
        return

    print(f"Running inference on {len(images)} images...")
    
    # Create output dir
    os.makedirs(output_dir, exist_ok=True)
    
    for img_path in images:
        # Run prediction
        # Roboflow predict returns a prediction object
        try:
            prediction = model.predict(str(img_path), confidence=conf_thres * 100, overlap=30).json()
        except Exception as e:
            print(f"Error predicting {img_path}: {e}")
            continue
            
        # Process detections
        detections = []
        class_counts = {}
        
        # Roboflow JSON format: {'predictions': [{'x': 100, 'y': 100, 'width': 50, 'height': 50, 'class': 'toilet', 'confidence': 0.9}]}
        # Coordinates are center x, center y
        
        img = cv2.imread(str(img_path))
        if img is None:
             print(f"Could not read image for visualization: {img_path}")
             continue
             
        h_img, w_img, _ = img.shape
        
        for pred in prediction['predictions']:
            cls_name = pred['class']
            conf = pred['confidence']
            
            # Roboflow returns center x, y and width, height
            x_c = pred['x']
            y_c = pred['y']
            w = pred['width']
            h = pred['height']
            
            # Convert to top-left x, y for drawing/JSON standard if preferred, 
            # but user asked for [x, y, w, h] which usually implies top-left or center.
            # Let's stick to the previous format: [x_min, y_min, w, h] (absolute)
            x_min = x_c - w / 2
            y_min = y_c - h / 2
            
            detections.append({
                "class": cls_name,
                "bbox": [x_min, y_min, w, h],
                "confidence": conf
            })
            
            class_counts[cls_name] = class_counts.get(cls_name, 0) + 1
            
            # Draw box
            start_point = (int(x_min), int(y_min))
            end_point = (int(x_min + w), int(y_min + h))
            color = (0, 255, 0) # Green
            thickness = 2
            cv2.rectangle(img, start_point, end_point, color, thickness)
            cv2.putText(img, f"{cls_name} {conf:.2f}", (int(x_min), int(y_min)-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
            
        # 1. Save JSON
        json_output = {
            "image_id": img_path.name,
            "detections": detections,
            "summary": class_counts
        }
        
        json_path = os.path.join(output_dir, f"{img_path.stem}.json")
        with open(json_path, 'w') as f:
            json.dump(json_output, f, indent=2)
            
        # 2. Save Overlay Image
        overlay_path = os.path.join(output_dir, f"{img_path.stem}_detections.png")
        cv2.imwrite(overlay_path, img)
        
        # Print summary
        summary_str = ", ".join([f"{k}:{v}" for k, v in class_counts.items()])
        print(f"Processed {img_path.name}: {len(detections)} detections ({summary_str})")

    print(f"Results saved to {output_dir}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--api-key', type=str, required=True, help='Roboflow API Key')
    parser.add_argument('--source', type=str, required=True, help='Path to image or directory')
    parser.add_argument('--output-dir', type=str, default='symbol_detection/outputs', help='Output directory')
    parser.add_argument('--conf', type=float, default=0.4, help='Confidence threshold (0-1)')
    
    parser.add_argument('--project', type=str, default='floor-plan-ai-object-detection', help='Roboflow Project ID')
    parser.add_argument('--version', type=int, default=1, help='Model Version')
    
    args = parser.parse_args()
    
    run_inference(args.source, args.api_key, args.project, args.version, args.output_dir, args.conf)
