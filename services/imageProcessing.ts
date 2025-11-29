import { LineImageSize, CropRect } from "../types";
import { LINE_GUIDELINES, STICKER_MARGIN } from "../constants";

// Declare UPNG from the CDN script
declare const UPNG: any;

/**
 * Helper to detect MIME type from base64 string
 */
export const getMimeType = (base64: string): string => {
  // Remove whitespace for accurate detection
  const clean = base64.replace(/\s/g, '');
  if (clean.startsWith('/9j/')) return 'image/jpeg';
  if (clean.startsWith('iVBOR')) return 'image/png';
  if (clean.startsWith('R0lG')) return 'image/gif';
  if (clean.startsWith('UklGR')) return 'image/webp';
  return 'image/png'; // Default fallback
};

/**
 * Converts a base64 string to a Blob
 */
export const base64ToBlob = (base64: string, mimeType: string): Blob => {
  const cleanBase64 = base64.replace(/\s/g, '');
  const byteCharacters = atob(cleanBase64);
  const byteNumbers = new Uint8Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  return new Blob([byteNumbers], { type: mimeType });
};

/**
 * Generic image loader. Accepts a URL (Blob URL, Data URL, etc.) and returns an HTMLImageElement.
 */
export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
};

/**
 * Removes background using a Flood Fill (Scanline-like) algorithm starting from corners.
 * Automatically detects the background color from the top-left pixel.
 * This supports White, Green Screen, Blue Screen, etc.
 * Includes edge smoothing.
 */
export const removeBackground = (
  img: HTMLImageElement,
  tolerance: number = 20, // Tolerance for color similarity (0-255)
  cropRect?: CropRect // Optional: only process this area (and treat rest as transparent/ignore)
): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  
  // If cropRect is provided, we resize canvas to that crop size
  // Otherwise use full image size
  const sourceX = cropRect ? cropRect.x : 0;
  const sourceY = cropRect ? cropRect.y : 0;
  const sourceW = cropRect ? cropRect.width : img.width;
  const sourceH = cropRect ? cropRect.height : img.height;

  // Prevent zero-size canvas errors
  canvas.width = Math.max(1, sourceW);
  canvas.height = Math.max(1, sourceH);
  
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not get canvas context");

  // Draw only the relevant part of the image onto the canvas
  ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, sourceW, sourceH);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { width, height, data } = imageData;
  const len = width * height;

  // Track visited pixels to avoid loops
  const visited = new Uint8Array(len);

  // Dynamic Background Detection
  // We sample the top-left pixel (index 0) to determine the background color.
  // This allows the user to use Green Screen (#45b152) or White (#FFFFFF) automatically.
  const bgR = data[0];
  const bgG = data[1];
  const bgB = data[2];

  const isBackground = (idx: number) => {
    const r = data[idx * 4];
    const g = data[idx * 4 + 1];
    const b = data[idx * 4 + 2];
    
    // Distance from the sampled background color
    const dist = Math.sqrt(
      Math.pow(r - bgR, 2) + 
      Math.pow(g - bgG, 2) + 
      Math.pow(b - bgB, 2)
    );
    return dist <= tolerance;
  };

  // Stack for flood fill (stores pixel indices)
  const stack: number[] = [];

  // Add corners to start flood fill (if they match background)
  // We check top/bottom rows and left/right columns to find entry points
  for (let x = 0; x < width; x++) {
    // Top row
    if (isBackground(x)) { stack.push(x); visited[x] = 1; }
    // Bottom row
    const bottomIdx = (height - 1) * width + x;
    if (isBackground(bottomIdx)) { stack.push(bottomIdx); visited[bottomIdx] = 1; }
  }
  for (let y = 0; y < height; y++) {
    // Left col
    const leftIdx = y * width;
    if (isBackground(leftIdx)) { stack.push(leftIdx); visited[leftIdx] = 1; }
    // Right col
    const rightIdx = y * width + (width - 1);
    if (isBackground(rightIdx)) { stack.push(rightIdx); visited[rightIdx] = 1; }
  }

  // Execute Flood Fill
  while (stack.length > 0) {
    const idx = stack.pop()!;
    
    // Set alpha to 0 (Transparent)
    data[idx * 4 + 3] = 0;

    // Check neighbors (Up, Down, Left, Right)
    const x = idx % width;
    const y = Math.floor(idx / width);

    const neighbors = [];
    if (x > 0) neighbors.push(idx - 1);
    if (x < width - 1) neighbors.push(idx + 1);
    if (y > 0) neighbors.push(idx - width);
    if (y < height - 1) neighbors.push(idx + width);

    for (const nIdx of neighbors) {
      if (visited[nIdx] === 0 && isBackground(nIdx)) {
        visited[nIdx] = 1;
        stack.push(nIdx);
      }
    }
  }

  // Edge Smoothing / cleanup
  // We perform a pass to soften edges where transparent meets opaque
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      
      // If this pixel is opaque
      if (data[idx * 4 + 3] > 0) {
        // Check if it neighbors a fully transparent pixel
        let transparentNeighbor = false;
        
        const nIndices = [
          idx - width, idx + width, idx - 1, idx + 1
        ];

        for (const n of nIndices) {
           if (data[n * 4 + 3] === 0) {
             transparentNeighbor = true;
             break;
           }
        }

        if (transparentNeighbor) {
           // It's an edge. 
           // If it's close to the background color, reduce alpha to blend
           if (isBackground(idx)) {
              // It was within tolerance but not reachable by floodfill (maybe isolated hole or edge artifact)
              // OR it is the hard edge of the flood fill
              data[idx * 4 + 3] = Math.max(0, 255 - (tolerance * 4)); // Soften significantly
           } else {
              // It is color (character), but touches transparent. Slight antialiasing.
              data[idx * 4 + 3] = 230; 
           }
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

/**
 * Gets the bounding box of the opaque content in an image.
 */
const getContentBoundingBox = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 50) { // Increased threshold to ignore faint edge smoothing
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }

  if (!found) return null;

  return { minX, minY, width: maxX - minX + 1, height: maxY - minY + 1 };
};

