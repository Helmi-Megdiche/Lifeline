"use client";

import { useState, useEffect } from 'react';

const guides = [
  {
    title: "CPR (Adult)",
    icon: "❤️",
    color: "red",
    steps: [
      "Check responsiveness and breathing.",
      "Call emergency number.",
      "30 chest compressions at 100-120/min.",
      "2 rescue breaths; repeat cycles."
    ]
  },
  {
    title: "Bleeding Control",
    icon: "🩸",
    color: "red",
    steps: [
      "Apply direct pressure with clean cloth.",
      "Elevate if possible.",
      "Use tourniquet for severe limb bleeding.",
      "Seek medical help."
    ]
  },
  {
    title: "Choking (Adult)",
    icon: "🫁",
    color: "orange",
    steps: [
      "Ask \"Are you choking?\" If unable to speak, act quickly.",
      "Stand behind and give 5 back blows between shoulder blades.",
      "Perform 5 abdominal thrusts (Heimlich). Repeat 5+5.",
      "If unresponsive, start CPR and call emergency help."
    ]
  },
  {
    title: "Burns (Minor to Moderate)",
    icon: "🔥",
    color: "orange",
    steps: [
      "Cool burn under clean running water for 10–20 minutes.",
      "Remove tight items/rings near the burned area.",
      "Cover with sterile, non-adhesive dressing. Do not pop blisters.",
      "Seek medical help for large/deep/face/hands/genitals burns."
    ]
  }
];

// Emergency numbers database by country
const emergencyNumbersByCountry: Record<string, {
  emergency: string;
  poison: string;
  fire: string;
}> = {
  'US': { emergency: '911', poison: '1-800-222-1222', fire: '911' },
  'CA': { emergency: '911', poison: '1-800-268-9017', fire: '911' },
  'GB': { emergency: '999', poison: '111', fire: '999' },
  'FR': { emergency: '112', poison: '33-1-40-05-47-15', fire: '18' },
  'DE': { emergency: '112', poison: '030-19240', fire: '112' },
  'IT': { emergency: '112', poison: '118', fire: '115' },
  'ES': { emergency: '112', poison: '915-620-420', fire: '080' },
  'AU': { emergency: '000', poison: '13-11-26', fire: '000' },
  'NZ': { emergency: '111', poison: '0800-764-766', fire: '111' },
  'JP': { emergency: '119', poison: '119', fire: '119' },
  'CN': { emergency: '110', poison: '120', fire: '119' },
  'IN': { emergency: '112', poison: '1066', fire: '101' },
  'BR': { emergency: '192', poison: '0800-722-6001', fire: '193' },
  'MX': { emergency: '911', poison: '065', fire: '068' },
  'AR': { emergency: '911', poison: '106', fire: '100' },
  'ZA': { emergency: '10111', poison: '0861-589-911', fire: '10177' },
  'EG': { emergency: '112', poison: '123', fire: '180' },
  'SA': { emergency: '997', poison: '937', fire: '998' },
  'AE': { emergency: '999', poison: '04-427-9300', fire: '997' },
  'TR': { emergency: '112', poison: '114', fire: '110' },
  'GR': { emergency: '112', poison: '210-682-3000', fire: '199' },
  'PL': { emergency: '112', poison: '606-273-252', fire: '998' },
  'SE': { emergency: '112', poison: '08-33-12-31', fire: '112' },
  'NO': { emergency: '112', poison: '815-55-001', fire: '110' },
  'DK': { emergency: '112', poison: '82-12-12-20', fire: '112' },
  'FI': { emergency: '112', poison: '09-4744-2929', fire: '112' },
  'RU': { emergency: '112', poison: '03', fire: '01' },
  'KR': { emergency: '119', poison: '1339', fire: '119' },
  'TH': { emergency: '1669', poison: '0-2433-3425', fire: '199' },
  'VN': { emergency: '113', poison: '04-3793-2992', fire: '114' },
  'ID': { emergency: '112', poison: '021-425-0767', fire: '113' },
  'SG': { emergency: '995', poison: '6423-9191', fire: '995' },
  'MY': { emergency: '999', poison: '1-800-88-8099', fire: '994' },
  'PH': { emergency: '117', poison: '02-8524-1078', fire: '160' },
  'TN': { emergency: '197', poison: '198', fire: '198' },
  'DZ': { emergency: '17', poison: '213-23-62-45-92', fire: '14' },
  'MA': { emergency: '112', poison: '0537-684-444', fire: '15' },
  'KE': { emergency: '999', poison: '020-723-2532', fire: '999' },
  'NG': { emergency: '112', poison: '0809-910-7000', fire: '199' },
  'GH': { emergency: '112', poison: '051-238-7200', fire: '192' }
};

const defaultNumbers = { emergency: '112 / 911', poison: 'Check local hotline', fire: '112 / 911' };

