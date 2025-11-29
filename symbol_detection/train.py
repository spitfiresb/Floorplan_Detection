from ultralytics import YOLO
import argparse
import os

def train(dataset_yaml, epochs=50, img_size=1024, model_name='yolov8s.pt', project='symbol_detection/runs', name='symbols_yolov8s'):
    """
    Trains YOLOv8 model.
    """
    # Load model
    print(f"Loading {model_name}...")
    model = YOLO(model_name)

    # Train
    print(f"Starting training for {epochs} epochs...")
    print(f"Dataset: {dataset_yaml}")
    print(f"Project: {project}, Name: {name}")
    
    results = model.train(
        data=dataset_yaml,
        epochs=epochs,
        imgsz=img_size,
        project=project,
        name=name,
        exist_ok=True
    )
    
    print("Training complete.")
    print(f"Best model saved to {results.save_dir}/weights/best.pt")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--dataset', type=str, default=None, help='Path to dataset.yaml')
    parser.add_argument('--data-config', type=str, default=None, help='Alias for --dataset')
    parser.add_argument('--epochs', type=int, default=50, help='Number of epochs')
    parser.add_argument('--imgsz', type=int, default=1024, help='Image size')
    parser.add_argument('--model', type=str, default='yolov8s.pt', help='Model name (e.g. yolov8n.pt, yolov8s.pt)')
    parser.add_argument('--project', type=str, default='symbol_detection/runs', help='Project name')
    parser.add_argument('--name', type=str, default='symbols_yolov8s', help='Experiment name')
    
    args = parser.parse_args()
    
    dataset = args.dataset if args.dataset else args.data_config
    if not dataset:
        # Default fallback
        dataset = 'symbol_detection/datasets/dataset.yaml'
        if not os.path.exists(dataset):
             # Try old path for backward compatibility
             dataset = 'symbol_detection/dataset/dataset.yaml'
    
    if not os.path.exists(dataset):
        print(f"Error: Dataset config not found at {dataset}")
        print("Please run symbol_detection/data.py first.")
        exit(1)
        
    train(dataset, args.epochs, args.imgsz, args.model, args.project, args.name)
