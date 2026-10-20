import json
import os
import math
from PIL import Image

# 1. HARDCODING YOUR EXACT 40 DIAMOND CHART COLORS
CUSTOM_PALETTE = {
    "1": "#FFFFFF", "2": "#000000", "3": "#E8791C", "4": "#4E5BA2", "5": "#940108",
    "6": "#FFEE6F", "7": "#B6A4C0", "8": "#7C613B", "9": "#13295D", "10": "#EC9176",
    "11": "#EA1D16", "12": "#4A3203", "13": "#A26D84", "14": "#FAD0BC", "15": "#BC3D4A",
    "16": "#FCC831", "17": "#A44608", "18": "#573B66", "19": "#B48E4C", "20": "#7986AF",
    "21": "#6F2334", "22": "#251728", "23": "#E5C588", "24": "#5D000B", "25": "#3D4733",
    "26": "#6D6878", "27": "#FC9644", "28": "#BCA48A", "29": "#DBD5E6", "30": "#2C4184",
    "31": "#A77421", "32": "#CE685F", "33": "#FFFFC9", "34": "#914C64", "35": "#734910",
    "36": "#BB1E23", "37": "#FFBF60", "38": "#E19DA7", "39": "#2E0001", "40": "#963E32"
}

# Helper math function to convert hex strings back to RGB lists
def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    return [int(hex_str[i:i+2], 16) for i in (0, 2, 4)]

# Helper math function to find the absolute closest color match using Euclidean distance equations
def find_closest_palette_code(r, g, b):
    closest_code = "1"
    min_distance = float('inf')
    
    for code, hex_color in CUSTOM_PALETTE.items():
        pr, pg, pb = hex_to_rgb(hex_color)
        # Standard distance algorithm checks similarity vectors
        distance = math.sqrt((r - pr)**2 + (g - pg)**2 + (b - pb)**2)
        if distance < min_distance:
            min_distance = distance
            closest_code = code
            
    return int(closest_code)

def generate_game_level_file(image_path, js_level_path, grid_width=45):
    if not os.path.exists(image_path):
        print(f"❌ Error: Could not find image at {image_path}. Make sure it is named exactly memorial_scene.png inside generator/images/")
        return

    # Load original artwork graphic
    img = Image.open(image_path).convert('RGB')
    aspect_ratio = img.height / img.width
    grid_height = int(grid_width * aspect_ratio)
    
    # Downscale using high-fidelity resampling filters to preserve pixel details cleanly
    img_small = img.resize((grid_width, grid_height), resample=Image.Resampling.LANCZOS)
    
    # Map every single pixel coordinate down the grid matrix to your exact hardcoded colors!
    matrix_grid = []
    for r in range(grid_height):
        row_indices = []
        for c in range(grid_width):
            r_val, g_val, b_val = img_small.getpixel((c, r))
            # Snap pixel value straight to your specific number code matching your list chart
            matching_code = find_closest_palette_code(r_val, g_val, b_val)
            row_indices.append(matching_code)
        matrix_grid.append(row_indices)
        
    game_data = {
        "width": grid_width,
        "height": grid_height,
        "palette": CUSTOM_PALETTE,
        "grid": matrix_grid
    }

    # Write securely out directly to level.js file paths using standard universal formats
    with open(js_level_path, 'w', encoding='utf-8') as f:
        f.write(f"const gameData = {json.dumps(game_data, indent=2)};")
        
    print(f"🚀 Success! Level grid data successfully compiled with your 40 CUSTOM colors to: {js_level_path}")

if __name__ == "__main__":
    generate_game_level_file('generator/images/memorial_scene.png', 'game/level.js', grid_width=45)
