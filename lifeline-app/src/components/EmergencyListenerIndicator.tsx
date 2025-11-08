"use client";
import React from 'react';

interface Props {
  isListening: boolean;
  isRecording: boolean;
  amplitude: number;
  transcript?: string;
}

export default function EmergencyListenerIndicator({ isListening, isRecording, amplitude, transcript }: Props) {
  if (!isListening && !isRecording) return null;
  
  return (
    <div className="fixed top-20 right-4 z-50 max-w-sm">
      <div className={`rounded-lg p-3 shadow-2xl transition-all ${
        isRecording 
          ? 'bg-red-600 animate-pulse' 
          : 'bg-green-500'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="relative">
            <div className={`w-3 h-3 rounded-full ${
              isRecording ? 'bg-white animate-ping' : 'bg-white'
            }`} />
            {isListening && !isRecording && (
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-white animate-ping" style={{
                animationDelay: '0.5s',
                opacity: 0.6
              }} />
            )}
          </div>
          <span className="text-white text-xs font-bold">
            {isRecording ? '🔴 RECORDING' : '🎤 LISTENING'}
          </span>
        </div>
        
        {/* Real-time transcript display */}
        {isRecording && transcript && (
          <div className="mt-2 p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <div className="text-xs text-white/90 font-semibold mb-1">Recognizing:</div>
            <div className="text-sm text-white italic leading-relaxed">
              "{transcript}"
            </div>
          </div>
        )}
        
        {isRecording && !transcript && (
          <div className="mt-2 text-xs text-white/80 italic">
            Listening for speech...
          </div>
        )}
        
        {isListening && !isRecording && (
          <div className="mt-2 w-full bg-white/30 rounded-full h-1">
            <div 
              className="bg-white h-1 rounded-full transition-all"
              style={{ width: `${Math.min(amplitude * 100, 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

