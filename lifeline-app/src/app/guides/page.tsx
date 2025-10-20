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

const emergencyNumbers = [
  { label: "Local Emergency", number: "112 / 911" },
  { label: "Poison Control", number: "Check local hotline" },
  { label: "Fire Department", number: "112 / 911" }
];

export default function GuidesPage() {
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
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-red-500">🚨</span>
          Emergency Numbers
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {emergencyNumbers.map((item, index) => (
            <div key={index} className="bg-red-500 rounded-xl p-4 border border-red-600">
              <div className="font-semibold text-white text-sm">{item.label}</div>
              <div className="text-white font-bold text-lg">{item.number}</div>
            </div>
          ))}
        </div>
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


