
import { GoogleGenAI } from "@google/genai";

export const generateStickerImage = async (
  base64Image: string, 
  promptText: string,
  isAnimationStep: boolean = false,
  resolution: '1K' | '2K' | '4K' = '1K'
): Promise<string[]> => {
  try {
    // Initialize the client inside the function to ensure it picks up the latest selected API key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const systemInstruction = `
      You are an expert LINE Sticker illustrator (LINEスタンプのプロのイラストレーター). 
      Your task is to take the provided input image and generate a high-quality LINE sticker asset.
      
      GUIDELINES:
      1. Style: Vector-like, thick clean outlines, flat vibrant colors. (ベクター風、太い輪郭線、鮮やかなフラットカラー)
      2. Background: MUST be a solid single color (White #FFFFFF or Green #00FF00) that contrasts with the character for easy extraction.
      3. Composition: Draw the character LARGE and CENTERED, filling the canvas almost to the edges. Do NOT add your own margins. (余白は不要です。キャンバスいっぱいに大きく描いてください。後でトリミングします。)
      4. Expression: Exaggerated, emotive, and suitable for chat communication.
      5. Content: ${promptText}
      
      ${isAnimationStep 
        ? 'ANIMATION MODE: The input image is the PREVIOUS frame. You must draw the NEXT frame in the sequence. Maintain 95% consistency in character details, size, and position, but change the pose slightly to create smooth movement. (入力画像は前回のコマです。次のコマを描いてください。キャラの細部やサイズ、位置を保ちつつ、少しだけポーズを変えて動きをつけてください)' 
        : ''}
    `;

    // Use NanoBanana Pro (Gemini 3 Pro Image)
    const model = 'gemini-3-pro-image-preview';

    const contents = {
      parts: [
        {
          inlineData: {
            mimeType: 'image/png', // Assuming PNG or JPEG input
            data: base64Image
          }
        },
        {
          text: isAnimationStep 
            ? `Create the NEXT sequential animation frame based on this image. Action: ${promptText}. Ensure solid single-color background.` 
            : `Redraw this as a LINE sticker. ${promptText}. Ensure solid single-color background.`
        }
      ]
    };

    // Note: aspect ratio and size config is optional, defaulting to 1:1 and 1K which is fine for stickers
    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: resolution
        }
      }
    });

    const generatedImages: string[] = [];

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          generatedImages.push(part.inlineData.data);
        }
      }
    }

    return generatedImages;

  } catch (error) {
    console.error("Gemini API Error:", error);
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
