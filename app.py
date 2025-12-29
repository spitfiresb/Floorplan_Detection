import gradio as gr
from roboflow import Roboflow
import cv2
import numpy as np
import json
import os
from pathlib import Path
import tempfile

# Roboflow configuration
PROJECT_NAME = "floor-plan-ai-object-detection"
VERSION_NUMBER = 1
CONF_THRESHOLD = 0.4

def process_floor_plan(image, api_key, confidence):
    """
    Process a floor plan image using Roboflow model.

    Args:
        image: Input image (numpy array)
        api_key: Roboflow API key
        confidence: Confidence threshold (0-1)

    Returns:
        annotated_image: Image with bounding boxes and labels
        summary_json: JSON string with detection summary
    """
    if image is None:
        return None, "Please upload an image."

    if not api_key:
        return None, "Please provide a Roboflow API key."

    try:
        # Initialize Roboflow
        rf = Roboflow(api_key=api_key)
        project = rf.workspace().project(PROJECT_NAME)
        model = project.version(VERSION_NUMBER).model

        # Save image temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp_file:
            tmp_path = tmp_file.name
            cv2.imwrite(tmp_path, cv2.cvtColor(image, cv2.COLOR_RGB2BGR))

        # Run prediction
        prediction = model.predict(tmp_path, confidence=confidence * 100, overlap=30).json()

        # Process detections
        detections = []
        class_counts = {}

        # Create a copy of the image for annotation
        annotated_img = image.copy()

        # Define color palette for different classes (modern colors)
        colors = [
            (99, 102, 241),   # Indigo
            (236, 72, 153),   # Pink
            (34, 197, 94),    # Green
            (251, 146, 60),   # Orange
            (168, 85, 247),   # Purple
            (14, 165, 233),   # Sky blue
            (234, 179, 8),    # Yellow
            (239, 68, 68),    # Red
        ]

        class_color_map = {}

        for pred in prediction['predictions']:
            cls_name = pred['class']
            conf = pred['confidence']

            # Get coordinates
            x_c = pred['x']
            y_c = pred['y']
            w = pred['width']
            h = pred['height']

            # Convert to top-left coordinates
            x_min = int(x_c - w / 2)
            y_min = int(y_c - h / 2)
            x_max = int(x_c + w / 2)
            y_max = int(y_c + h / 2)

            detections.append({
                "class": cls_name,
                "bbox": [x_min, y_min, int(w), int(h)],
                "confidence": round(conf, 2)
            })

            class_counts[cls_name] = class_counts.get(cls_name, 0) + 1

            # Assign color to class
            if cls_name not in class_color_map:
                class_color_map[cls_name] = colors[len(class_color_map) % len(colors)]

            color = class_color_map[cls_name]

            # Draw bounding box with rounded corners effect
            thickness = 3
            cv2.rectangle(annotated_img, (x_min, y_min), (x_max, y_max), color, thickness)

            # Create label background
            label = f"{cls_name} {conf:.2f}"
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.6
            font_thickness = 2

            (text_width, text_height), _ = cv2.getTextSize(label, font, font_scale, font_thickness)

            # Draw filled rectangle for text background
            cv2.rectangle(
                annotated_img,
                (x_min, y_min - text_height - 10),
                (x_min + text_width + 10, y_min),
                color,
                -1
            )

            # Draw text
            cv2.putText(
                annotated_img,
                label,
                (x_min + 5, y_min - 5),
                font,
                font_scale,
                (255, 255, 255),
                font_thickness
            )

        # Create summary JSON
        summary = {
            "total_detections": len(detections),
            "classes_found": len(class_counts),
            "class_summary": class_counts,
            "detections": detections
        }

        summary_json = json.dumps(summary, indent=2)

        # Clean up temp file
        os.remove(tmp_path)

        return annotated_img, summary_json

    except Exception as e:
        return None, f"Error processing image: {str(e)}"


