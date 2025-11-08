"use client";
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import usePouchQueue from '../lib/usePouchQueue';
import { getApiUrl } from '../lib/config';
import { useAuth } from '../contexts/ClientAuthContext';

interface EmergencyListenerConfig {
  enabled: boolean;
  amplitudeThreshold: number; // 0-1, default ~0.7 for screams
  keywords: string[]; // ['help', 'sos', 'emergency']
  recordingDuration: number; // milliseconds, default 10000
}

const DEFAULT_CONFIG: EmergencyListenerConfig = {
  enabled: false,
  amplitudeThreshold: 0.7,
  keywords: ['help', 'sos', 'emergency', 'lifeline'],
  recordingDuration: 10000,
};

// Module-level singleton to track if listener is active (persists across Fast Refresh)
let globalListenerActive = false;
let globalStreamRef: MediaStream | null = null;
let globalAudioContextRef: AudioContext | null = null;

export function useEmergencyListener(config: Partial<EmergencyListenerConfig> = {}) {
  const mergedConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [
    config.enabled, 
    config.amplitudeThreshold, 
    config.recordingDuration,
    config.keywords?.join(',')
  ]);
  const { queueVoiceAlert } = usePouchQueue();
  const { token, user } = useAuth();
  
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [lastTrigger, setLastTrigger] = useState<Date | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null); // SpeechRecognition
  const animationFrameRef = useRef<number | null>(null);
  const cooldownRef = useRef<boolean>(false);
  const triggerRecordingRef = useRef<(() => Promise<void>) | null>(null);
  const isInitializingRef = useRef<boolean>(false);
  const hasStartedRef = useRef<boolean>(false);
  const startListeningRef = useRef<(() => Promise<void>) | null>(null);
  const stopListeningRef = useRef<(() => void) | null>(null);
  
  // Check if browser supports SpeechRecognition
  const supportsSpeechRecognition = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  
  // Initialize speech recognition for keyword detection
  const initSpeechRecognition = useCallback(() => {
    if (!supportsSpeechRecognition || !mergedConfig.enabled) return null;
    
    const SpeechRecognition = (window as any).SpeechRecognition || 
                              (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join(' ')
        .toLowerCase();
      
      const keywords = mergedConfig.keywords.map(k => k.toLowerCase());
      const detected = keywords.some(keyword => transcript.includes(keyword));
      
      if (detected && !cooldownRef.current && triggerRecordingRef.current) {
        console.log('🎯 Keyword detected:', transcript);
        triggerRecordingRef.current();
      }
    };
    
    recognition.onerror = (event: any) => {
      // Ignore "aborted" errors - they're normal when stopping/restarting
      if (event.error !== 'aborted') {
        console.warn('Speech recognition error:', event.error);
      }
    };
    
    return recognition;
  }, [mergedConfig.enabled, mergedConfig.keywords]);
  
  // Monitor audio amplitude for scream detection
  const monitorAudio = useCallback(() => {
    if (!analyserRef.current || !mergedConfig.enabled || cooldownRef.current || !isListening) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // Calculate average amplitude
    const sum = dataArray.reduce((a, b) => a + b, 0);
    const avg = sum / dataArray.length;
    const normalized = avg / 255; // Normalize to 0-1
    
    setAmplitude(normalized);
    
    // Check if amplitude exceeds threshold (scream detected)
    if (normalized >= mergedConfig.amplitudeThreshold && !cooldownRef.current && triggerRecordingRef.current) {
      console.log('🔊 High amplitude detected!', {
        amplitude: normalized,
        threshold: mergedConfig.amplitudeThreshold,
        cooldown: cooldownRef.current
      });
      triggerRecordingRef.current();
    } else if (normalized > 0.3) {
      // Log high but not enough amplitude for debugging
      console.debug('🔊 Amplitude:', normalized.toFixed(2), 'Threshold:', mergedConfig.amplitudeThreshold);
    }
    
    // Continue monitoring
    if (mergedConfig.enabled && isListening && !cooldownRef.current) {
      animationFrameRef.current = requestAnimationFrame(monitorAudio);
    }
  }, [mergedConfig.enabled, mergedConfig.amplitudeThreshold, isListening]);
  
  // Send emergency alert with transcript
  const sendEmergencyAlert = useCallback(async (blob: Blob, lat?: number, lon?: number, transcriptText?: string) => {
    try {
      if (!token || !user?.id) {
        await queueVoiceAlert(blob, { latitude: lat, longitude: lon });
        return;
      }
      
      const form = new FormData();
      const file = new File([blob], 'emergency_alert.webm', { type: blob.type });
      form.append('audio', file);
      if (lat !== undefined) form.append('latitude', String(lat));
      if (lon !== undefined) form.append('longitude', String(lon));
      
      // Send client-side transcript if available
      if (transcriptText && transcriptText.trim()) {
        form.append('transcript', transcriptText.trim());
        console.log('📝 Sending client-side transcript with emergency alert:', transcriptText.trim());
      }
      
      const apiUrl = getApiUrl('/voice-alert/process');
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      
      if (!res.ok) {
        if (!navigator.onLine) {
          await queueVoiceAlert(blob, { latitude: lat, longitude: lon });
        }
      } else {
        const data = await res.json();
        console.log('✅ Emergency alert sent:', data);
        // Show notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Emergency Alert Sent', {
            body: `AI detected: ${data.ai?.intent || 'Emergency'} - ${data.ai?.category || 'Unknown'}`,
            icon: '/icon-192x192.png',
          });
        }
      }
    } catch (err) {
      console.error('Failed to send emergency alert:', err);
      await queueVoiceAlert(blob, { latitude: lat, longitude: lon });
    }
  }, [token, user, queueVoiceAlert]);
  
  // Trigger automatic recording
  const triggerRecording = useCallback(async () => {
    console.log('🚨 TRIGGER RECORDING CALLED', {
      cooldown: cooldownRef.current,
      isRecording,
      enabled: mergedConfig.enabled
    });
    
    if (cooldownRef.current) {
      console.log('⏸️ Skipping - cooldown active');
      return;
    }
    
    if (isRecording) {
      console.log('⏸️ Skipping - already recording');
      return;
    }
    
    console.log('🎬 Starting emergency recording...');
    cooldownRef.current = true;
    setLastTrigger(new Date());
    setIsRecording(true);
    
    // Stop listening temporarily
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    
    // Get location first
    let lat: number | undefined, lon: number | undefined;
    try {
      await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(
        p => { 
          lat = p.coords.latitude; 
          lon = p.coords.longitude; 
          res(true); 
        }, 
        rej, 
        { timeout: 5000 }
      ));
    } catch (err) {
      console.warn('Location not available:', err);
    }
    
    // Start recording with optimized settings
    try {
      // Optimize audio constraints for speech recognition
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000,
        channelCount: 1,
      };
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      
      // Check available MIME types
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/wav'
      ];
      
      let selectedMimeType = 'audio/webm';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }
      
      const options: MediaRecorderOptions = {
        mimeType: selectedMimeType,
        audioBitsPerSecond: 128000,
      };
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      recordingChunksRef.current = [];
      
      // Start real-time speech recognition for transcription
      let recordingTranscript = '';
      let recordingRecognition: any = null;
      
      if (supportsSpeechRecognition) {
        try {
          const SpeechRecognition = (window as any).SpeechRecognition || 
                                    (window as any).webkitSpeechRecognition;
          if (SpeechRecognition) {
            recordingRecognition = new SpeechRecognition();
            recordingRecognition.continuous = true;
            recordingRecognition.interimResults = true;
            recordingRecognition.lang = 'en-US';
            
            recordingRecognition.onresult = (event: any) => {
              let interimTranscript = '';
              let finalTranscript = '';
              
              for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                  finalTranscript += transcript + ' ';
                } else {
                  interimTranscript += transcript;
                }
              }
              
              recordingTranscript = (finalTranscript + interimTranscript).trim();
              if (recordingTranscript) {
                setTranscript(recordingTranscript);
                console.log('🎯 Emergency recording transcript:', recordingTranscript);
              }
            };
            
            recordingRecognition.onerror = (event: any) => {
              if (event.error !== 'aborted' && event.error !== 'no-speech') {
                console.warn('Recording speech recognition error:', event.error);
              }
            };
            
            recordingRecognition.start();
            console.log('✅ Real-time transcription started for emergency recording');
          }
        } catch (err) {
          console.warn('Failed to start recording speech recognition:', err);
        }
      }
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunksRef.current.push(e.data);
      };
      
      mediaRecorder.onstop = async () => {
        // Stop speech recognition
        if (recordingRecognition) {
          try {
            recordingRecognition.stop();
          } catch (e) {}
        }
        
        const blob = new Blob(recordingChunksRef.current, { type: selectedMimeType });
        await sendEmergencyAlert(blob, lat, lon, recordingTranscript || '');
        stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);
        setTranscript(''); // Clear transcript
        
        // Resume listening after a short delay
        setTimeout(() => {
          cooldownRef.current = false;
          if (mergedConfig.enabled && isListening && streamRef.current) {
            // Restart speech recognition if it was stopped
            if (supportsSpeechRecognition && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                // Recognition might already be running
              }
            }
            // Resume amplitude monitoring
            monitorAudio();
          }
        }, 2000);
      };
      
      mediaRecorder.start(50); // Collect data every 50ms
      
      // Auto-stop after duration
      setTimeout(() => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      }, mergedConfig.recordingDuration);
      
    } catch (err) {
      console.error('Failed to start emergency recording:', err);
      setIsRecording(false);
      cooldownRef.current = false;
    }
  }, [isRecording, mergedConfig.enabled, mergedConfig.recordingDuration, isListening, sendEmergencyAlert, monitorAudio, supportsSpeechRecognition]);
  
  // Set ref for triggerRecording
  useEffect(() => {
    triggerRecordingRef.current = triggerRecording;
  }, [triggerRecording]);
  
  // Start listening
  const startListening = useCallback(async () => {
    if (!mergedConfig.enabled) {
      console.log('🚫 Emergency listener disabled');
      return;
    }
    
    // Check if already active by checking actual resources and global flag
    const isStreamActive = streamRef.current && streamRef.current.getTracks().some(track => track.readyState === 'live');
    const isAudioContextActive = audioContextRef.current && audioContextRef.current.state !== 'closed';
    const isGlobalActive = globalListenerActive || (globalStreamRef && globalStreamRef.getTracks().some(track => track.readyState === 'live'));
    
    if (hasStartedRef.current || isListening || isInitializingRef.current || isStreamActive || isAudioContextActive || isGlobalActive) {
      console.log('ℹ️ Already listening or initializing', {
        hasStarted: hasStartedRef.current,
        isListening,
        isInitializing: isInitializingRef.current,
        isStreamActive,
        isAudioContextActive,
        isGlobalActive
      });
      // If global refs exist but local refs don't, restore them
      if (isGlobalActive && !streamRef.current && globalStreamRef) {
        streamRef.current = globalStreamRef;
        hasStartedRef.current = true;
        setIsListening(true);
        console.log('🔄 Restored global stream reference');
        return;
      }
      return;
    }
    
    isInitializingRef.current = true;
    console.log('🎤 Starting emergency listener...');
    
    try {
      // Request microphone permission
      console.log('📱 Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      globalStreamRef = stream; // Store globally
      console.log('✅ Microphone permission granted');
      
      // Set up Web Audio API for amplitude monitoring
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      globalAudioContextRef = audioContext; // Store globally
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      const microphone = audioContext.createMediaStreamSource(stream);
      microphoneRef.current = microphone;
      microphone.connect(analyser);
      
      setIsListening(true);
      isInitializingRef.current = false; // Reset after successful start
      hasStartedRef.current = true; // Mark as successfully started
      globalListenerActive = true; // Mark globally as active
      console.log('✅ Web Audio API initialized');
      
      // Start amplitude monitoring
      console.log('📊 Starting amplitude monitoring...');
      monitorAudio();
      
      // Start keyword detection if supported
      if (supportsSpeechRecognition) {
        console.log('🗣️ Starting keyword detection...');
        recognitionRef.current = initSpeechRecognition();
        if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
            console.log('✅ Speech recognition started');
          } catch (e: any) {
            console.warn('⚠️ Could not start speech recognition:', e.message);
          }
        }
      } else {
        console.log('ℹ️ Speech recognition not supported in this browser');
      }
      
      console.log('✅ Emergency listener started successfully');
    } catch (err: any) {
      console.error('❌ Failed to start emergency listener:', err);
      console.error('Error details:', err.message, err.name);
      setIsListening(false);
      isInitializingRef.current = false; // Reset on error
      hasStartedRef.current = false; // Reset on error
      globalListenerActive = false; // Clear global flag on error
      
      // Show user-friendly error
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        alert('Microphone permission denied. Please enable microphone access in your browser settings to use emergency detection.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        alert('No microphone found. Please connect a microphone to use emergency detection.');
      } else {
        alert(`Failed to start emergency detection: ${err.message || 'Unknown error'}`);
      }
    }
  }, [mergedConfig.enabled, isListening, monitorAudio, initSpeechRecognition, supportsSpeechRecognition]);
  
  // Stop listening
  const stopListening = useCallback(() => {
    isInitializingRef.current = false;
    hasStartedRef.current = false;
    globalListenerActive = false; // Clear global flag
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore "aborted" errors - they're normal when stopping
      }
      recognitionRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (globalStreamRef) {
      globalStreamRef.getTracks().forEach(t => t.stop());
      globalStreamRef = null;
    }
    
    if (audioContextRef.current) {
      try {
        // Check if AudioContext is already closed before closing
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(() => {
            // Silently handle errors - AudioContext might already be closing
          });
        }
      } catch (e) {
        // Silently handle any errors
      }
      audioContextRef.current = null;
    }
    if (globalAudioContextRef) {
      try {
        // Check if AudioContext is already closed before closing
        if (globalAudioContextRef.state !== 'closed') {
          globalAudioContextRef.close().catch(() => {
            // Silently handle errors - AudioContext might already be closing
          });
        }
      } catch (e) {
        // Silently handle any errors
      }
      globalAudioContextRef = null;
    }
    
    analyserRef.current = null;
    microphoneRef.current = null;
    setIsListening(false);
  }, []);
  
  // Store refs so they're always current
  useEffect(() => {
    startListeningRef.current = startListening;
    stopListeningRef.current = stopListening;
  }, [startListening, stopListening]);
  
  // Auto-start/stop based on config
  useEffect(() => {
    if (mergedConfig.enabled) {
      // Check if resources are already active (local or global)
      const isStreamActive = streamRef.current && streamRef.current.getTracks().some(track => track.readyState === 'live');
      const isAudioContextActive = audioContextRef.current && audioContextRef.current.state !== 'closed';
      const isGlobalActive = globalListenerActive || (globalStreamRef && globalStreamRef.getTracks().some(track => track.readyState === 'live'));
      
      // Only start if not already started/in-progress and resources aren't active
      if (startListeningRef.current && !hasStartedRef.current && !isListening && !isInitializingRef.current && !isStreamActive && !isAudioContextActive && !isGlobalActive) {
        startListeningRef.current();
      }
      // If global resources exist but local don't, prevent duplicate start
      // (The global refs will be cleaned up on next stop, or we can restore them in startListening)
    } else {
      // Stop if currently running (check both state and active resources, local or global)
      const isStreamActive = streamRef.current && streamRef.current.getTracks().some(track => track.readyState === 'live');
      const isAudioContextActive = audioContextRef.current && audioContextRef.current.state !== 'closed';
      const isGlobalActive = globalListenerActive || (globalStreamRef && globalStreamRef.getTracks().some(track => track.readyState === 'live'));
      
      if (stopListeningRef.current && (hasStartedRef.current || isListening || isStreamActive || isAudioContextActive || isGlobalActive)) {
        stopListeningRef.current();
      }
    }
    
    return () => {
      // Cleanup on unmount - only if resources are actually active (local or global)
      const isStreamActive = streamRef.current && streamRef.current.getTracks().some(track => track.readyState === 'live');
      const isAudioContextActive = audioContextRef.current && audioContextRef.current.state !== 'closed';
      const isGlobalActive = globalListenerActive || (globalStreamRef && globalStreamRef.getTracks().some(track => track.readyState === 'live'));
      
      // Only cleanup if disabled, not on every re-render
      if (!mergedConfig.enabled && stopListeningRef.current && (isStreamActive || isAudioContextActive || isGlobalActive)) {
        stopListeningRef.current();
      }
    };
  }, [mergedConfig.enabled]); // Only depend on enabled - use refs for state checks
  
  return {
    isListening,
    isRecording,
    amplitude,
    transcript,
    lastTrigger,
    startListening,
    stopListening,
  };
}

