import { Injectable } from '@nestjs/common';

@Injectable()
export class ClassifierService {
  classify(transcript: string) {
    const t = (transcript || '').toLowerCase().trim();
    const out: any = {
      intent: 'unknown',
      category: 'Other',
      severity: 'Low',
      confidence: 0.5,
      detectedKeywords: [],
    };

    if (!t || t.length < 3) return out;

    // Emergency/SOS keywords
    const emergencyKeywords = [
      'help', 'sos', 'emergency', 'lifeline', 'rescue', 'save me', 
      'need help', 'please help', 'urgent', 'critical'
    ];
    
    // Medical keywords
    const medicalKeywords = [
      'accident', 'crash', 'injured', 'injury', 'hurt', 'pain', 'bleeding', 
      'bleed', 'broken', 'fracture', 'unconscious', 'not breathing', 
      'choking', 'heart attack', 'stroke', 'seizure', 'diabetic', 
      'allergic', 'asthma', 'ambulance', 'hospital', 'doctor', 'medical'
    ];
    
    // Fire keywords
    const fireKeywords = [
      'fire', 'burning', 'smoke', 'flame', 'explosion', 'explode', 
      'burn', 'hot', 'smoking'
    ];
    
    // Security/Threat keywords
    const securityKeywords = [
      'rob', 'robbery', 'attack', 'attacked', 'threat', 'threatened', 
      'danger', 'dangerous', 'weapon', 'gun', 'knife', 'violence', 
      'assault', 'stolen', 'theft', 'intruder', 'break in', 'breaking'
    ];
    
    // High severity indicators
    const highSeverityKeywords = [
      'trapped', 'stuck', 'can\'t move', 'can\'t breathe', 'not breathing',
      'unconscious', 'passed out', 'dying', 'critical', 'urgent',
      'immediate', 'now', 'asap', 'right now', 'serious', 'severe'
    ];
    
    // Medium severity indicators
    const mediumSeverityKeywords = [
      'need', 'please', 'soon', 'important', 'bad', 'worse', 'getting worse'
    ];

    // Detect intent
    const hasEmergency = emergencyKeywords.some(kw => t.includes(kw));
    const hasMedical = medicalKeywords.some(kw => t.includes(kw));
    const hasFire = fireKeywords.some(kw => t.includes(kw));
    const hasSecurity = securityKeywords.some(kw => t.includes(kw));
    
    if (hasEmergency || hasMedical || hasFire || hasSecurity) {
      out.intent = 'SOS';
      out.confidence = 0.9;
      
      // Track detected keywords
      if (hasEmergency) out.detectedKeywords.push(...emergencyKeywords.filter(kw => t.includes(kw)));
      if (hasMedical) out.detectedKeywords.push(...medicalKeywords.filter(kw => t.includes(kw)));
      if (hasFire) out.detectedKeywords.push(...fireKeywords.filter(kw => t.includes(kw)));
      if (hasSecurity) out.detectedKeywords.push(...securityKeywords.filter(kw => t.includes(kw)));
    }

    // Determine category (priority order: Fire > Medical > Security > Other)
    if (hasFire) {
      out.category = 'Fire';
      out.severity = 'High';
      out.confidence = 0.95;
    } else if (hasMedical) {
      out.category = 'Medical';
      // Check for high severity medical conditions
      if (highSeverityKeywords.some(kw => t.includes(kw))) {
        out.severity = 'High';
        out.confidence = 0.95;
      } else {
        out.severity = 'Medium';
        out.confidence = 0.85;
      }
    } else if (hasSecurity) {
      out.category = 'Security';
      out.severity = 'High';
      out.confidence = 0.9;
    } else if (hasEmergency) {
      out.category = 'Other';
      out.severity = 'Medium';
      out.confidence = 0.8;
    }

    // Adjust severity based on keywords
    if (highSeverityKeywords.some(kw => t.includes(kw))) {
      out.severity = 'High';
      out.confidence = Math.max(out.confidence, 0.95);
    } else if (mediumSeverityKeywords.some(kw => t.includes(kw)) && out.severity === 'Low') {
      out.severity = 'Medium';
      out.confidence = Math.max(out.confidence, 0.75);
    }

    // Special cases for common phrases
    if (t.includes('car accident') || t.includes('car crash') || t.includes('vehicle accident')) {
      out.category = 'Medical';
      out.severity = 'High';
      out.confidence = 0.9;
    }
    
    if (t.includes('stuck') || t.includes('trapped') || t.includes('can\'t get out')) {
      out.severity = 'High';
      out.confidence = 0.9;
    }

    // Remove duplicates from detected keywords
    out.detectedKeywords = [...new Set(out.detectedKeywords)];

    return out;
  }
}


