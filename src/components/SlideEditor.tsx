'use client';

import { useState, useEffect } from 'react';
import type { Slide } from '@/types';

interface SlideEditorProps {
  slide: Slide;
  onUpdate: (slide: Slide) => void;
}

export default function SlideEditor({ slide, onUpdate }: SlideEditorProps) {
  const [title, setTitle] = useState(slide.title);
  const [content, setContent] = useState(slide.content);

  // Update local state when slide prop changes
  useEffect(() => {
    setTitle(slide.title);
    setContent(slide.content);
  }, [slide.id, slide.title, slide.content]);

  const handleSave = () => {
    onUpdate({ ...slide, title, content });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full text-2xl font-bold border-b-2 border-gray-200 focus:border-indigo-600 outline-none pb-2"
        placeholder="Slide Title"
      />
      
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:border-indigo-600 outline-none resize-none"
        placeholder="Slide content..."
      />

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          Save Changes
        </button>
        <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition">
          AI Enhance
        </button>
      </div>
    </div>
  );
}
