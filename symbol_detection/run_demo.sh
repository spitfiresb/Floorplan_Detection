#!/bin/bash
set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <ROBOFLOW_API_KEY>"
    exit 1
fi

API_KEY=$1


# Check for a real image in the dataset
REAL_IMAGE="data/high_quality/33/F1_original.png"
if [ -f "$REAL_IMAGE" ]; then
    echo "Found real image at $REAL_IMAGE. Using it for inference..."
    SOURCE_IMG="$REAL_IMAGE"
else
    echo "Generating dummy data..."
    python symbol_detection/demo_data_gen.py
    SOURCE_IMG="dummy_data/sample0/F1_original.png"
fi

echo "Running inference with Roboflow..."
python symbol_detection/predict.py \
    --api-key "$API_KEY" \
    --source "$SOURCE_IMG" \
    --output-dir symbol_detection/outputs \
    --project "floorplans-r7e9l-vjwg9" \
    --version 2 \
    --conf 0.1

echo "Demo complete! Check symbol_detection/outputs for results."
