const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai');
const { authenticateToken } = require('../middleware/auth');

// スタンプ生成エンドポイント
// 元に戻す
router.post('/sticker', authenticateToken, async (req, res) => {
  try {
    const { base64Image, promptText, isAnimationStep = false, resolution = '1K' } = req.body;

    if (!base64Image || !promptText) {
      return res.status(400).json({
        success: false,
        message: 'base64ImageとpromptTextは必須です'
      });
    }

    // Gemini API初期化
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const systemInstruction = `
      You are an expert LINE Sticker illustrator (LINEスタンプのプロのイラストレーター).
      Your task is to take the provided input image and generate a high-quality LINE sticker asset.

      GUIDELINES:
      1. Style: Vector-like, thick clean outlines, flat vibrant colors. (ベクタ ー風、太い輪郭線、鮮やかなフラットカラー)
      2. Background: MUST be a solid single color (White #FFFFFF or Green #00FF00) that contrasts with the character for easy extraction.
      3. Composition: Draw the character LARGE and CENTERED, filling the canvas almost to the edges. Do NOT add your own margins. (余白は不要です。キャンバスい っぱいに大きく描いてください。後でトリミングします。)
      4. Expression: Exaggerated, emotive, and suitable for chat communication.
      5. Content: ${promptText}

      ${isAnimationStep
        ? 'ANIMATION MODE: The input image is the PREVIOUS frame. You must draw the NEXT frame in the sequence. Maintain 95% consistency in character details, size, and position, but change the pose slightly to create smooth movement. (入力画像は前回のコマです。次のコマを描いてください。キャラの細部やサイズ、位置を保ちつつ、少しだけポーズを変えて動きをつけてください)'
        : ''}
    `;

    const model = 'gemini-3-pro-image-preview';

    const contents = {
      parts: [
        {
          inlineData: {
            mimeType: 'image/png',
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

    const generatedImages = [];

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          generatedImages.push(part.inlineData.data);
        }
      }
    }

    res.json({
      success: true,
      images: generatedImages
    });

  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({
      success: false,
      message: 'スタンプ生成に失敗しました: ' + error.message
    });
  }
});

module.exports = router;