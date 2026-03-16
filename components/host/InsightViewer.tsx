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

import BusinessHealthSnapshot from './BusinessHealthSnapshot';

const InsightViewer: React.FC = () => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    fetchInsights();
  }, [filter]);

  const fetchInsights = async () => {
    setLoading(true);
    let query = supabase.from('ai_insights').select('*').order('created_at', { ascending: false });
    
    if (filter === 'pending') {
      query = query.eq('status', 'pending');
    }

    const { data, error } = await query;
    if (!error) setInsights(data || []);
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
            <h3 className="text-sm font-black uppercase tracking-widest text-text-main leading-tight">Módulo de Supervisión CEO</h3>
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
              <div className={`absolute top-0 right-0 px-4 py-1 text-[8px] font-black uppercase tracking-widest ${
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
