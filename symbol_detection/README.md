# Symbol Detection Pipeline

This folder contains a pipeline to run object detection on CubiCasa5K floorplan symbols using a pre-trained model hosted on Roboflow.

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
    pip install opencv-python tqdm pyyaml roboflow
    ```

2.  Ensure you have the CubiCasa5K dataset in `data/` (or specify path).

## Workflow

### Inference (Using Pre-trained Roboflow Model)
Run detection on new images using the Roboflow API.
1.  Get your API Key from [Roboflow Settings](https://app.roboflow.com/settings/api).
2.  Run the script:

```bash
python symbol_detection/predict.py \
  --api-key YOUR_ROBOFLOW_API_KEY \
  --source path/to/images \
  --output-dir symbol_detection/outputs
```
*   Outputs JSON results and overlay images to `symbol_detection/outputs`.
*   Uses the pre-trained `floor-plan-ai-object-detection` model.

## Demo
Run the pipeline with a sample image from the dataset (requires API key):
```bash
bash symbol_detection/run_demo.sh YOUR_API_KEY
```
