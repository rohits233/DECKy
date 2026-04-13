'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  const words = ['stunning', 'impressive', 'professional', 'beautiful', 'engaging', 'memorable'];

  useEffect(() => {
    setIsVisible(true);

    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);

    // Typewriter effect
    const typeSpeed = 150;
    const deleteSpeed = 100;
    const pauseTime = 2000;

    const typeWriter = () => {
      const currentWordText = words[currentIndex];
      
      if (!isDeleting) {
        if (currentWord.length < currentWordText.length) {
          setCurrentWord(currentWordText.substring(0, currentWord.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), pauseTime);
        }
      } else {
        if (currentWord.length > 0) {
          setCurrentWord(currentWordText.substring(0, currentWord.length - 1));
        } else {
          setIsDeleting(false);
          setCurrentIndex((prev) => (prev + 1) % words.length);
        }
      }
    };

    const timer = setTimeout(typeWriter, isDeleting ? deleteSpeed : typeSpeed);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [currentWord, currentIndex, isDeleting, words]);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrollY > 50 ? 'bg-white/80 backdrop-blur-2xl border-b border-gray-200' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold">Decky</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[14px]">
            <a href="#features" className="text-gray-600 hover:text-gray-900 transition">Features</a>
            <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 transition">How it works</a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-[14px] text-gray-600 hover:text-gray-900 transition font-medium">
              Sign in
            </Link>
            <Link href="/auth/login" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-[14px] font-medium">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-white"></div>
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(0 0 0) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>

        <div className={`relative max-w-5xl mx-auto text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-[13px] text-blue-700 font-medium mb-8">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
            Powered by advanced AI
          </div>

          {/* Headline */}
          <h1 className="text-[64px] md:text-[80px] font-bold leading-[1.1] tracking-tight mb-6">
            <span className="block text-gray-900">Create presentations</span>
            <span className="block bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              that are {currentWord}
              <span className="animate-blink">|</span>
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-[20px] text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Transform your ideas into professional slide decks in seconds. 
            Just chat with AI, upload documents, and export to PowerPoint.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link href="/auth/login" className="group px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all text-[15px] font-semibold shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 flex items-center gap-2">
              Get started free
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <button className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all text-[15px] font-semibold flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
              </svg>
              Watch demo
            </button>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-6 text-[13px] text-gray-500">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-gray-700 font-medium">10,000+ users</span>
            </div>
            <div className="w-px h-3 bg-gray-300"></div>
            <span>No credit card required</span>
            <div className="w-px h-3 bg-gray-300"></div>
            <span>Free forever</span>
          </div>
        </div>

        {/* Product Preview */}
        <div className="relative max-w-6xl mx-auto mt-20">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-white">
            <div className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 p-8">
              <div className="h-full bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center justify-center">
                <div className="w-full max-w-3xl space-y-4">
                  <div className="h-12 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-lg"></div>
                  <div className="h-8 bg-gradient-to-r from-gray-100 to-blue-50 rounded-lg w-3/4"></div>
                  <div className="h-8 bg-gradient-to-r from-gray-100 to-blue-50 rounded-lg w-2/3"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section - Bento Grid */}
      <div id="features" className="py-32 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[48px] font-bold mb-4">Everything you need</h2>
            <p className="text-[18px] text-gray-600">Professional tools for modern presentations</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[280px]">
            {/* AI Creation - Large */}
            <div className="md:col-span-2 md:row-span-2 group relative bg-white rounded-2xl p-8 border border-gray-200 hover:border-blue-200 hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-transparent rounded-full -mr-32 -mt-32 opacity-50"></div>
              <div className="relative h-full flex flex-col">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-[28px] font-bold mb-4">AI-Powered Creation</h3>
                <p className="text-[16px] text-gray-600 leading-relaxed mb-6 max-w-md">
                  Describe what you want in natural language. Our AI understands context and creates professional slides with smart layouts instantly.
                </p>
                <div className="mt-auto flex gap-2">
                  <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-[13px] font-medium">Natural Language</span>
                  <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-[13px] font-medium">Smart Layouts</span>
                </div>
              </div>
            </div>

            {/* Document Upload */}
            <div className="group bg-white rounded-2xl p-8 border border-gray-200 hover:border-blue-200 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-[20px] font-bold mb-3">Document Upload</h3>
              <p className="text-[14px] text-gray-600 leading-relaxed">
                Upload any document and watch AI transform it into structured slides
              </p>
            </div>

            {/* Lightning Fast */}
            <div className="group bg-white rounded-2xl p-8 border border-gray-200 hover:border-blue-200 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-[20px] font-bold mb-3">Lightning Fast</h3>
              <p className="text-[14px] text-gray-600 leading-relaxed">
                Create complete presentations in minutes, not hours
              </p>
            </div>

            {/* Professional Templates */}
            <div className="md:col-span-2 group bg-white rounded-2xl p-8 border border-gray-200 hover:border-blue-200 hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                  </div>
                  <h3 className="text-[24px] font-bold mb-3">Designer-Grade Templates</h3>
                  <p className="text-[15px] text-gray-600 leading-relaxed max-w-lg">
                    Consultant-quality layouts with stunning visuals and professional styling. Every slide looks like it was made by a design team.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-6">
                <div className="aspect-video bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-gray-200 p-3 flex flex-col justify-between">
                  <div className="h-2 bg-blue-200 rounded w-3/4"></div>
                  <div className="space-y-1.5">
                    <div className="h-1.5 bg-gray-200 rounded"></div>
                    <div className="h-1.5 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </div>
                <div className="aspect-video bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-gray-200 p-3 flex flex-col justify-between">
                  <div className="h-2 bg-purple-200 rounded w-2/3"></div>
                  <div className="space-y-1.5">
                    <div className="h-1.5 bg-gray-200 rounded"></div>
                    <div className="h-1.5 bg-gray-200 rounded w-4/5"></div>
                  </div>
                </div>
                <div className="aspect-video bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg border border-gray-200 p-3 flex flex-col justify-between">
                  <div className="h-2 bg-cyan-200 rounded w-1/2"></div>
                  <div className="space-y-1.5">
                    <div className="h-1.5 bg-gray-200 rounded"></div>
                    <div className="h-1.5 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Export */}
            <div className="group bg-white rounded-2xl p-8 border border-gray-200 hover:border-blue-200 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <h3 className="text-[20px] font-bold mb-3">Export Anywhere</h3>
              <p className="text-[14px] text-gray-600 leading-relaxed">
                One-click export to PowerPoint, PDF, or present directly
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12 text-center">
            {[
              { number: '10,000+', label: 'Active Users', sublabel: 'Creating presentations daily' },
              { number: '50,000+', label: 'Slides Generated', sublabel: 'Powered by AI' },
              { number: '99%', label: 'Satisfaction', sublabel: 'From our users' }
            ].map((stat, idx) => (
              <div key={idx} className="group cursor-pointer">
                <div className="text-[56px] font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
                  {stat.number}
                </div>
                <div className="text-[18px] font-semibold text-gray-900 mb-1">{stat.label}</div>
                <div className="text-[14px] text-gray-500">{stat.sublabel}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-32 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-[56px] font-bold mb-6">Ready to get started?</h2>
          <p className="text-[20px] text-gray-600 mb-10 max-w-2xl mx-auto">
            Join thousands of professionals creating stunning presentations with Decky
          </p>
          <Link href="/auth/login" className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all text-[16px] font-semibold shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30">
            Get started free
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold">Decky</span>
          </div>
          <p className="text-[14px] text-gray-500">© 2024 Decky. All rights reserved.</p>
        </div>
      </footer>

      <style jsx>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .animate-blink {
          animation: blink 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