/**
 * Resizes the image to fit within LINE guidelines, applies automatic trimming,
 * and ensures the required 10px margin.
 */
export const resizeForLine = (
  originalImg: HTMLImageElement,
  targetSize: LineImageSize,
  manualCropRect?: CropRect,
  tolerance: number = 30
): string => {
  const { width: maxWidth, height: maxHeight } = LINE_GUIDELINES[targetSize];
  
  // 1. Remove Background first
  // If manualCropRect is provided, verify it has valid dimensions
  let validCrop = manualCropRect;
  if (manualCropRect && (manualCropRect.width < 1 || manualCropRect.height < 1)) {
    validCrop = undefined;
  }

  const processedCanvas = removeBackground(originalImg, tolerance, validCrop);
  
  // 2. Analyze content for bounding box (Auto-Trim)
  const bbox = getContentBoundingBox(
    processedCanvas.getContext('2d')!, 
    processedCanvas.width, 
    processedCanvas.height
  );
  
  // If empty image, just return empty canvas of target size
  if (!bbox) {
    const emptyCanvas = document.createElement("canvas");
    emptyCanvas.width = maxWidth;
    emptyCanvas.height = maxHeight;
    return emptyCanvas.toDataURL("image/png");
  }

  // 3. Setup final canvas
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No context");

  // Ensure even dimensions (LINE requirement)
  const finalWidth = maxWidth % 2 === 0 ? maxWidth : maxWidth - 1;
  const finalHeight = maxHeight % 2 === 0 ? maxHeight : maxHeight - 1;

  canvas.width = finalWidth;
  canvas.height = finalHeight;

  // 4. Calculate scaling to fit within (MaxSize - Margin * 2)
  let margin = STICKER_MARGIN;
  if (targetSize === LineImageSize.TAB) margin = 2; 

  const availableWidth = finalWidth - (margin * 2);
  const availableHeight = finalHeight - (margin * 2);

  const scaleX = availableWidth / bbox.width;
  const scaleY = availableHeight / bbox.height;
  
  // Fit entirely within the available box
  const finalScale = Math.min(scaleX, scaleY);

  const drawWidth = bbox.width * finalScale;
  const drawHeight = bbox.height * finalScale;

  // 5. Center the content
  const offsetX = (finalWidth - drawWidth) / 2;
  const offsetY = (finalHeight - drawHeight) / 2;

  // 6. Draw trimmed content onto final canvas
  ctx.drawImage(
    processedCanvas, 
    bbox.minX, bbox.minY, bbox.width, bbox.height, // Source crop from processed canvas
    offsetX, offsetY, drawWidth, drawHeight        // Destination
  );

  return canvas.toDataURL("image/png");
};

/**
 * Generates an APNG file from a list of image URLs.
 */
export const generateApng = async (
  imageUrls: string[],
  width: number,
  height: number,
  delayMs: number
): Promise<Blob> => {
  const buffers: ArrayBuffer[] = [];
  
  for (const url of imageUrls) {
    const img = await loadImage(url); 
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    
    // Draw centered
    const x = (width - img.width) / 2;
    const y = (height - img.height) / 2;
    ctx.drawImage(img, x, y, img.width, img.height);
    
    const imageData = ctx.getImageData(0, 0, width, height);
    buffers.push(imageData.data.buffer);
  }

  if (buffers.length === 0) throw new Error("No valid frames");

  const delays = buffers.map(() => delayMs);
  const apngArrayBuffer = UPNG.encode(buffers, width, height, 0, delays);

  return new Blob([apngArrayBuffer], { type: 'image/png' });
};