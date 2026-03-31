import sys

with open('/Users/joon/Downloads/neo/src/src/App.jsx', 'r') as f:
    content = f.read()

target = """                    <button onClick={() => setShowMedModal(true)} className={`w-full mt-4 py-2 px-3 border rounded-lg text-[12px] flex justify-between items-center ${isDarkMode ? "bg-slate-800/80 hover:bg-slate-700 border-slate-600" : "bg-rose-50"}`}>
                      <span className="flex items-center gap-2 font-bold"><Pill size={14} className="text-cyan-400" /> 투약 기록 열람</span><ArrowRight size={14} />
                    </button>"""

replacement = """                    <div className="flex flex-col gap-2 mt-4">
                      <button onClick={() => setShowVisitModal(true)} className={`w-full py-2 px-3 border rounded-lg text-[12px] flex justify-between items-center transition-all duration-300 ${isDarkMode ? "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-400" : "bg-amber-50 hover:bg-amber-100 text-amber-600 border-amber-200"}`}>
                        <span className="flex items-center gap-2 font-bold"><CalendarRange size={14} /> 보호자 내원 요청 전송</span><ChevronRight size={14} />
                      </button>
                      <button onClick={() => setShowMedModal(true)} className={`w-full py-2 px-3 border rounded-lg text-[12px] flex justify-between items-center transition-all duration-300 ${isDarkMode ? "bg-slate-800/50 hover:bg-slate-700 border-slate-700 text-slate-300" : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"}`}>
                        <span className="flex items-center gap-2 font-bold"><Pill size={14} className="text-cyan-400" /> 투약 기록 열람</span><ArrowRight size={14} />
                      </button>
                    </div>"""

if target in content:
    content = content.replace(target, replacement)
    with open('/Users/joon/Downloads/neo/src/src/App.jsx', 'w') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("TARGET NOT FOUND")
