#!/bin/bash
set -e

echo "Generating dummy data..."
python symbol_detection/demo_data_gen.py

echo "Preparing dataset..."
# Using aliases for backward compatibility test, but updated logic
python symbol_detection/data.py --data dummy_data --output symbol_detection/dataset_demo

echo "Training model (1 epoch)..."
# Updated model name to full path/name
python symbol_detection/train.py --dataset symbol_detection/dataset_demo/dataset.yaml --epochs 1 --model yolov8n.pt --name demo_run

echo "Evaluating model..."
python symbol_detection/eval.py --weights symbol_detection/runs/demo_run/weights/best.pt --data-config symbol_detection/dataset_demo/dataset.yaml

echo "Running inference..."
# Updated flag --weights (alias --model would also work)
python symbol_detection/predict.py --source dummy_data/sample0/F1_original.png --weights symbol_detection/runs/demo_run/weights/best.pt

echo "Demo complete! Check symbol_detection/outputs for results."
