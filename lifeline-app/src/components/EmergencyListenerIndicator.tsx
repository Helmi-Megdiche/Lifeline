"use client";
import React, { useEffect, useState } from 'react';

interface Props {
  isListening: boolean;
  isRecording: boolean;
  amplitude: number;
  transcript?: string;
}

export default function EmergencyListenerIndicator({ isListening, isRecording, amplitude, transcript }: Props) {
  const [waveBars, setWaveBars] = useState([0.3, 0.5, 0.7, 0.4, 0.6, 0.5]);
  const [isVisible, setIsVisible] = useState(false);

  // Animate sound wave bars (only when listening, not recording)
  useEffect(() => {
    if (!isListening || isRecording) return;
    
    const interval = setInterval(() => {
      setWaveBars(prev => prev.map(() => Math.random() * 0.7 + 0.3));
    }, 150);
    
    return () => clearInterval(interval);
  }, [isListening, isRecording]);

  // Handle visibility transitions
  useEffect(() => {
    if (isRecording) {
      // When recording starts, show immediately with higher priority
      setIsVisible(true);
    } else if (isListening) {
      // When just listening, show with slight delay for smooth transition
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    } else {
      // Hide when neither listening nor recording
      setIsVisible(false);
    }
  }, [isListening, isRecording]);

  if (!isVisible) return null;
  
  // Priority: Recording state takes precedence
  const showRecording = isRecording;
  const showListening = isListening && !isRecording;
  
  return (
    <div 
      className={`fixed top-4 right-2 sm:top-20 sm:right-4 z-[100] max-w-xs sm:max-w-sm w-[calc(100vw-1rem)] sm:w-auto transition-all duration-300 ${
        showRecording ? 'animate-in fade-in slide-in-from-top-2' : ''
      }`}
      style={{
        zIndex: showRecording ? 100 : 50
      }}
    >
      <div className={`rounded-2xl p-4 sm:p-5 shadow-2xl transition-all duration-300 ${
        showRecording 
          ? 'bg-gradient-to-r from-red-600 to-red-700 animate-pulse' 
          : 'bg-gradient-to-r from-green-500 to-emerald-500'
      }`}>
        {/* Header with indicator and status */}
        <div className="flex items-center gap-3 mb-3">
          {/* Pulsing indicator circle */}
          <div className="relative flex-shrink-0">
            <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-white ${
              showRecording ? 'animate-ping' : 'animate-pulse'
            }`} />
            {showListening && (
              <>
                <div 
                  className="absolute inset-0 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-white animate-ping" 
                  style={{
                    animationDelay: '0.3s',
                    opacity: 0.7
                  }} 
                />
                <div 
                  className="absolute inset-0 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-white animate-ping" 
                  style={{
                    animationDelay: '0.6s',
                    opacity: 0.4
                  }} 
                />
              </>
            )}
          </div>
          
          {/* Microphone icon and status text */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-lg sm:text-xl flex-shrink-0">
              {showRecording ? '🔴' : '🎤'}
            </span>
            <span className="text-white text-xs sm:text-sm font-bold uppercase tracking-wide truncate">
              {showRecording ? 'RECORDING' : 'LISTENING'}
            </span>
          </div>
        </div>
        
        {/* Real-time transcript display */}
        {showRecording && transcript && (
          <div className="mt-3 p-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30">
            <div className="text-xs text-white/90 font-semibold mb-1.5">Recognizing:</div>
            <div className="text-sm text-white italic leading-relaxed break-words">
              "{transcript}"
            </div>
          </div>
        )}
        
        {/* Listening for speech message */}
        {showRecording && !transcript && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1 h-4 bg-white/80 rounded-full animate-pulse"
                  style={{
                    animationDelay: `${i * 0.2}s`,
                    animationDuration: '0.8s'
                  }}
                />
              ))}
            </div>
            <span className="text-xs sm:text-sm text-white/90 font-medium italic">
              Listening for speech...
            </span>
          </div>
        )}
        
        {/* Sound wave visualization for listening state */}
        {showListening && (
          <div className="mt-3 space-y-2">
            {/* Animated sound wave bars */}
            <div className="flex items-end justify-center gap-1 h-8">
              {waveBars.map((height, index) => (
                <div
                  key={index}
                  className="bg-white/90 rounded-full transition-all duration-150"
                  style={{
                    width: '4px',
                    height: `${height * 100}%`,
                    minHeight: '8px',
                  }}
                />
              ))}
            </div>
            
            {/* Amplitude progress bar */}
            <div className="w-full bg-white/30 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-white h-1.5 rounded-full transition-all duration-100 ease-out shadow-sm"
                style={{ 
                  width: `${Math.min(amplitude * 100, 100)}%`,
                  boxShadow: '0 0 8px rgba(255, 255, 255, 0.5)'
                }} 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