export default function GuidesPage() {
  const [userCountry, setUserCountry] = useState<string>('');
  const [emergencyNumbers, setEmergencyNumbers] = useState(defaultNumbers);
  const [isDetecting, setIsDetecting] = useState(true);

  useEffect(() => {
    const detectCountry = async () => {
      try {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              try {
                // Use reverse geocoding to get country
                const response = await fetch(
                  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`,
                  { 
                    headers: { 
                      'User-Agent': 'LifeLine-App/1.0',
                      'Accept-Language': 'en'
                    }
                  }
                );
                const data = await response.json();
                const countryCode = data.address?.country_code?.toUpperCase();
                
                if (countryCode) {
                  setUserCountry(countryCode);
                  setEmergencyNumbers(emergencyNumbersByCountry[countryCode] || defaultNumbers);
                }
              } catch (error) {
                console.error('Error getting country from coordinates:', error);
              } finally {
                setIsDetecting(false);
              }
            },
            (error) => {
              console.error('Error getting location:', error);
              setIsDetecting(false);
            }
          );
        } else {
          setIsDetecting(false);
        }
      } catch (error) {
        console.error('Error in location detection:', error);
        setIsDetecting(false);
      }
    };

    detectCountry();
  }, []);
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl mb-4 shadow-lg">
          <span className="text-white text-2xl">📋</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-3">
          Emergency Guides
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Step-by-step instructions for common emergency situations. All guides work offline.
        </p>
      </div>

      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-gray-200/60 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-red-500">🚨</span>
            Emergency Numbers
          </h2>
          {userCountry && (
            <div className="text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-full">
              📍 {userCountry}
            </div>
          )}
        </div>
        
        {isDetecting ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-500"></div>
              <span className="text-gray-600 text-sm">Detecting your location...</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-red-500 rounded-xl p-4 border border-red-600 hover:bg-red-600 transition-colors cursor-pointer">
              <div className="font-semibold text-white text-sm mb-1">Local Emergency</div>
              <a href={`tel:${emergencyNumbers.emergency.replace(/[^0-9]/g, '')}`} className="text-white font-bold text-lg block">
                {emergencyNumbers.emergency}
              </a>
            </div>
            
            <div className="bg-red-500 rounded-xl p-4 border border-red-600 hover:bg-red-600 transition-colors cursor-pointer">
              <div className="font-semibold text-white text-sm mb-1">Poison Control</div>
              <a href={`tel:${emergencyNumbers.poison.replace(/[^0-9]/g, '')}`} className="text-white font-bold text-lg block">
                {emergencyNumbers.poison}
              </a>
            </div>
            
            <div className="bg-red-500 rounded-xl p-4 border border-red-600 hover:bg-red-600 transition-colors cursor-pointer">
              <div className="font-semibold text-white text-sm mb-1">Fire Department</div>
              <a href={`tel:${emergencyNumbers.fire.replace(/[^0-9]/g, '')}`} className="text-white font-bold text-lg block">
                {emergencyNumbers.fire}
              </a>
            </div>
          </div>
        )}
        
        {userCountry && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => {
                setUserCountry('');
                setEmergencyNumbers(defaultNumbers);
                setIsDetecting(true);
                // Trigger location detection again
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    async (position) => {
                      try {
                        const response = await fetch(
                          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`,
                          { 
                            headers: { 
                              'User-Agent': 'LifeLine-App/1.0',
                              'Accept-Language': 'en'
                            }
                          }
                        );
                        const data = await response.json();
                        const countryCode = data.address?.country_code?.toUpperCase();
                        
                        if (countryCode) {
                          setUserCountry(countryCode);
                          setEmergencyNumbers(emergencyNumbersByCountry[countryCode] || defaultNumbers);
                        }
                      } catch (error) {
                        console.error('Error getting country from coordinates:', error);
                      } finally {
                        setIsDetecting(false);
                      }
                    },
                    (error) => {
                      console.error('Error getting location:', error);
                      setIsDetecting(false);
                    }
                  );
                } else {
                  setIsDetecting(false);
                }
              }}
              className="group inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-2 border-blue-300 dark:border-blue-700/50 hover:border-blue-400 dark:hover:border-blue-600/50 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-lg transition-transform group-hover:rotate-180 duration-500">🔄</span>
              <span>Reset Location</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {guides.map((guide, index) => (
          <div key={index} className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md ${
                guide.color === 'red' ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-gradient-to-br from-orange-500 to-orange-600'
              }`}>
                <span className="text-white text-xl">{guide.icon}</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">{guide.title}</h2>
            </div>
            <ol className="space-y-3">
              {guide.steps.map((step, stepIndex) => (
                <li key={stepIndex} className="flex items-start gap-3">
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    guide.color === 'red' ? 'bg-red-500' : 'bg-orange-500'
                  }`}>
                    {stepIndex + 1}
                  </span>
                  <span className="text-gray-700 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-green-50/50 rounded-2xl border border-green-200/60">
        <div className="flex items-center gap-2 text-green-700 text-sm">
          <span>⚠️</span>
          <span>These guides are for reference only. Always call emergency services when in doubt and seek professional medical help.</span>
        </div>
      </div>
    </div>
  );
}


