from ultralytics import YOLO
import argparse
import os
import json

def evaluate(weights_path, data_config, img_size=1024):
    """
    Evaluates the model on the test split defined in data_config.
    """
    if not os.path.exists(weights_path):
        print(f"Error: Weights not found at {weights_path}")
        return

    print(f"Loading model from {weights_path}...")
    model = YOLO(weights_path)

    print(f"Evaluating on {data_config} (test split)...")
    # Ultralytics val() uses the 'val' split by default. 
    # To evaluate on 'test', we can specify split='test' if the dataset.yaml has a 'test' key.
    
    metrics = model.val(data=data_config, split='test', imgsz=img_size)
    
    # metrics.box.map    # map50-95
    # metrics.box.map50  # map50
    # metrics.box.map75  # map75
    # metrics.box.maps   # a list contains map50-95 of each category
    
    print("\n" + "="*40)
    print("EVALUATION RESULTS")
    print("="*40)
    print(f"mAP@0.5:    {metrics.box.map50:.4f}")
    print(f"mAP@0.5:95: {metrics.box.map:.4f}")
    print("-" * 40)
    
    # Per-class metrics
    class_metrics = {}
    for i, name in metrics.names.items():
        # metrics.box.maps is an array of mAP50-95 for each class
        # Precision and Recall are not directly in the top-level object in a simple list for each class in all versions,
        # but usually accessible via metrics.box.p and metrics.box.r (arrays).
        
        # Note: Ultralytics metrics structure can vary slightly by version.
        # metrics.box.maps is reliable for per-class mAP.
        
        ap5095 = metrics.box.maps[i]
        print(f"{name:<20} | mAP@0.5:95: {ap5095:.4f}")
        
        class_metrics[name] = {
            'mAP_0.5_95': float(ap5095)
        }
    
    # Save to JSON
    output_dir = os.path.dirname(weights_path)
    # If weights are in runs/train/weights/, we might want to save in runs/train/
    if output_dir.endswith('weights'):
        output_dir = os.path.dirname(output_dir)
        
    json_path = os.path.join(output_dir, 'metrics_test.json')
    
    results = {
        'mAP_0.5': float(metrics.box.map50),
        'mAP_0.5_95': float(metrics.box.map),
        'per_class': class_metrics
    }
    
    with open(json_path, 'w') as f:
        json.dump(results, f, indent=4)
        
    print("="*40)
    print(f"Metrics saved to {json_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--weights', type=str, required=True, help='Path to model weights (.pt)')
    parser.add_argument('--data-config', type=str, default='symbol_detection/datasets/dataset.yaml', help='Path to data.yaml')
    parser.add_argument('--imgsz', type=int, default=1024, help='Image size')
    
    args = parser.parse_args()
    
    evaluate(args.weights, args.data_config, args.imgsz)
