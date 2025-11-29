import { LineImageSize } from './types';

export const LINE_GUIDELINES = {
  [LineImageSize.MAIN]: {
    width: 240,
    height: 240,
    label: 'Main Image / メイン画像 (240x240)',
    description: 'The main icon for the sticker pack.'
  },
  [LineImageSize.STICKER]: {
    width: 370,
    height: 320,
    label: 'Sticker Image / スタンプ画像 (Max 370x320)',
    description: 'The actual sticker sent in chats. Must be even dimensions.'
  },
  [LineImageSize.ANIMATION]: {
    width: 320,
    height: 270,
    label: 'Animation Sticker / アニメーションスタンプ (Max 320x270)',
    description: 'For animated stickers. Max 320x270 px.'
  },
  [LineImageSize.TAB]: {
    width: 96,
    height: 74,
    label: 'Chat Tab Image / トークルームタブ画像 (96x74)',
    description: 'Small icon shown in the sticker selection tab.'
  }
};

export const STICKER_MARGIN = 10; // 10px margin requirement around the content
export const ANIMATION_FRAME_DELAY = 300; // ms
export const MAX_ANIMATION_FRAMES = 20; // LINE limit is actually up to 20 for some types, keep reasonable.

// Credit costs (クレジット消費)
export const CREDIT_COST_1K = 5; // 1K resolution: 5 credits
export const CREDIT_COST_4K = 9; // 4K resolution: 9 credits