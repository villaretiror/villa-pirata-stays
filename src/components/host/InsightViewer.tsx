import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

interface AIInsight {
  id: string;
  type: 'pattern' | 'proposal' | 'trend';
  content: {
    description: string;
    suggested_action?: string;
  };
  status: 'pending' | 'applied' | 'archived';
  impact_score: number;
  created_at: string;
}

interface SaltyMemory {
  id: string;
  learned_text: string;
  created_at: string;
  session_id: string | null;
}

import BusinessHealthSnapshot from './BusinessHealthSnapshot';

const InsightViewer: React.FC = () => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [memories, setMemories] = useState<SaltyMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    let query = supabase.from('ai_insights').select('*').order('created_at', { ascending: false });
    
    if (filter === 'pending') {
      query = query.eq('status', 'pending');
    }

    const { data: insightsData, error: insightsErr } = await query;
    if (!insightsErr) setInsights(insightsData || []);

    const { data: memoriesData, error: memoryErr } = await supabase
      .from('salty_memories')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    if (!memoryErr) setMemories(memoriesData || []);

    setLoading(false);
  };

  const handleAction = async (id: string, newStatus: 'applied' | 'archived') => {
    const { error } = await supabase
      .from('ai_insights')
      .update({ status: newStatus })
      .eq('id', id);

    if (!error) {
      setInsights(prev => prev.filter(insight => insight.id !== id));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <BusinessHealthSnapshot />
      
      <div className="flex justify-between items-center bg-white/50 p-4 rounded-3xl border border-gray-100 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
            <span className="material-icons text-primary">psychology</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.25em] opacity-80 text-text-main leading-tight">Módulo de Supervisión CEO</h3>
            <p className="text-[10px] text-text-light font-medium uppercase tracking-wider">Insights Tácticos de Salty</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${filter === 'pending' ? 'bg-text-main text-white' : 'bg-gray-100 text-text-light'}`}
          >
            Pendientes
          </button>
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-text-main text-white' : 'bg-gray-100 text-text-light'}`}
          >
            Todo
          </button>
        </div>
      </div>

      {memories.length > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/30 p-6 rounded-[2.5rem] border border-blue-100/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <h4 className="text-xl font-serif font-black italic text-blue-900 mb-6 flex items-center gap-2 relative z-10">
            <span className="material-icons text-primary">memory</span> Notas del Concierge
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
            {memories.map((mem) => (
              <div key={mem.id} className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-white flex gap-4 items-start group hover:border-blue-200 transition-all">
                 <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600">
                    <span className="material-icons text-[16px]">record_voice_over</span>
                 </div>
                 <div>
                    <p className="text-xs text-text-main font-bold leading-relaxed">{mem.learned_text}</p>
                    <p className="text-[9px] text-gray-400 mt-2 font-medium uppercase tracking-widest">{new Date(mem.created_at).toLocaleDateString()} • Sesión {mem.session_id ? mem.session_id.substring(0, 5) : 'N/A'}</p>
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {insights.map((insight) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
            >
              <div className={`absolute top-0 right-0 px-4 py-1 text-[8px] font-semibold uppercase tracking-[0.25em] opacity-80 ${
                insight.type === 'proposal' ? 'bg-primary text-white' : 
                insight.type === 'pattern' ? 'bg-secondary text-white' : 'bg-black text-white'
              }`}>
                {insight.type}
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-black italic text-primary">IMPACTO {insight.impact_score}/10</span>
                </div>
                <p className="text-xs font-medium text-text-main leading-relaxed italic">
                  "{insight.content.description}"
                </p>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-50">
                <button 
                  onClick={() => handleAction(insight.id, 'applied')}
                  className="flex-1 py-2.5 bg-text-main text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                >
                  Aprobar
                </button>
                <button 
                  onClick={() => handleAction(insight.id, 'archived')}
                  className="flex-1 py-2.5 bg-gray-50 text-text-light rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-gray-100 transition-all"
                >
                  Ignorar
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {!loading && insights.length === 0 && (
        <div className="text-center py-20 bg-white/30 rounded-[3rem] border border-dashed border-gray-200">
          <span className="material-icons text-gray-300 text-5xl mb-4">insights</span>
          <p className="text-xs font-bold text-text-light uppercase tracking-widest">Salty está analizando tendencias...</p>
        </div>
      )}
    </div>
  );
};

export default InsightViewer;
