from ultralytics import YOLO
import argparse
import os
import json
import cv2
import numpy as np
from pathlib import Path

def run_inference(source, weights, output_dir='symbol_detection/outputs', conf_thres=0.4):
    """
    Runs inference on source images.
    """
    if not os.path.exists(weights):
        print(f"Error: Model not found at {weights}")
        return

    print(f"Loading model from {weights}...")
    model = YOLO(weights)

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
        results = model.predict(str(img_path), conf=conf_thres, verbose=False)
        result = results[0]
        
        # Process detections
        detections = []
        class_counts = {}
        
        for box in result.boxes:
            cls_id = int(box.cls[0])
            cls_name = result.names[cls_id]
            conf = float(box.conf[0])
            xyxy = box.xyxy[0].tolist() # x1, y1, x2, y2
            
            # Convert to x, y, w, h (absolute)
            x, y = xyxy[0], xyxy[1]
            w = xyxy[2] - xyxy[0]
            h = xyxy[3] - xyxy[1]
            
            detections.append({
                "class": cls_name,
                "bbox": [x, y, w, h],
                "confidence": conf
            })
            
            class_counts[cls_name] = class_counts.get(cls_name, 0) + 1
            
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
        # We can use result.plot() from ultralytics which returns a BGR numpy array
        overlay_img = result.plot()
        overlay_path = os.path.join(output_dir, f"{img_path.stem}_detections.png")
        cv2.imwrite(overlay_path, overlay_img)
        
        # Print summary
        summary_str = ", ".join([f"{k}:{v}" for k, v in class_counts.items()])
        print(f"Processed {img_path.name}: {len(detections)} detections ({summary_str})")

    print(f"Results saved to {output_dir}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--weights', type=str, required=True, help='Path to trained model weights')
    parser.add_argument('--source', type=str, required=True, help='Path to image or directory')
    parser.add_argument('--output-dir', type=str, default='symbol_detection/outputs', help='Output directory')
    parser.add_argument('--conf', type=float, default=0.25, help='Confidence threshold')
    
    # Backward compatibility
    parser.add_argument('--model', type=str, help='Alias for --weights')
    parser.add_argument('--output', type=str, help='Alias for --output-dir')

    args = parser.parse_args()
    
    weights = args.weights if args.weights else args.model
    output_dir = args.output_dir if args.output_dir else args.output
    
    run_inference(args.source, weights, output_dir, args.conf)
