'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Project, Slide, Document, ChatMessage } from '@/types';
import PresentationMode from '@/components/PresentationMode';
import FileUpload from '@/components/FileUpload';
import { TitleSlide, BulletsSlide, NumbersSlide, TimelineSlide, TwoColumnSlide, ContentSlide, ImageTextSlide } from '@/components/SlideLayouts';

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [insights, setInsights] = useState<{ type: string; content: string }[]>([]);
  const [showInsights, setShowInsights] = useState(false);
  const [isPresentMode, setIsPresentMode] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState<number | null>(null);

  useEffect(() => {
    loadProject();
    loadSlides();
    loadDocuments();
    loadMessages();
    loadInsights();
    checkUndoAvailable();
  }, [projectId]);

  const loadInsights = async () => {
    const { data } = await supabase
      .from('insights')
      .select('type, content')
      .eq('project_id', projectId);
    if (data) setInsights(data);
  };

  const checkUndoAvailable = async () => {
    const { data } = await supabase
      .from('slide_history')
      .select('id')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    setCanUndo(!!data && data.length > 0);
  };

  const saveSlideSnapshot = async () => {
    if (slides.length === 0) return;
    
    const snapshot = slides.map(s => ({
      id: s.id,
      order: s.order,
      title: s.title,
      content: s.content,
      layout: s.layout,
      icon: s.icon,
      color: s.color,
      background: s.background,
      font_size: s.font_size
    }));

    await supabase.from('slide_history').insert([{
      project_id: projectId,
      snapshot: snapshot
    }]);
  };

  const handleUndo = async () => {
    const { data: history } = await supabase
      .from('slide_history')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!history) return;

    await supabase.from('slides').delete().eq('project_id', projectId);

    const restoredSlides = (history.snapshot as any[]).map(s => ({
      project_id: projectId,
      order: s.order,
      title: s.title,
      content: s.content,
      layout: s.layout,
      icon: s.icon,
      color: s.color,
      background: s.background,
      font_size: s.font_size
    }));

    await supabase.from('slides').insert(restoredSlides);
    await supabase.from('slide_history').delete().eq('id', history.id);

    loadSlides();
    checkUndoAvailable();
  };

  const showChangesApplied = () => {
    setShowUndoToast(true);
    setTimeout(() => setShowUndoToast(false), 5000);
  };

  const loadProject = async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    
    if (data) setProject(data);
    setLoading(false);
  };

  const loadSlides = async () => {
    const { data } = await supabase
      .from('slides')
      .select('*')
      .eq('project_id', projectId)
      .order('order', { ascending: true });
    
    if (data) setSlides(data);
  };

  const loadDocuments = async () => {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('project_id', projectId);
    
    if (data) setDocuments(data);
  };

  const loadMessages = async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data);
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user' as const, content: input };
    
    await supabase.from('chat_messages').insert([{
      project_id: projectId,
      role: 'user',
      content: input
    }]);

    setMessages([...messages, userMessage as ChatMessage]);
    setInput('');
    setChatLoading(true);

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
        slides: slides.map(s => ({ 
          title: s.title, 
          content: s.content, 
          layout: s.layout, 
          icon: s.icon, 
          color: s.color,
          background: s.background,
          font_size: s.font_size
        })),
        phase: project?.phase || 'content',
        documents: documents.map(d => d.filename)
      }),
    });

    const result = await response.json();

    await supabase.from('chat_messages').insert([{
      project_id: projectId,
      role: 'assistant',
      content: result.message
    }]);

    if (result.slides && result.action !== 'none') {
      await saveSlideSnapshot();

      if (result.action === 'create') {
        await supabase.from('slides').delete().eq('project_id', projectId);
        
        const newSlides = result.slides.map((slide: any, idx: number) => ({
          project_id: projectId,
          order: idx,
          title: slide.title || 'Untitled',
          content: slide.content || '',
          layout: slide.layout || 'content',
          icon: slide.icon,
          color: slide.color || 'indigo',
          background: slide.background,
          font_size: slide.font_size
        }));

        await supabase.from('slides').insert(newSlides);
      } else if (result.action === 'add') {
        const newSlides = result.slides.map((slide: any, idx: number) => ({
          project_id: projectId,
          order: slides.length + idx,
          title: slide.title || 'Untitled',
          content: slide.content || '',
          layout: slide.layout || 'content',
          icon: slide.icon,
          color: slide.color || 'indigo',
          background: slide.background,
          font_size: slide.font_size
        }));

        await supabase.from('slides').insert(newSlides);
      } else if (result.action === 'update') {
        await supabase.from('slides').delete().eq('project_id', projectId);
        
        const updatedSlides = result.slides.map((slide: any, idx: number) => ({
          project_id: projectId,
          order: idx,
          title: slide.title || 'Untitled',
          content: slide.content || '',
          layout: slide.layout || 'content',
          icon: slide.icon,
          color: slide.color || 'indigo',
          background: slide.background,
          font_size: slide.font_size
        }));

        await supabase.from('slides').insert(updatedSlides);
      }
      
      loadSlides();
      checkUndoAvailable();
      showChangesApplied();
    }

    loadMessages();
    setChatLoading(false);
  };


  const handleGenerateDeck = async () => {
    if (documents.length === 0) {
      alert('Upload at least one document first (PDF, DOCX, or TXT)');
      return;
    }

    setPipelineLoading(true);
    try {
      const res = await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          documentIds: documents.map((d) => d.id),
          projectTitle: project?.title,
          prompt: input || undefined,
          generateScripts: true,
        }),
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.error || 'Pipeline failed');

      setInsights(result.insights || []);

      await saveSlideSnapshot();
      await supabase.from('slides').delete().eq('project_id', projectId);

      const slidesToInsert = (result.slides || []).map((slide: any, idx: number) => {
        const script = result.scripts?.[idx];
        return {
          project_id: projectId,
          order: idx,
          title: slide.title || 'Untitled',
          content: slide.content || '',
          layout: slide.layout || 'content',
          icon: slide.icon,
          color: slide.color || 'indigo',
          presenter_notes: script?.speakerNotes,
          talking_points: script?.talkingPoints,
          suggested_duration: script?.suggestedDuration,
        };
      });

      await supabase.from('slides').insert(slidesToInsert);
      loadSlides();
      loadInsights();
      checkUndoAvailable();
      setShowInsights(true);
      showChangesApplied();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate deck');
    } finally {
      setPipelineLoading(false);
    }
  };

  const switchPhase = async (newPhase: 'content' | 'design') => {
    await supabase
      .from('projects')
      .update({ phase: newPhase })
      .eq('id', projectId);
    
    setProject({ ...project!, phase: newPhase });
  };

  const handleExportPptx = async () => {
    if (slides.length === 0) {
      alert('No slides to export!');
      return;
    }

    const response = await fetch('/api/export/pptx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slides: slides.map(s => ({
          title: s.title,
          content: s.content,
          order: s.order,
          presenter_notes: s.presenter_notes
        })),
        projectTitle: project?.title || 'Presentation'
      }),
    });

    const { data, filename } = await response.json();

    const blob = base64ToBlob(data, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const base64ToBlob = (base64: string, type: string) => {
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type });
  };

  const renderSlideLayout = (slide: Slide) => {
    switch (slide.layout) {
      case 'title':
        return <TitleSlide slide={slide} />;
      case 'bullets':
        return <BulletsSlide slide={slide} />;
      case 'numbers':
        return <NumbersSlide slide={slide} />;
      case 'timeline':
        return <TimelineSlide slide={slide} />;
      case 'two-column':
        return <TwoColumnSlide slide={slide} />;
      case 'image-text':
        return <ImageTextSlide slide={slide} />;
      default:
        return <ContentSlide slide={slide} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[13px] text-white/50">Loading your presentation...</p>
        </div>
      </div>
    );
  }

  if (isPresentMode) {
    return <PresentationMode slides={slides} onClose={() => setIsPresentMode(false)} />;
  }

  const currentPhase = project?.phase || 'content';

  return (
    <main className="h-screen flex flex-col bg-[#0A0A0A] text-white">
      {/* Subtle grid pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
        backgroundSize: '64px 64px'
      }}></div>

      {/* Toast Notification */}
      {showUndoToast && (
        <div className="fixed top-4 right-4 z-50 bg-white/[0.08] border border-white/[0.12] text-white px-4 py-3 rounded-lg flex items-center gap-3 backdrop-blur-xl">
          <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center">
            <span className="text-[13px]">✓</span>
          </div>
          <div>
            <div className="text-[13px] font-medium">Changes Applied</div>
          </div>
          {canUndo && (
            <button
              onClick={handleUndo}
              className="ml-2 px-3 py-1.5 bg-white text-black rounded-md hover:bg-white/90 transition text-[12px] font-medium"
            >
              Undo
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <div className="relative z-10 border-b border-white/[0.08]">
        <div className="max-w-full px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-[15px] text-black">
                D
              </div>
              <div>
                <h1 className="text-[15px] font-semibold">{project?.title}</h1>
                <p className="text-[12px] text-white/40">{slides.length} slides • {currentPhase === 'content' ? 'Content' : 'Design'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Phase Toggle */}
              <div className="flex bg-white/[0.05] rounded-md p-0.5 border border-white/[0.08]">
                <button
                  onClick={() => switchPhase('content')}
                  className={`px-3 py-1.5 rounded text-[13px] font-medium transition ${
                    currentPhase === 'content'
                      ? 'bg-white text-black'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Content
                </button>
                <button
                  onClick={() => switchPhase('design')}
                  className={`px-3 py-1.5 rounded text-[13px] font-medium transition ${
                    currentPhase === 'design'
                      ? 'bg-white text-black'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Design
                </button>
              </div>

              {currentPhase === 'design' && (
                <>
                  <button
                    onClick={() => setIsPresentMode(true)}
                    disabled={slides.length === 0}
                    className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md hover:bg-emerald-500/30 transition disabled:opacity-50 text-[13px] font-medium"
                  >
                    Present
                  </button>
                  <button
                    onClick={handleExportPptx}
                    disabled={slides.length === 0}
                    className="px-3 py-1.5 bg-white text-black rounded-md hover:bg-white/90 transition disabled:opacity-50 text-[13px] font-medium"
                  >
                    Export
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex overflow-hidden">
        {/* Slides Sidebar */}
        <div className="w-80 border-r border-white/[0.08] overflow-y-auto flex flex-col">
          {/* Documents & Generate */}
          <div className="p-4 border-b border-white/[0.08]">
            <h3 className="text-[12px] font-medium text-white/50 uppercase tracking-wide mb-3">Documents</h3>
            <FileUpload
              projectId={projectId}
              documents={documents}
              onRefresh={loadDocuments}
            />
            <div className="mt-3">
              <button
                onClick={handleGenerateDeck}
                disabled={pipelineLoading || documents.length === 0}
                className="w-full px-3 py-2.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-500 transition disabled:opacity-50 disabled:cursor-not-allowed text-[13px] font-medium"
              >
                {pipelineLoading ? 'Processing...' : 'Generate Deck'}
              </button>
            </div>
          </div>

          {/* Insights toggle */}
          {insights.length > 0 && (
            <div className="p-4 border-b border-white/[0.08]">
              <button
                onClick={() => setShowInsights(!showInsights)}
                className="w-full flex justify-between items-center text-[12px] font-medium text-white/60 uppercase tracking-wide"
              >
                Extracted Insights
                <span className="text-[10px]">{showInsights ? '▼' : '▶'}</span>
              </button>
              {showInsights && (
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                  {insights.map((i, idx) => (
                    <div key={idx} className="text-[12px] bg-white/[0.03] rounded p-2">
                      <span className="text-emerald-400/80 font-medium">[{i.type}]</span> {i.content}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="p-4 flex-1">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[12px] font-medium text-white/50 uppercase tracking-wide">Slides</h3>
              {selectedSlideIndex !== null && (
                <button
                  onClick={() => setSelectedSlideIndex(null)}
                  className="text-[11px] text-white/50 hover:text-white font-medium px-2 py-1 bg-white/[0.05] rounded hover:bg-white/[0.08] transition"
                >
                  ← Chat
                </button>
              )}
            </div>
            
            {slides.length === 0 ? (
              <div className="text-center py-12 text-white/40">
                <div className="text-3xl mb-2">📄</div>
                <p className="text-[12px]">No slides yet</p>
              </div>
            ) : (
              slides.map((slide, idx) => (
                <div
                  key={slide.id}
                  onClick={() => setSelectedSlideIndex(idx)}
                  className={`group relative rounded-lg p-3 transition cursor-pointer ${
                    selectedSlideIndex === idx
                      ? 'bg-white/[0.08] border border-white/[0.12]'
                      : 'bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {slide.icon && (
                      <div className="text-xl flex-shrink-0">{slide.icon}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-white/40 mb-1">#{idx + 1}</div>
                      <div className="text-[13px] font-medium mb-1 line-clamp-2">{slide.title}</div>
                      <div className="text-[11px] text-white/40 line-clamp-2">{slide.content}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Slide Preview */}
          {selectedSlideIndex !== null && slides[selectedSlideIndex] && (
            <div className="flex-1 overflow-hidden bg-[#0F0F0F] flex flex-col">
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-5xl aspect-video">
                  {renderSlideLayout(slides[selectedSlideIndex])}
                </div>
              </div>
              {slides[selectedSlideIndex].presenter_notes && (
                <div className="border-t border-white/[0.08] p-4 bg-white/[0.02]">
                  <h4 className="text-[11px] font-medium text-white/50 uppercase tracking-wide mb-2">Presenter Notes</h4>
                  <p className="text-[13px] text-white/80">{slides[selectedSlideIndex].presenter_notes}</p>
                  {Array.isArray(slides[selectedSlideIndex].talking_points) && (slides[selectedSlideIndex].talking_points as string[]).length > 0 && (
                    <ul className="mt-2 space-y-1 text-[12px] text-white/60">
                      {(slides[selectedSlideIndex].talking_points as string[]).map((p, i) => (
                        <li key={i}>• {p}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Chat Messages */}
          {selectedSlideIndex === null && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-16">
                    <div className="text-5xl mb-4">{currentPhase === 'content' ? '📝' : '🎨'}</div>
                    <h2 className="text-[24px] font-semibold mb-2">
                      {currentPhase === 'content' ? 'Build Your Content' : 'Design Your Slides'}
                    </h2>
                    <p className="text-white/50 mb-8 text-[14px]">
                      {currentPhase === 'content'
                        ? 'Tell me what you want in your presentation'
                        : 'Let\'s make your slides look amazing'}
                    </p>
                    <div className="max-w-lg mx-auto bg-white/[0.02] border border-white/[0.08] rounded-lg p-5">
                      <p className="text-[12px] font-medium text-white/60 mb-3">Try these commands:</p>
                      <div className="space-y-2 text-[13px] text-white/70 text-left">
                        {currentPhase === 'content' ? (
                          <>
                            <div className="bg-white/[0.02] rounded p-2">"Create 5 slides about digital marketing"</div>
                            <div className="bg-white/[0.02] rounded p-2">"Add 3 slides about our timeline"</div>
                            <div className="bg-white/[0.02] rounded p-2">"Delete slide 2"</div>
                          </>
                        ) : (
                          <>
                            <div className="bg-white/[0.02] rounded p-2">"Make all slides blue with icons"</div>
                            <div className="bg-white/[0.02] rounded p-2">"Use a professional gradient theme"</div>
                            <div className="bg-white/[0.02] rounded p-2">"Make the text larger"</div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-2xl rounded-lg px-4 py-3 text-[14px] ${
                        msg.role === 'user'
                          ? 'bg-white text-black'
                          : 'bg-white/[0.05] border border-white/[0.08]'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Input Bar */}
          <div className="border-t border-white/[0.08] p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-2 items-end">
                {canUndo && (
                  <button
                    onClick={handleUndo}
                    className="px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-md hover:bg-white/[0.08] transition text-[13px]"
                    title="Undo"
                  >
                    ↶
                  </button>
                )}
                <div className="flex-1 relative">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && canUndo) {
                        e.preventDefault();
                        handleUndo();
                      }
                    }}
                    placeholder={
                      currentPhase === 'content'
                        ? 'Tell me what slides you want...'
                        : 'Tell me how to style your slides...'
                    }
                    rows={2}
                    className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-md focus:outline-none focus:ring-2 focus:ring-white/20 resize-none text-[14px]"
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={chatLoading || !input.trim()}
                  className="px-4 py-2 bg-white text-black rounded-md hover:bg-white/90 transition disabled:opacity-50 text-[13px] font-medium"
                >
                  {chatLoading ? 'Sending...' : 'Send'}
                </button>
              </div>
              <div className="mt-2 text-[11px] text-white/40 text-center">
                {canUndo && 'Ctrl+Z to undo • '}Enter to send • Shift+Enter for new line
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
