
import React, { useState, useEffect, useRef } from 'react';
import { Upload, Wand2, Download, Play, Pause, Layers, Film, Image as ImageIcon, CheckCircle2, Key, Copy, Plus, X, Package, Scissors, RotateCw, RefreshCw, Eye, ZoomIn, ZoomOut, Hand, Crop as CropIcon, Maximize, MessageSquare, Briefcase, FilePlus, Save, Trash2, Monitor, AlertCircle, LayoutGrid, Sparkles, ArrowRight } from 'lucide-react';
import { StickerType, GeneratedImage, LineImageSize, CropRect } from '../types';
import { fileToBase64, generateStickerImage, urlToBase64 } from '../services/geminiService';
import { loadImage, removeBackground, resizeForLine, generateApng, getMimeType, base64ToBlob } from '../services/imageProcessing';
import { LINE_GUIDELINES, ANIMATION_FRAME_DELAY, CREDIT_COST_1K, CREDIT_COST_4K } from '../constants';
import { apiService } from '../services/apiService';

const PROMPT_TEMPLATES = [
  {
    label: "テンプレートを選択...",
    text: ""
  },
  {
    label: "お気に入り：12種バリエーション",
    text: "添付画像をベースに、デフォルメしたちびキャラスタイルで背景が緑のLINEスタンプ12種類をデザイン。\n【キャラクターの場合】\nそのままデフォルメして使用\n【キャラクター以外の場合】\n擬人化またはマスコット化してアレンジ\n【共通要素】\n• 多様な表情（喜び、悲しみ、怒り、驚き、照れなど）\n• 個性的なポーズ（手を振る、ジャンプ、落ち込むなど）\n• 日本語のセリフを効果的に配置\n• 日常会話で使いやすいシチュエーション\n各スタンプが個性的で使い分けできるよう、構図や文字配置にも工夫を凝らす。"
  },
  {
    label: "標準：LINEスタンプ化",
    text: "この画像をLINEスタンプ風に描き直して。太い輪郭線、鮮やかなフラットカラー、白背景。"
  },
  {
    label: "アニメ：動きをつける",
    text: "このキャラクターに動きをつけてアニメーションのコマを作成して。白背景。"
  }
];

interface WorkstationProps {
  onCreditUpdate?: (newCredits: number) => void;
}

