'use client';

import React, { useState } from 'react';

const EMOJIS = [
  '😀',
  '😃',
  '😄',
  '😁',
  '😆',
  '😅',
  '😂',
  '🤣',
  '😊',
  '😇',
  '🙂',
  '🙃',
  '😉',
  '😌',
  '😍',
  '🥰',
  '😘',
  '😗',
  '😙',
  '😚',
  '😋',
  '😛',
  '😝',
  '😜',
  '🤪',
  '🤨',
  '🧐',
  '🤓',
  '😎',
  '🤩',
  '🥳',
  '😏',
  '😒',
  '😞',
  '😔',
  '😟',
  '😕',
  '🙁',
  '☹️',
  '😣',
  '😖',
  '😫',
  '😩',
  '🥺',
  '😢',
  '😭',
  '😤',
  '😠',
  '😡',
  '🤬',
  '🤯',
  '😳',
  '🥵',
  '🥶',
  '😱',
  '😨',
  '😰',
  '😥',
  '😓',
  '🤗',
  '🤔',
  '🤭',
  '🤫',
  '🤥',
  '😶',
  '😐',
  '😑',
  '😬',
  '🙄',
  '😯',
  '😦',
  '😧',
  '😮',
  '😲',
  '🥱',
  '😴',
  '🤤',
  '😪',
  '😵',
  '🤐',
  '🥴',
  '🤢',
  '🤮',
  '🤧',
  '🤨',
  '🧐',
  '🤓',
  '😎',
  '🤩',
  '🥳',
  '👋',
  '🤚',
  '🖐',
  '✋',
  '🖖',
  '👌',
  '🤏',
  '✌️',
  '🤞',
  '🤟',
  '🤘',
  '🤙',
  '👈',
  '👉',
  '👆',
  '🖕',
  '👇',
  '☝️',
  '👍',
  '👎',
  '✊',
  '👊',
  '🤛',
  '🤜',
  '👏',
  '🙌',
  '👐',
  '🤲',
  '🤝',
  '🙏',
  '✍️',
  '💅',
  '🤳',
  '💪',
  '🦾',
  '🦵',
  '🦶',
  '👂',
  '🦻',
  '👃',
  '🧠',
  '🦷',
  '🦴',
  '👀',
  '👁',
  '👅',
  '👄',
  '💋',
  '🩸',
  '❤️',
];

type Props = {
  onSelect: (emoji: string) => void;
};

export default function EmojiPicker({ onSelect }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="h-10 w-10 flex items-center justify-center text-slate-500 hover:text-white transition-all rounded-xl hover:bg-white/5"
      >
        <span className="material-icons">sentiment_satisfied</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[190]" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 mb-4 w-64 p-3 rounded-[32px] bg-slate-900 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[200] animate-fade-in backdrop-blur-2xl">
            <div className="px-2 py-1 text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Select Emoji
            </div>
            <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto scrollbar-hide">
              {EMOJIS.map((emoji, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onSelect(emoji);
                    setOpen(false);
                  }}
                  className="h-7 w-7 flex items-center justify-center text-lg hover:bg-white/10 rounded-lg transition-all active:scale-90"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-[10px] border-transparent border-t-slate-900" />
          </div>
        </>
      )}
    </div>
  );
}
