import React, { useMemo } from 'react';

interface SavingsInsightsProps {
    bookings: any[];
}

const SavingsInsights: React.FC<SavingsInsightsProps> = ({ bookings }) => {
    const savingsMetrics = useMemo(() => {
        const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
        const totalRevenue = confirmedBookings.reduce((acc, b) => acc + (Number(b.total_price) || 0), 0);
        // Estimación del 15% de comisión que se ahorra por ser reserva directa
        const totalSavings = totalRevenue * 0.15;
        const bookingsCount = confirmedBookings.length;

        return {
            totalRevenue,
            totalSavings,
            bookingsCount
        };
    }, [bookings]);

    if (savingsMetrics.bookingsCount === 0) return null;

    return (
        <div className="bg-gradient-to-br from-green-900 to-[#2D5A27] rounded-[2.5rem] p-6 text-white shadow-xl relative overflow-hidden group border border-white/10">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 p-6 opacity-10 rotate-12 group-hover:rotate-45 transition-transform duration-700">
                <span className="material-icons text-8xl">account_balance_wallet</span>
            </div>

            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                    <span className="bg-white/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10">
                        Oportunidad Directa
                    </span>
                </div>

                <h3 className="text-xl font-serif font-bold mb-1">Impacto de Ahorro</h3>
                <p className="text-[10px] text-white/60 font-medium uppercase tracking-[0.1em] mb-6">Basado en {savingsMetrics.bookingsCount} reservas directas</p>

                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-accent mb-1">Ahorro Estimado (15%)</p>
                        <p className="text-3xl font-serif font-black text-white leading-none">
                            ${savingsMetrics.totalSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>

                    <div className="text-right">
                        <div className="flex items-center gap-1 justify-end text-green-300 mb-1">
                            <span className="material-icons text-sm">trending_up</span>
                            <span className="text-[10px] font-bold">Resiliencia</span>
                        </div>
                        <p className="text-[9px] text-white/40 leading-tight">Comisiones no pagadas a <br /> plataformas externas</p>
                    </div>
                </div>
            </div>

            {/* Progress bar simulation */}
            <div className="mt-6 flex gap-1 h-1">
                <div className="flex-[8.5] bg-accent rounded-full"></div>
                <div className="flex-[1.5] bg-white/10 rounded-full"></div>
            </div>
        </div>
    );
};

export default SavingsInsights;