# Custom CSS for modern, minimalist design with glass morphism
custom_css = """
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

:root {
    --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --glass-bg: rgba(255, 255, 255, 0.1);
    --glass-border: rgba(255, 255, 255, 0.2);
}

* {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

body {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.gradio-container {
    max-width: 1400px !important;
    margin: auto;
    background: rgba(255, 255, 255, 0.05) !important;
    backdrop-filter: blur(10px);
    border-radius: 24px !important;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
    padding: 2rem !important;
}

.gr-box {
    background: rgba(255, 255, 255, 0.05) !important;
    backdrop-filter: blur(10px);
    border-radius: 16px !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    box-shadow: 0 4px 16px 0 rgba(31, 38, 135, 0.2);
}

.gr-button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
    border: none !important;
    border-radius: 12px !important;
    color: white !important;
    font-weight: 600 !important;
    padding: 12px 24px !important;
    transition: all 0.3s ease !important;
    box-shadow: 0 4px 15px 0 rgba(102, 126, 234, 0.4);
}

.gr-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px 0 rgba(102, 126, 234, 0.6);
}

.gr-input, .gr-text-input {
    background: rgba(255, 255, 255, 0.9) !important;
    border-radius: 12px !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    color: #333 !important;
    padding: 10px !important;
}

.gr-form {
    background: rgba(255, 255, 255, 0.05) !important;
    backdrop-filter: blur(10px);
    border-radius: 16px !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    padding: 20px !important;
}

h1, h2, h3 {
    color: white !important;
    font-weight: 700 !important;
}

.gr-prose {
    color: rgba(255, 255, 255, 0.9) !important;
}

.gr-panel {
    background: rgba(255, 255, 255, 0.05) !important;
    backdrop-filter: blur(10px);
    border-radius: 16px !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
}

.output-image, .input-image {
    border-radius: 12px !important;
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.3);
}

/* JSON output styling */
.gr-textbox {
    background: rgba(255, 255, 255, 0.9) !important;
    border-radius: 12px !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    font-family: 'Monaco', 'Menlo', monospace !important;
    color: #333 !important;
}

.gr-slider {
    background: rgba(255, 255, 255, 0.1) !important;
    border-radius: 12px !important;
}

/* Tabs styling */
.gr-tab-item {
    background: rgba(255, 255, 255, 0.1) !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    border-radius: 8px !important;
    color: white !important;
}

.gr-tab-item.selected {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
    color: white !important;
}
"""

# Create Gradio interface
with gr.Blocks(css=custom_css, theme=gr.themes.Soft()) as demo:
    gr.Markdown(
        """
        # 🏠 Floor Plan AI Analyzer
        ### Upload your architectural floor plan and let AI identify and classify objects

        Powered by advanced computer vision technology
        """
    )

    with gr.Row():
        with gr.Column(scale=1):
            gr.Markdown("### 📤 Upload Floor Plan")
            input_image = gr.Image(
                label="Drop your floor plan image here",
                type="numpy",
                height=400
            )

            api_key_input = gr.Textbox(
                label="🔑 Roboflow API Key",
                placeholder="Enter your Roboflow API key",
                type="password",
                value=os.getenv("ROBOFLOW_API_KEY", "")
            )

            confidence_slider = gr.Slider(
                minimum=0.1,
                maximum=1.0,
                value=0.4,
                step=0.05,
                label="🎯 Confidence Threshold",
                info="Adjust detection sensitivity"
            )

            analyze_btn = gr.Button("✨ Analyze Floor Plan", variant="primary", size="lg")

        with gr.Column(scale=1):
            gr.Markdown("### 🎨 Detection Results")
            output_image = gr.Image(
                label="Annotated Floor Plan",
                height=400
            )

            gr.Markdown("### 📊 Detection Summary")
            output_json = gr.Textbox(
                label="Classification Details (JSON)",
                lines=15,
                max_lines=20
            )

    # Add example images if available
    example_dir = Path("symbol_detection/demo_samples")
    if example_dir.exists():
        example_images = list(example_dir.glob("*.png"))[:3]  # Get first 3 examples
        if example_images:
            gr.Markdown("### 🎯 Try These Examples")
            gr.Examples(
                examples=[[str(img)] for img in example_images],
                inputs=[input_image],
                label="Click an example to load it"
            )

    gr.Markdown(
        """
        ---
        ### 💡 How to use:
        1. Enter your Roboflow API key (or set ROBOFLOW_API_KEY environment variable)
        2. Upload a floor plan image (PNG, JPG, or JPEG) or try an example above
        3. Adjust the confidence threshold if needed
        4. Click 'Analyze Floor Plan' to process

        ### 📝 About:
        This application uses state-of-the-art object detection to identify architectural elements in floor plans including:
        - Rooms and spaces
        - Doors and windows
        - Fixtures (toilets, sinks, etc.)
        - Furniture and appliances

        **Note:** You need a Roboflow API key to use this application. Get yours at [roboflow.com](https://roboflow.com)
        """
    )

    # Connect the button to the processing function
    analyze_btn.click(
        fn=process_floor_plan,
        inputs=[input_image, api_key_input, confidence_slider],
        outputs=[output_image, output_json]
    )

# Launch settings
if __name__ == "__main__":
    demo.launch(
        server_name="0.0.0.0",
        server_port=7860,
        share=False
    )
