import os
import cv2
import numpy as np

# Create dummy SVG
svg_content = """<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
	 viewBox="0 0 500 500" style="enable-background:new 0 0 500 500;" xml:space="preserve">
<g id="Window">
	<polygon points="100,100 200,100 200,200 100,200 "/>
</g>
<g id="Door">
    <polygon points="300,300 400,300 400,400 300,400 "/>
</g>
<g class="FixedFurniture Toilet">
    <polygon points="50,50 80,50 80,80 50,80 "/>
</g>
</svg>
"""

for i in range(5):
    folder = f'dummy_data/sample{i}'
    os.makedirs(folder, exist_ok=True)

    # Create dummy image (black)
    img = np.zeros((500, 500, 3), dtype=np.uint8)
    cv2.imwrite(f'{folder}/F1_original.png', img)

    # Create dummy SVG
    with open(f'{folder}/model.svg', 'w') as f:
        f.write(svg_content)

print("Dummy data created in dummy_data/")
