import cv2
import numpy as np
import os
import re

BASE_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..")
)

INPUT_DIR = os.path.join(BASE_DIR, "Frontend", "public", "frontspr")
OUTPUT_DIR = os.path.join(BASE_DIR, "Frontend", "public", "frontspr_clean")

os.makedirs(OUTPUT_DIR, exist_ok=True)


def get_border_color(img, border=5):
    """Sample border pixels for bg color detection"""
    h, w, _ = img.shape

    samples = np.concatenate([
        img[:border, :, :].reshape(-1, 3),
        img[-border:, :, :].reshape(-1, 3),
        img[:, :border, :].reshape(-1, 3),
        img[:, -border:, :].reshape(-1, 3),
    ])

    return np.median(samples, axis=0)


for filename in os.listdir(INPUT_DIR):

    if not filename.lower().endswith((".png", ".jpg", ".jpeg")):
        continue

    input_path = os.path.join(INPUT_DIR, filename)

    print(f"Processing {filename}")

    img = cv2.imread(input_path, cv2.IMREAD_UNCHANGED)

    if img is None:
        continue

    # Handle images that already have an alpha channel
    if img.shape[2] == 4:
        img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)

    # Get background color from border pixels
    bg_color = get_border_color(img)

    # Build mask: keep pixels that differ enough from the background
    diff = np.linalg.norm(img.astype(np.float32) - bg_color, axis=2)
    mask = (diff > 30).astype(np.uint8) * 255

    # MORPH_CLOSE fills small holes without shrinking the sprite outline
    kernel = np.ones((2, 2), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=1)

    # Gentle blur to smooth jagged edges
    mask = cv2.GaussianBlur(mask, (3, 3), 0)

    # Apply as alpha channel
    img_rgba = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    img_rgba[:, :, 3] = mask

    # Rename: strip everything after the digits
    # e.g. "gFrontSprite025Pikachu.png" -> "gFrontSprite025.png"
    name, ext = os.path.splitext(filename)
    match = re.match(r'(gFrontSprite\d+)', name)
    new_name = match.group(1) + ext if match else filename

    output_path = os.path.join(OUTPUT_DIR, new_name)
    cv2.imwrite(output_path, img_rgba)
    print(f"  Saved as: {new_name}")

print("✅ All sprites processed.")