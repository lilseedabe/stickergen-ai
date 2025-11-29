export const generateStickerImage = async (
  base64Image: string, 
  promptText: string,
  isAnimationStep: boolean = false,
  resolution: '1K' | '2K' | '4K' = '1K'
): Promise<string[]> => {
  try {
    // バックエンドAPIを呼ぶ
    const token = localStorage.getItem('token');
    
    const response = await fetch('/api/generate/sticker', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        base64Image,
        promptText,
        isAnimationStep,
        resolution
      })
    });

    if (!response.ok) {
      throw new Error('スタンプ生成に失敗しました');
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'スタンプ生成に失敗しました');
    }

    return data.images;

  } catch (error) {
    console.error("Generation Error:", error);
    throw error;
  }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

export const urlToBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      // remove data prefix
      resolve(base64data.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
