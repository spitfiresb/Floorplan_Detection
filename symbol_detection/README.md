# Symbol Detection Pipeline

This folder contains a production-ready pipeline to train and run a YOLOv8 object detector on CubiCasa5K floorplan symbols.

## Supported Classes
*   `toilet`
*   `sink`
*   `door`
*   `window`
*   `outlet` (if present in data)
*   `switch` (if present in data)

## Setup

1.  Install dependencies:
    ```bash
    pip install ultralytics opencv-python tqdm pyyaml
    ```

2.  Ensure you have the CubiCasa5K dataset in `data/cubicasa5k` (or specify path).

## Workflow

### 1. Data Preparation
Convert CubiCasa5K annotations to a YOLO-compatible dataset.
```bash
python symbol_detection/data.py \
  --data-root data \
  --output-root symbol_detection/datasets \
  --include-low-quality
```
*   Generates `train`, `val`, and `test` splits.
*   Prints a summary of class distribution and unmapped icons.

### 2. Training
Train the YOLOv8 model.
```bash
python symbol_detection/train.py \
  --dataset symbol_detection/datasets/dataset.yaml \
  --epochs 50 \
  --model yolov8s.pt \
  --name symbols_yolov8s
```
*   Results saved to `symbol_detection/runs/symbols_yolov8s`.

### 3. Evaluation
Evaluate the trained model on the test split.
```bash
python symbol_detection/eval.py \
  --weights symbol_detection/runs/symbols_yolov8s/weights/best.pt \
  --data-config symbol_detection/datasets/dataset.yaml
```
*   Saves metrics to `metrics_test.json`.

### 4. Inference
Run detection on new images.
```bash
python symbol_detection/predict.py \
  --weights symbol_detection/runs/symbols_yolov8s/weights/best.pt \
  --source path/to/images \
  --output-dir symbol_detection/outputs
```
*   Outputs JSON results and overlay images to `symbol_detection/outputs`.

## Demo
Run the full pipeline with dummy data:
```bash
bash symbol_detection/run_demo.sh
```