const Workstation: React.FC<WorkstationProps> = ({ onCreditUpdate }) => {
  // Credit State
  const [credits, setCredits] = useState<number>(0);
  const [isLoadingCredits, setIsLoadingCredits] = useState(false);

  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0); 
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [stickerType, setStickerType] = useState<StickerType>(StickerType.STATIC);
  const [quantity, setQuantity] = useState<number>(1);
  const [resolution, setResolution] = useState<'1K' | '4K'>('1K');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Submission Assets
  const [mainImage, setMainImage] = useState<GeneratedImage | null>(null);
  const [tabImage, setTabImage] = useState<GeneratedImage | null>(null);
  
  // Animation Preview State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);

  // Edit/Crop Modal State
  const [editingImage, setEditingImage] = useState<GeneratedImage | null>(null);
  
  // Use Ref for start position to avoid state update lag on fast drags
  const cropStartRef = useRef<{x: number, y: number} | null>(null);
  
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [tolerance, setTolerance] = useState(30);
  
  // Grid Split State
  const [showGrid, setShowGrid] = useState(false);
  const [gridRows, setGridRows] = useState(4);
  const [gridCols, setGridCols] = useState(3);
  
  const [editImageSrc, setEditImageSrc] = useState<string | null>(null);
  const [editImageSize, setEditImageSize] = useState<{width: number, height: number} | null>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null); // Holds the actual Image object for canvas ops

  const [editPreviewUrl, setEditPreviewUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [editMode, setEditMode] = useState<'crop' | 'pan'>('crop');
  
  // AI Refine State
  const [refiningImage, setRefiningImage] = useState<GeneratedImage | null>(null);
  const [refinePrompt, setRefinePrompt] = useState('');
  const [refineResult, setRefineResult] = useState<GeneratedImage | null>(null);
  const [isRefining, setIsRefining] = useState(false);

  // Refs for coordinate calculation and event handling
  const editImageRef = useRef<HTMLImageElement>(null); // The <img> element in the DOM
  const canvasContainerRef = useRef<HTMLDivElement>(null); // The container for pointer events

  // Track active Blob URLs to prevent premature revocation or leaks
  const activeUrlsRef = useRef<Set<string>>(new Set());

  // Check for API Key and Credits on mount
  useEffect(() => {
    const checkKey = async () => {
      if ((window as any).aistudio && (window as any).aistudio.hasSelectedApiKey) {
        const has = await (window as any).aistudio.hasSelectedApiKey();
        setHasApiKey(has);
      } else {
        setHasApiKey(true);
      }
    };
    checkKey();

    // Fetch credit balance
    const fetchCredits = async () => {
      if (apiService.isAuthenticated()) {
        setIsLoadingCredits(true);
        try {
          const data = await apiService.getCreditBalance();
          setCredits(data.credits);
        } catch (error) {
          console.error('Failed to fetch credits:', error);
        } finally {
          setIsLoadingCredits(false);
        }
      }
    };
    fetchCredits();
  }, []);

  // Strict scroll prevention for mobile cropping using non-passive listener
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const preventScroll = (e: TouchEvent) => {
      // Only prevent scroll if we are in crop mode (and not using pan)
      if (editMode === 'crop' && !showGrid) {
        e.preventDefault();
      }
    };

    // { passive: false } is crucial here to allow e.preventDefault() to work on touchmove
    container.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      container.removeEventListener('touchmove', preventScroll);
    };
  }, [editMode, editingImage, showGrid]); // Re-bind when mode or image changes

  // Cleanup Blob URLs only on unmount
  useEffect(() => {
    return () => {
      activeUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const consumeCredits = async (resolution: '1K' | '4K') => {
    try {
      const result = await apiService.consumeCredits(resolution);
      setCredits(result.newBalance);
      // Notify parent component of credit update
      if (onCreditUpdate) {
        onCreditUpdate(result.newBalance);
      }
      return true;
    } catch (error: any) {
      setError(error.message || 'クレジットの消費に失敗しました');
      return false;
    }
  };

  const handleSelectKey = async () => {
    if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSourceFile(file);
      const base64 = await fileToBase64(file);
      setSourcePreview(`data:image/png;base64,${base64}`);
      setError(null);
    }
  };

  const generateId = () => {
    return typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  const processSingleImage = async (rawBase64: string, id: string, targetSize: LineImageSize): Promise<GeneratedImage> => {
    // 1. Create a Blob URL for the original high-res image immediately to save memory and handle large strings
    const mimeType = getMimeType(rawBase64);
    const blob = base64ToBlob(rawBase64, mimeType);
    const originalUrl = URL.createObjectURL(blob);
    
    // Track this URL
    activeUrlsRef.current.add(originalUrl);

    // 2. Load the image from the Blob URL to get dimensions and process preview
    const imgEl = await loadImage(originalUrl);
    
    // 3. Process it (Resize/Trim) to get a small preview/final sticker (Data URL)
    const finalUrl = resizeForLine(imgEl, targetSize, undefined, 30);
    
    return {
      id,
      url: finalUrl, // Small processed PNG (Data URL)
      originalUrl: originalUrl, // Huge Original (Blob URL)
      width: LINE_GUIDELINES[targetSize].width,
      height: LINE_GUIDELINES[targetSize].height,
      originalWidth: imgEl.width, // Store original dimensions
      originalHeight: imgEl.height,
      isTransparent: true,
      editState: { tolerance: 30 }
    };
  };

  const handleGenerate = async () => {
    if (!sourceFile || !sourcePreview) return;
    if (!hasApiKey) {
      await handleSelectKey();
      return;
    }

    // Check if user is authenticated
    if (!apiService.isAuthenticated()) {
      setError('ログインが必要です。クレジットを購入するにはアカウントを作成してください。');
      return;
    }

    // Check credit balance
    const requiredCredits = resolution === '1K' ? CREDIT_COST_1K : CREDIT_COST_4K;
    if (credits < requiredCredits) {
      setError(`クレジットが不足しています。必要: ${requiredCredits}cr、現在: ${credits}cr`);
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setError(null);

    // Consume credits first
    const consumed = await consumeCredits(resolution);
    if (!consumed) {
      setIsProcessing(false);
      return;
    }

    // Clean up old URLs before starting new generation
    activeUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    activeUrlsRef.current.clear();

    setGeneratedImages([]);
    setIsPlaying(false);

    try {

      const base64 = sourcePreview.split(',')[1];
      
      // --- ANIMATION MODE: SEQUENTIAL CHAINING ---
      if (stickerType === StickerType.ANIMATION) {
        const totalFrames = 4; // LINE animation standard usually 4-20 frames
        let currentInputBase64 = base64; // Start with source image
        const animationResults: GeneratedImage[] = [];

        for (let i = 0; i < totalFrames; i++) {
          const sequencePrompt = `${prompt}. (Animation Frame ${i + 1} of ${totalFrames}. Make a small, smooth motion progression from the input image.)`;
          
          const rawImages = await generateStickerImage(currentInputBase64, sequencePrompt, true, resolution);
          
          if (rawImages.length > 0) {
            const raw = rawImages[0];
            const processed = await processSingleImage(raw, generateId(), LineImageSize.ANIMATION);
            
            animationResults.push(processed);
            setGeneratedImages(prev => [...prev, processed]); 
            
            currentInputBase64 = raw;
          }
          setProgress(Math.round(((i + 1) / totalFrames) * 100));
        }
        
        if (animationResults.length > 0) {
          setSelectedImageId(animationResults[0].id);
          setIsPlaying(true);
        }

      } else {
        // --- STATIC MODE: PARALLEL / BATCH ---
        const targetCount = quantity;
        const concurrency = 2; // Process 2 at a time
        const results: GeneratedImage[] = [];
        const tasks = Array.from({ length: targetCount }, (_, i) => i);
        
        for (let i = 0; i < tasks.length; i += concurrency) {
          const chunk = tasks.slice(i, i + concurrency);
          
          const chunkPromises = chunk.map(async (idx) => {
            const variationPrompt = `${prompt} --variation=${idx + 1} --seed=${Math.random().toString(36)}`; 
            
            const rawImages = await generateStickerImage(base64, variationPrompt, false, resolution);
            
            const processedChunk: GeneratedImage[] = [];
            for (const raw of rawImages) {
              const processed = await processSingleImage(raw, generateId(), LineImageSize.STICKER);
              processedChunk.push(processed);
            }
            return processedChunk;
          });

          const chunkResults = await Promise.all(chunkPromises);
          chunkResults.flat().forEach(img => results.push(img));
          
          setGeneratedImages(prev => [...prev, ...chunkResults.flat()]);
          setProgress(Math.round((Math.min(tasks.length, i + concurrency) / tasks.length) * 100));
        }
        
        if (results.length > 0) {
          setSelectedImageId(results[0].id);
        }
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "生成中に予期せぬエラーが発生しました。");
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  // Animation Loop
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying && generatedImages.length > 1) {
      interval = setInterval(() => {
        setCurrentFrameIndex(prev => (prev + 1) % generatedImages.length);
      }, ANIMATION_FRAME_DELAY);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, generatedImages.length]);

  // Auto-preview on tolerance change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (editingImage && originalImageRef.current && !showGrid) {
        handlePreviewEdit();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [tolerance, showGrid]);

  const handleDownload = (img: GeneratedImage, suffix: string = '') => {
    const link = document.createElement('a');
    link.href = img.url;
    link.download = `sticker_${img.id.slice(0, 6)}${suffix}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const createAssetImage = async (sourceImg: GeneratedImage, targetSize: LineImageSize): Promise<GeneratedImage> => {
    if (!sourceImg.originalUrl) throw new Error("No source data");
    
    // Load from original Blob URL
    const imgEl = await loadImage(sourceImg.originalUrl);
    
    const crop = sourceImg.editState?.cropRect; 
    const tol = sourceImg.editState?.tolerance || 30;

    const newUrl = resizeForLine(imgEl, targetSize, crop, tol);
    
    return {
      id: generateId(),
      url: newUrl,
      originalUrl: sourceImg.originalUrl, // Share the same original blob
      originalWidth: sourceImg.originalWidth, // Keep original dimensions
      originalHeight: sourceImg.originalHeight,
      width: LINE_GUIDELINES[targetSize].width,
      height: LINE_GUIDELINES[targetSize].height,
      isTransparent: true,
      editState: sourceImg.editState
    };
  };

  const handleSetAsMain = async () => {
    const activeImage = generatedImages.find(img => img.id === selectedImageId);
    if (!activeImage) return;
    try {
      const img = await createAssetImage(activeImage, LineImageSize.MAIN);
      setMainImage(img);
    } catch (e) { console.error(e); }
  };

  const handleSetAsTab = async () => {
    const activeImage = generatedImages.find(img => img.id === selectedImageId);
    if (!activeImage) return;
    try {
      const img = await createAssetImage(activeImage, LineImageSize.TAB);
      setTabImage(img);
    } catch (e) { console.error(e); }
  };

  const handleDownloadAPNG = async () => {
    if (generatedImages.length === 0) return;
    try {
      const urls = generatedImages.map(img => img.url);
      const width = generatedImages[0].width;
      const height = generatedImages[0].height;
      
      const apngBlob = await generateApng(urls, width, height, ANIMATION_FRAME_DELAY);
      const url = URL.createObjectURL(apngBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `animation_sticker.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (e) {
      console.error(e);
      setError("APNG作成に失敗しました: " + (e as any).message);
    }
  };

  const handleDuplicate = (img: GeneratedImage) => {
    const newImg = { ...img, id: generateId() };
    setGeneratedImages(prev => [...prev, newImg]);
  };

  const handleDelete = (id: string) => {
    setGeneratedImages(prev => prev.filter(img => img.id !== id));
    if (selectedImageId === id) setSelectedImageId(null);
  };

  const calculateFitZoom = (width: number, height: number) => {
    if (width === 0 || height === 0) return 1;
    // Calculate padding (mobile vs desktop)
    const xPadding = window.innerWidth < 768 ? 40 : 120;
    const yPadding = window.innerWidth < 768 ? 200 : 100;
    
    const availableWidth = window.innerWidth - xPadding;
    const availableHeight = window.innerHeight - yPadding;

    const scaleX = availableWidth / width;
    const scaleY = availableHeight / height;

    // Fit entirely within screen
    const fitScale = Math.min(scaleX, scaleY);
    
    // Don't up-scale images that are smaller than screen, but do down-scale big ones
    return Math.min(fitScale, 1);
  };

  const openEditModal = (img: GeneratedImage) => {
    if (!img.originalUrl) return;
    setEditingImage(img);
    
    // Reset Edit State
    setTolerance(img.editState?.tolerance || 30);
    
    // Load existing crop if available, otherwise reset
    if (img.editState?.cropRect) {
        setCropRect(img.editState.cropRect);
    } else {
        setCropRect(null); 
    }
    
    cropStartRef.current = null;
    setEditPreviewUrl(null);
    setEditMode('crop');
    setShowGrid(false); // Reset grid on open

    // Immediate state update using stored dimensions
    setEditImageSrc(img.originalUrl); 
    
    if (img.originalWidth && img.originalHeight) {
      setEditImageSize({ width: img.originalWidth, height: img.originalHeight });
      // Calculate initial zoom to fit the screen
      const fitZoom = calculateFitZoom(img.originalWidth, img.originalHeight);
      setZoom(fitZoom);
    } else {
      // Fallback for legacy images
      loadImage(img.originalUrl).then(loadedImg => {
        setEditImageSize({ width: loadedImg.width, height: loadedImg.height });
        originalImageRef.current = loadedImg;
        const fitZoom = calculateFitZoom(loadedImg.width, loadedImg.height);
        setZoom(fitZoom);
      }).catch(e => {
        console.error("Failed to load image for editing", e);
        setError("画像の読み込みに失敗しました");
        setEditingImage(null);
      });
    }
  };

  const closeEditModal = () => {
    setEditingImage(null);
    setEditImageSrc(null);
    originalImageRef.current = null;
  };

  // Refine Modal Handlers
  const handleRefineOpen = (img: GeneratedImage) => {
    setRefiningImage(img);
    setRefinePrompt('');
    setRefineResult(null);
  };

  const handleRefineClose = () => {
    setRefiningImage(null);
    setRefineResult(null);
    setIsRefining(false);
  };

  const handleRefineGenerate = async () => {
    if (!refiningImage || !refinePrompt || !hasApiKey) return;
    
    setIsRefining(true);
    setError(null);

    try {
      const inputBase64 = await urlToBase64(refiningImage.url); // Use the current visible sticker (transparent)
      
      const fullPrompt = `Modify this sticker based on the user's request: "${refinePrompt}". Maintain the same style and character. Keep the background solid color.`;
      
      const rawImages = await generateStickerImage(inputBase64, fullPrompt, false, resolution);
      
      if (rawImages.length > 0) {
        const processed = await processSingleImage(rawImages[0], generateId(), LineImageSize.STICKER);
        setRefineResult(processed);
      }
    } catch (e: any) {
      console.error(e);
      setError("AI修正に失敗しました: " + e.message);
    } finally {
      setIsRefining(false);
    }
  };

  const handleRefineSave = () => {
    if (refineResult) {
      setGeneratedImages(prev => [...prev, refineResult]);
      handleRefineClose();
    }
  };

  const handleFitToScreen = () => {
    if (!editImageSize) return;
    const fitZoom = calculateFitZoom(editImageSize.width, editImageSize.height);
    setZoom(fitZoom);
  };

  // Improved position calculation that handles both Mouse and Touch events
  const getEventPos = (e: React.MouseEvent | React.TouchEvent) => {
    if (!editImageRef.current) return { x: 0, y: 0 };
    const rect = editImageRef.current.getBoundingClientRect();
    
    let clientX, clientY;
    
    if ('touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        return { x: 0, y: 0 }; // Should not happen on start/move
      }
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (editMode === 'pan' || showGrid) return; 

    // Touch events prevented via non-passive listener in useEffect

    const pos = getEventPos(e);
    // Convert to original coordinates immediately (divide by zoom)
    // This fixes the zoom mismatch issue.
    const originX = pos.x / zoom;
    const originY = pos.y / zoom;

    cropStartRef.current = { x: originX, y: originY };
    setCropRect({ x: originX, y: originY, width: 0, height: 0 });
    setEditPreviewUrl(null);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!cropStartRef.current || editMode === 'pan' || showGrid) return;
    
    const pos = getEventPos(e);
    // Convert current position to original coordinates
    const currentX = pos.x / zoom;
    const currentY = pos.y / zoom;
    
    const start = cropStartRef.current;

    // Calculate dimensions in original image space
    const width = Math.abs(currentX - start.x);
    const height = Math.abs(currentY - start.y);
    const x = Math.min(currentX, start.x);
    const y = Math.min(currentY, start.y);

    setCropRect({ x, y, width, height });
  };

  const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (editMode === 'pan' || showGrid) return;
    
    cropStartRef.current = null;
    
    if (cropRect) {
        // Filter out tiny accidental clicks (in original pixels)
        if (cropRect.width < 5 || cropRect.height < 5) {
            setCropRect(null);
        } else {
            // Integer snapping
            setCropRect({
                x: Math.floor(cropRect.x),
                y: Math.floor(cropRect.y),
                width: Math.floor(cropRect.width),
                height: Math.floor(cropRect.height)
            });
        }
    }
  };

  const getActualCropRect = (): CropRect | undefined => {
    if (!cropRect) return undefined;
    
    // cropRect is now already in Original Coordinates, just ensure integers
    return {
      x: Math.floor(cropRect.x),
      y: Math.floor(cropRect.y),
      width: Math.floor(cropRect.width),
      height: Math.floor(cropRect.height)
    };
  };

  const handlePreviewEdit = () => {
    if (!originalImageRef.current) return;
    
    try {
      const actualRect = getActualCropRect();
      const targetSize = stickerType === StickerType.ANIMATION 
        ? LineImageSize.ANIMATION 
        : LineImageSize.STICKER;
        
      const url = resizeForLine(originalImageRef.current, targetSize, actualRect, tolerance);
      setEditPreviewUrl(url);
    } catch (e) {
      console.error(e);
    }
  };

  const applyEdit = () => {
    if (!editingImage || !originalImageRef.current) return;
    
    const actualRect = getActualCropRect();
    const targetSize = stickerType === StickerType.ANIMATION 
        ? LineImageSize.ANIMATION 
        : LineImageSize.STICKER;
    
    const finalUrl = editPreviewUrl || resizeForLine(originalImageRef.current, targetSize, actualRect, tolerance);
    
    const updatedImages = generatedImages.map(img => {
      if (img.id === editingImage.id) {
        return {
          ...img,
          url: finalUrl,
          width: LINE_GUIDELINES[targetSize].width,
          height: LINE_GUIDELINES[targetSize].height,
          editState: {
            cropRect: actualRect,
            tolerance: tolerance
          }
        };
      }
      return img;
    });
    
    setGeneratedImages(updatedImages);
    closeEditModal();
  };

  const handleSaveAsNew = () => {
    if (!editingImage || !originalImageRef.current) return;
    
    const actualRect = getActualCropRect();
    const targetSize = stickerType === StickerType.ANIMATION 
        ? LineImageSize.ANIMATION 
        : LineImageSize.STICKER;
    
    const finalUrl = editPreviewUrl || resizeForLine(originalImageRef.current, targetSize, actualRect, tolerance);
    
    const newImage: GeneratedImage = {
        id: generateId(),
        url: finalUrl,
        originalUrl: editingImage.originalUrl, // Keep original high-res reference
        originalWidth: editingImage.originalWidth, // Keep original dimensions
        originalHeight: editingImage.originalHeight,
        width: LINE_GUIDELINES[targetSize].width,
        height: LINE_GUIDELINES[targetSize].height,
        isTransparent: true,
        editState: {
            cropRect: actualRect,
            tolerance: tolerance
        }
    };
    
    setGeneratedImages(prev => [...prev, newImage]);
    closeEditModal();
  };

  const handleGridSplit = async () => {
    if (!originalImageRef.current || !editingImage || !editImageSize) return;

    try {
      const { naturalWidth, naturalHeight } = originalImageRef.current;
      const cellW = naturalWidth / gridCols;
      const cellH = naturalHeight / gridRows;
      
      const newImages: GeneratedImage[] = [];
      const targetSize = stickerType === StickerType.ANIMATION 
          ? LineImageSize.ANIMATION 
          : LineImageSize.STICKER;

      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          const rect: CropRect = {
            x: Math.floor(c * cellW),
            y: Math.floor(r * cellH),
            width: Math.floor(cellW),
            height: Math.floor(cellH)
          };

          // Basic check to ensure rect is within bounds and not zero
          if (rect.width < 10 || rect.height < 10) continue;

          // Generate thumbnail for this cell with auto-trim logic
          const url = resizeForLine(originalImageRef.current, targetSize, rect, tolerance);

          newImages.push({
            id: generateId(),
            url,
            originalUrl: editingImage.originalUrl,
            originalWidth: editingImage.originalWidth,
            originalHeight: editingImage.originalHeight,
            width: LINE_GUIDELINES[targetSize].width,
            height: LINE_GUIDELINES[targetSize].height,
            isTransparent: true,
            editState: {
              cropRect: rect,
              tolerance: tolerance
            }
          });
        }
      }

      setGeneratedImages(prev => [...prev, ...newImages]);
      closeEditModal();

    } catch (e) {
      console.error("Grid Split Error:", e);
      setError("一括抽出に失敗しました");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-6 grid lg:grid-cols-12 gap-6">
      
      {/* Left Panel: Inputs */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Source Image */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4" /> 1. 元画像 (Source)
          </h2>
          <div className="relative group">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className={`
              border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center transition-colors
              ${sourcePreview ? 'border-green-300 bg-green-50' : 'border-slate-300 hover:border-green-400 hover:bg-slate-50'}
            `}>
              {sourcePreview ? (
                <div className="relative">
                  <img src={sourcePreview} alt="Source" className="max-h-48 rounded shadow-sm" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded">
                    <p className="text-white text-xs font-medium">変更する (Change)</p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-sm text-slate-600 font-medium">画像を選択</p>
                  <p className="text-xs text-slate-400 mt-1">またはドラッグ＆ドロップ</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
           <h2 className="text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
            <Wand2 className="w-4 h-4" /> 2. 生成設定 (Settings)
          </h2>

          {!hasApiKey && (
             <button 
              onClick={handleSelectKey}
              className="w-full bg-amber-50 text-amber-700 text-xs px-3 py-2 rounded border border-amber-200 flex items-center justify-center gap-2 hover:bg-amber-100 transition"
             >
               <Key className="w-3 h-3" /> APIキーを設定 (必須/Required)
             </button>
          )}

          <div>
             <label className="text-xs font-semibold text-slate-500 mb-1 block">種類 (Type)</label>
             <div className="grid grid-cols-2 gap-2">
               <button
                 onClick={() => setStickerType(StickerType.STATIC)}
                 className={`py-2 px-3 rounded-lg text-sm font-medium border flex items-center justify-center gap-2 transition-all ${
                   stickerType === StickerType.STATIC 
                   ? 'bg-green-600 text-white border-green-600 ring-2 ring-green-100' 
                   : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                 }`}
               >
                 <ImageIcon className="w-4 h-4" /> スタンプ
               </button>
               <button
                 onClick={() => setStickerType(StickerType.ANIMATION)}
                 className={`py-2 px-3 rounded-lg text-sm font-medium border flex items-center justify-center gap-2 transition-all ${
                   stickerType === StickerType.ANIMATION 
                   ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-100' 
                   : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                 }`}
               >
                 <Film className="w-4 h-4" /> アニメ
               </button>
             </div>
          </div>

          {stickerType === StickerType.STATIC && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">枚数 (Qty)</label>
                <select 
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {[1, 2, 4, 6, 8].map(n => (
                    <option key={n} value={n}>{n} 枚</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">画質 (Res)</label>
                <select 
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as '1K' | '4K')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="1K">標準 (1K)</option>
                  <option value="4K">高画質 (4K)</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-500">プロンプト (Prompt)</label>
              <select 
                className="text-xs bg-slate-100 border border-slate-200 rounded px-2 py-0.5 text-slate-600 max-w-[120px]"
                onChange={(e) => setPrompt(e.target.value)}
              >
                {PROMPT_TEMPLATES.map((t, i) => (
                  <option key={i} value={t.text}>{t.label}</option>
                ))}
              </select>
            </div>
            <textarea
              className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none placeholder-slate-500"
              rows={5}
              placeholder="例: このキャラクターが「おはよう」と言って手を振っているイラスト。"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          {/* Credit Display */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-slate-700">クレジット残高</span>
              {isLoadingCredits ? (
                <RefreshCw className="w-4 h-4 animate-spin text-green-500" />
              ) : (
                <span className="text-2xl font-bold text-green-600">{credits} cr</span>
              )}
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>1K生成コスト:</span>
                <span className="font-semibold">{CREDIT_COST_1K}cr (50円)</span>
              </div>
              <div className="flex justify-between">
                <span>4K生成コスト:</span>
                <span className="font-semibold">{CREDIT_COST_4K}cr (90円)</span>
              </div>
              <div className="mt-2 pt-2 border-t border-green-200">
                <div className="flex justify-between">
                  <span>今回の生成:</span>
                  <span className="font-bold text-green-700">
                    {resolution === '1K' ? CREDIT_COST_1K : CREDIT_COST_4K}cr
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>生成後の残高:</span>
                  <span className="font-bold">
                    {Math.max(0, credits - (resolution === '1K' ? CREDIT_COST_1K : CREDIT_COST_4K))}cr
                  </span>
                </div>
              </div>
            </div>
            {apiService.isAuthenticated() && (
              <button
                className="w-full mt-3 py-2 bg-white border-2 border-green-500 text-green-600 rounded-lg text-sm font-bold hover:bg-green-50 transition flex items-center justify-center gap-2"
                onClick={() => window.open('/purchase', '_blank')}
              >
                <Package className="w-4 h-4" /> クレジット購入
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-200 flex items-start gap-2">
               <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
               <span className="break-words">{error}</span>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={!sourceFile || isProcessing || !prompt}
            className={`
              w-full py-3 rounded-lg font-bold text-white shadow-md flex items-center justify-center gap-2
              ${!sourceFile || isProcessing || !prompt 
                ? 'bg-slate-300 cursor-not-allowed' 
                : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transform hover:-translate-y-0.5 transition-all'}
            `}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                生成中... {progress}%
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                生成する (Generate)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Panel: Results */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Gallery / Preview */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-h-[400px]">
           <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
             <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
               <Package className="w-5 h-5 text-green-500" /> 
               生成結果 (Result)
             </h2>
             {stickerType === StickerType.ANIMATION && generatedImages.length > 0 && (
               <div className="flex gap-2">
                 <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                 >
                   {isPlaying ? <Pause className="w-4 h-4"/> : <Play className="w-4 h-4"/>}
                 </button>
                 <button
                  onClick={handleDownloadAPNG}
                  className="px-3 py-1.5 bg-indigo-500 text-white rounded text-xs font-bold hover:bg-indigo-600 transition flex items-center gap-1"
                 >
                   <Download className="w-3 h-3"/> APNG保存
                 </button>
               </div>
             )}
           </div>

           {generatedImages.length === 0 ? (
             <div className="h-64 flex flex-col items-center justify-center text-slate-300">
               <ImageIcon className="w-16 h-16 mb-2 opacity-20" />
               <p className="text-sm">ここに生成結果が表示されます</p>
             </div>
           ) : (
             <div className="space-y-6">
                
                {/* Animation Preview Area */}
                {stickerType === StickerType.ANIMATION && (
                  <div className="flex justify-center mb-6">
                    <div className="bg-checkerboard p-4 rounded-lg border border-slate-200 inline-block shadow-inner">
                      <img 
                        src={generatedImages[currentFrameIndex].url}
                        alt="Animation Preview"
                        className="w-[160px] h-[135px] object-contain"
                      />
                      <div className="text-center text-xs text-slate-400 mt-2 font-mono">
                        Frame {currentFrameIndex + 1} / {generatedImages.length}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sticker Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {generatedImages.map((img) => (
                    <div 
                      key={img.id}
                      onClick={() => setSelectedImageId(img.id)}
                      className={`
                        relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer bg-checkerboard
                        ${selectedImageId === img.id ? 'border-green-500 ring-2 ring-green-200' : 'border-slate-100 hover:border-slate-300'}
                      `}
                    >
                      <img src={img.url} alt="Sticker" className="w-full aspect-square object-contain p-2" />
                      
                      {/* Action Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                         <div className="flex gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); openEditModal(img); }}
                              className="bg-white text-slate-700 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-slate-100"
                              title="編集 (Edit)"
                            >
                              <Scissors className="w-3 h-3" />
                            </button>
                             <button
                              onClick={(e) => { e.stopPropagation(); handleRefineOpen(img); }}
                              className="bg-indigo-500 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-indigo-600"
                              title="AI修正 (Refine)"
                            >
                              <Sparkles className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDuplicate(img); }}
                              className="bg-white text-slate-700 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-slate-100"
                              title="複製 (Clone)"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                         </div>
                         <div className="flex gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDownload(img); }}
                              className="bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-green-600"
                            >
                              <Download className="w-3 h-3" /> 保存
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(img.id); }}
                              className="bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-red-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                         </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Selected Image Actions */}
                {selectedImageId && (
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-4 flex flex-wrap gap-2 items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">
                      選択中のスタンプ ({generatedImages.find(g => g.id === selectedImageId)?.width}x{generatedImages.find(g => g.id === selectedImageId)?.height})
                    </span>
                    <div className="flex gap-2">
                      <button 
                        onClick={handleSetAsMain}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-green-600"
                      >
                        Main画像に設定
                      </button>
                      <button 
                        onClick={handleSetAsTab}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-green-600"
                      >
                        Tab画像に設定
                      </button>
                    </div>
                  </div>
                )}
             </div>
           )}
        </div>

        {/* Submission Assets Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
            <Briefcase className="w-5 h-5 text-indigo-500" />
            申請用素材 (Submission Assets)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Main Image */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-500">メイン画像 (Main) - 240x240</label>
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 flex items-center gap-4">
                 <div className="w-20 h-20 bg-checkerboard rounded border border-slate-300 flex items-center justify-center">
                    {mainImage ? (
                      <img src={mainImage.url} className="max-w-full max-h-full" alt="Main" />
                    ) : (
                      <span className="text-xs text-slate-400">なし</span>
                    )}
                 </div>
                 <div className="flex-1">
                   {mainImage ? (
                     <button
                       onClick={() => handleDownload(mainImage, '_main')}
                       className="w-full py-2 bg-green-500 text-white rounded text-xs font-bold hover:bg-green-600 flex items-center justify-center gap-1"
                     >
                       <Download className="w-3 h-3" /> ダウンロード
                     </button>
                   ) : (
                     <p className="text-xs text-slate-400">上のリストから「Main画像に設定」を押してください</p>
                   )}
                 </div>
              </div>
            </div>

            {/* Tab Image */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-500">タブ画像 (Tab) - 96x74</label>
               <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 flex items-center gap-4">
                 <div className="w-20 h-20 bg-checkerboard rounded border border-slate-300 flex items-center justify-center">
                    {tabImage ? (
                      <img src={tabImage.url} className="max-w-full max-h-full" alt="Tab" />
                    ) : (
                      <span className="text-xs text-slate-400">なし</span>
                    )}
                 </div>
                 <div className="flex-1">
                   {tabImage ? (
                     <button
                       onClick={() => handleDownload(tabImage, '_tab')}
                       className="w-full py-2 bg-green-500 text-white rounded text-xs font-bold hover:bg-green-600 flex items-center justify-center gap-1"
                     >
                       <Download className="w-3 h-3" /> ダウンロード
                     </button>
                   ) : (
                     <p className="text-xs text-slate-400">上のリストから「Tab画像に設定」を押してください</p>
                   )}
                 </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Edit Modal */}
      {editingImage && editImageSrc && editImageSize && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col md:flex-row h-[100dvh]">
          
          {/* Toolbar */}
          <div className="md:w-16 bg-slate-900 flex md:flex-col items-center justify-between md:justify-start p-3 gap-4 border-r border-slate-800 shrink-0">
             <button onClick={closeEditModal} className="text-slate-400 hover:text-white">
               <X className="w-6 h-6" />
             </button>
             
             <div className="flex md:flex-col gap-4 items-center">
               <button 
                onClick={() => setZoom(z => Math.min(z * 1.2, 4))} 
                className="text-slate-400 hover:text-white p-2 bg-slate-800 rounded-full"
               >
                 <ZoomIn className="w-5 h-5" />
               </button>
               <span className="text-xs text-slate-500 font-mono">{Math.round(zoom * 100)}%</span>
               <button 
                onClick={() => setZoom(z => Math.max(z / 1.2, 0.05))}
                className="text-slate-400 hover:text-white p-2 bg-slate-800 rounded-full"
               >
                 <ZoomOut className="w-5 h-5" />
               </button>

               <div className="w-px h-6 bg-slate-700 md:w-6 md:h-px"></div>

               <button
                 onClick={() => setEditMode(editMode === 'crop' ? 'pan' : 'crop')}
                 className={`p-2 rounded-full transition-colors ${editMode === 'pan' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                 title="移動 / 切り抜き"
               >
                 {editMode === 'pan' ? <Hand className="w-5 h-5" /> : <CropIcon className="w-5 h-5" />}
               </button>
               
               <button
                 onClick={() => setShowGrid(!showGrid)}
                 className={`p-2 rounded-full transition-colors ${showGrid ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                 title="グリッド分割 (Grid Split)"
               >
                 <LayoutGrid className="w-5 h-5" />
               </button>

               <button
                 onClick={handleFitToScreen}
                 className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-full"
                 title="画面に合わせる"
               >
                 <Maximize className="w-5 h-5" />
               </button>
             </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 relative min-h-0 bg-checkerboard overflow-auto">
            {/* Scrollable Content Wrapper with Auto Margin Centering */}
            <div 
              ref={canvasContainerRef}
              className={`min-w-full min-h-full flex p-[40vmin] md:p-20 select-none ${editMode === 'crop' && !showGrid ? 'touch-none' : ''}`}
              
              /* Desktop Mouse Events */
              onMouseDown={handleStart}
              onMouseMove={handleMove}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              
              /* Mobile Touch Events (Explicit) */
              onTouchStart={handleStart}
              onTouchMove={handleMove}
              onTouchEnd={handleEnd}
              
              style={{ 
                touchAction: editMode === 'pan' ? 'auto' : 'none',
                cursor: editMode === 'pan' ? 'grab' : 'crosshair'
              }}
            >
               <div 
                 className="relative shadow-2xl m-auto flex-shrink-0" 
                 style={{ 
                   width: editImageSize.width * zoom, 
                   height: editImageSize.height * zoom 
                 }}
               >
                  {/* Base Image */}
                  <img 
                    ref={editImageRef}
                    src={editImageSrc} 
                    alt="Edit" 
                    className="absolute inset-0 w-full h-full pointer-events-none select-none"
                    draggable={false}
                    onLoad={(e) => {
                      originalImageRef.current = e.currentTarget;
                    }}
                  />

                  {/* Grid Overlay */}
                  {showGrid && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox={`0 0 ${editImageSize.width} ${editImageSize.height}`}>
                      {/* Vertical Lines */}
                      {Array.from({ length: gridCols - 1 }).map((_, i) => (
                        <line 
                          key={`v-${i}`}
                          x1={(editImageSize.width / gridCols) * (i + 1)} 
                          y1="0" 
                          x2={(editImageSize.width / gridCols) * (i + 1)} 
                          y2={editImageSize.height} 
                          stroke="cyan" 
                          strokeWidth={2 / zoom}
                          strokeDasharray={`${8/zoom} ${4/zoom}`}
                        />
                      ))}
                      {/* Horizontal Lines */}
                      {Array.from({ length: gridRows - 1 }).map((_, i) => (
                        <line 
                          key={`h-${i}`}
                          x1="0" 
                          y1={(editImageSize.height / gridRows) * (i + 1)} 
                          x2={editImageSize.width} 
                          y2={(editImageSize.height / gridRows) * (i + 1)} 
                          stroke="cyan" 
                          strokeWidth={2 / zoom}
                          strokeDasharray={`${8/zoom} ${4/zoom}`}
                        />
                      ))}
                    </svg>
                  )}

                  {/* Crop Overlay */}
                  {cropRect && !showGrid && (
                     <div 
                       className="absolute border-2 border-white outline outline-2 outline-black outline-dashed pointer-events-none z-10 box-border"
                       style={{
                         left: cropRect.x * zoom,
                         top: cropRect.y * zoom,
                         width: cropRect.width * zoom,
                         height: cropRect.height * zoom,
                       }}
                     >
                     </div>
                  )}
               </div>
            </div>
          </div>

          {/* Bottom Panel */}
          <div className="bg-white border-t md:border-t-0 md:border-l border-slate-200 p-4 flex flex-col gap-4 shadow-xl z-50 shrink-0 md:w-80">
             {showGrid ? (
                <>
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm text-indigo-600">
                    <LayoutGrid className="w-4 h-4" /> グリッド分割 (Grid Split)
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">行数 (Rows)</label>
                      <input 
                        type="number" min="1" max="10" 
                        value={gridRows}
                        onChange={(e) => setGridRows(Number(e.target.value))}
                        className="w-full bg-white text-slate-900 border border-slate-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">列数 (Cols)</label>
                      <input 
                        type="number" min="1" max="10" 
                        value={gridCols}
                        onChange={(e) => setGridCols(Number(e.target.value))}
                        className="w-full bg-white text-slate-900 border border-slate-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="bg-indigo-50 p-3 rounded text-xs text-indigo-700">
                     画像全体を {gridRows}x{gridCols} ({gridRows * gridCols}個) に等分割して、一括でスタンプ化します。
                  </div>

                  <button 
                    onClick={handleGridSplit}
                    className="w-full py-3 bg-indigo-600 text-white rounded font-bold text-sm hover:bg-indigo-700 shadow-md flex items-center justify-center gap-2 mt-auto"
                  >
                    <Scissors className="w-4 h-4" /> 一括抽出 (Split All)
                  </button>
                </>
             ) : (
                <>
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <Scissors className="w-4 h-4" /> 編集 (Edit)
                  </h3>

                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-2 flex justify-between">
                      <span>透過の強さ (Tolerance)</span>
                      <span>{tolerance}</span>
                    </label>
                    <input 
                      type="range" 
                      min="1" 
                      max="100" 
                      value={tolerance} 
                      onChange={(e) => setTolerance(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      値が大きいほど、白に近い色も消えます。
                    </p>
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 rounded border border-slate-200 p-2 min-h-[80px]">
                      <span className="text-xs text-slate-400 mb-1">プレビュー (Preview)</span>
                      {editPreviewUrl ? (
                        <img src={editPreviewUrl} className="max-h-24 object-contain bg-checkerboard" alt="Preview" />
                      ) : (
                        <div className="text-slate-300 text-xs">変更なし</div>
                      )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    <button 
                      onClick={handlePreviewEdit}
                      className="col-span-1 py-2 bg-slate-100 text-slate-700 rounded font-bold text-xs hover:bg-slate-200 flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> 確認 (Check)
                    </button>
                    
                    <button 
                      onClick={handleSaveAsNew}
                      className="col-span-1 py-2 bg-indigo-500 text-white rounded font-bold text-xs hover:bg-indigo-600 shadow-sm flex items-center justify-center gap-1"
                    >
                      <FilePlus className="w-3 h-3" /> 抽出保存 (New)
                    </button>

                    <button 
                      onClick={applyEdit}
                      className="col-span-2 py-2.5 bg-green-500 text-white rounded font-bold text-sm hover:bg-green-600 shadow-md flex items-center justify-center gap-1"
                    >
                      <Save className="w-4 h-4" /> 上書き保存 (Overwrite)
                    </button>
                  </div>
                </>
             )}
          </div>

        </div>
      )}

      {/* AI Refine Modal */}
      {refiningImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
             
             {/* Header */}
             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
               <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                 <Sparkles className="w-5 h-5 text-indigo-500" />
                 AI修正 (AI Refine)
               </h3>
               <button onClick={handleRefineClose} className="text-slate-400 hover:text-slate-600">
                 <X className="w-6 h-6" />
               </button>
             </div>

             {/* Content */}
             <div className="flex-1 overflow-auto p-6 bg-slate-50">
               <div className="grid md:grid-cols-2 gap-6 items-center">
                 {/* Before */}
                 <div className="flex flex-col gap-2">
                   <div className="bg-checkerboard rounded-lg border border-slate-200 p-4 flex items-center justify-center h-64">
                     <img src={refiningImage.url} className="max-h-full max-w-full object-contain" alt="Original" />
                   </div>
                   <p className="text-center text-xs text-slate-500 font-bold">修正前 (Original)</p>
                 </div>
                 
                 {/* Arrow (Mobile: Down, Desktop: Right) */}
                 <div className="flex justify-center text-slate-300">
                    <ArrowRight className="w-8 h-8 rotate-90 md:rotate-0" />
                 </div>

                 {/* After */}
                 <div className="flex flex-col gap-2">
                   <div className="bg-checkerboard rounded-lg border border-slate-200 p-4 flex items-center justify-center h-64 relative">
                      {isRefining ? (
                        <div className="flex flex-col items-center gap-2">
                          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                          <span className="text-xs text-indigo-600 font-bold">AI描画中...</span>
                        </div>
                      ) : refineResult ? (
                        <img src={refineResult.url} className="max-h-full max-w-full object-contain" alt="Refined" />
                      ) : (
                        <span className="text-sm text-slate-400">ここに結果が表示されます</span>
                      )}
                   </div>
                   <p className="text-center text-xs text-slate-500 font-bold">修正後 (Result)</p>
                 </div>
               </div>
             </div>

             {/* Footer (Chat Input) */}
             <div className="p-4 bg-white border-t border-slate-200">
               <div className="flex flex-col gap-3">
                 <div className="relative">
                   <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                   <input
                     type="text"
                     value={refinePrompt}
                     onChange={(e) => setRefinePrompt(e.target.value)}
                     placeholder="修正指示を入力（例: 髪の色をピンクにして、笑顔にして）"
                     className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                     onKeyDown={(e) => e.key === 'Enter' && handleRefineGenerate()}
                   />
                 </div>
                 <div className="flex justify-between gap-3 items-center">
                    {/* Resolution Selector inside Refine Modal */}
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100 p-1.5 rounded">
                      <span>画質:</span>
                      <select 
                        value={resolution} 
                        onChange={(e) => setResolution(e.target.value as '1K' | '4K')}
                        className="bg-transparent text-slate-700 outline-none"
                      >
                        <option value="1K">1K (標準)</option>
                        <option value="4K">4K (高画質)</option>
                      </select>
                    </div>

                    <div className="flex gap-2">
                      {refineResult && (
                        <button
                          onClick={handleRefineSave}
                          className="px-6 py-2.5 bg-green-500 text-white rounded-lg font-bold text-sm hover:bg-green-600 flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" /> 保存する
                        </button>
                      )}
                      <button
                        onClick={handleRefineGenerate}
                        disabled={isRefining || !refinePrompt}
                        className={`px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 ${
                          isRefining || !refinePrompt 
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      >
                        <Wand2 className="w-4 h-4" />
                        修正を実行
                      </button>
                    </div>
                 </div>
               </div>
             </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Workstation;
