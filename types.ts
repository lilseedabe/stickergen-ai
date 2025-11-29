
export enum StickerType {
  STATIC = 'STATIC',
  ANIMATION = 'ANIMATION',
}

export enum LineImageSize {
  MAIN = 'MAIN',       // 240x240
  STICKER = 'STICKER', // 370x320 (Max)
  ANIMATION = 'ANIMATION', // 320x270 (Max for animation)
  TAB = 'TAB',         // 96x74
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EditState {
  cropRect?: CropRect;
  tolerance: number;
}

export interface GeneratedImage {
  id: string;
  url: string; // Preview URL (Data URL or Blob URL)
  originalUrl?: string; // Blob URL of the high-res original
  width: number;
  height: number;
  originalWidth?: number; // Dimensions of the high-res original
  originalHeight?: number;
  isTransparent: boolean;
  editState?: EditState;
}

export interface StickerProject {
  id: string;
  sourceImage: File | null;
  generatedImages: GeneratedImage[];
  selectedType: StickerType;
  prompt: string;
}

export interface GenerationConfig {
  prompt: string;
  count: number;
  aspectRatio: string;
}
