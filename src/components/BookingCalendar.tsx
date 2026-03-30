import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { es } from 'date-fns/locale';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  eachDayOfInterval, isSameDay, isWithinInterval, addDays, 
  isPast, isBefore, startOfWeek, endOfWeek, isSameMonth 
} from 'date-fns';
import { ShieldCheck, Calendar as CalendarIcon, Star, ChevronLeft, ChevronRight } from 'lucide-react';

interface BookingCalendarProps {
    startDate: Date | null;
    endDate: Date | null;
    onChange: (update: [Date | null, Date | null]) => void;
    blockedDates: Date[];
    minNights?: number;
    isRangeAvailable?: (start: Date, end: Date) => boolean;
    hideHeader?: boolean;
    propertyPrice?: number | null;
    seasonalPrices?: any[];
}

const BookingCalendar: React.FC<BookingCalendarProps> = ({ 
    startDate, 
    endDate, 
    onChange, 
    blockedDates, 
    minNights = 2, 
    isRangeAvailable, 
    hideHeader = false,
    propertyPrice = null,
    seasonalPrices = []
}) => {
    const minDate = useMemo(() => {
        const d = new Date();
        const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
        const prTime = new Date(utc + (3600000 * -4));
        return new Date(prTime.getFullYear(), prTime.getMonth(), prTime.getDate(), 0, 0, 0);
    }, []);

    const [calMonth, setCalMonth] = useState(minDate);
    const [monthsShown, setMonthsShown] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    
    useEffect(() => {
        const handleResize = () => setMonthsShown(window.innerWidth > 1024 ? 2 : 1);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const maxDate = useMemo(() => {
        if (!startDate || blockedDates.length === 0) return undefined;
        const laterBlocks = blockedDates
            .filter(d => d.getTime() > startDate.getTime())
            .sort((a, b) => a.getTime() - b.getTime());
        return laterBlocks.length > 0 ? laterBlocks[0] : undefined;
    }, [startDate, blockedDates]);

    const handleInternalChange = (start: Date | null, end: Date | null) => {
        if (start && end && isRangeAvailable) {
            if (!isRangeAvailable(start, end)) {
                onChange([start, null]);
                window.dispatchEvent(new CustomEvent('salty-push', {
                    detail: { 
                        message: "¡Ups! Hay una travesía confirmada entre esas fechas. Por favor, selecciona un Check-out libre antes del bloqueo. 🏝️",
                        type: 'warning'
                    }
                }));
                return;
            }
        }
        onChange([start, end]);
    };

    const isDateBlocked = useCallback((date: Date) => {
        if (isBefore(date, minDate)) return true;
        if (maxDate && isBefore(maxDate, date)) return true;
        return blockedDates.some(blocked => isSameDay(blocked, date));
    }, [blockedDates, minDate, maxDate]);

    // Scarcity Checker - Salty Intelligence
    useEffect(() => {
        let availableWeekendsCount = 0;
        const start = startOfMonth(calMonth);
        const end = endOfMonth(calMonth);
        
        let current = new Date(start);
        let freeWeekends = new Set<string>();

        while(current <= end) {
            const day = current.getDay();
            if (day === 5 || day === 6) { // Friday or Saturday
                if (!isDateBlocked(current)) {
                    freeWeekends.add(`${current.getFullYear()}-${current.getMonth()}-${Math.floor(current.getDate()/7)}`);
                }
            }
            current.setDate(current.getDate() + 1);
        }

        if (freeWeekends.size > 0 && freeWeekends.size < 3) {
            window.dispatchEvent(new CustomEvent('salty-push', {
                detail: { 
                    message: `¡Atención! Quedan pocos fines de semana disponibles este mes en la Villa. ¡No te quedes fuera! ⚓`,
                    type: 'warning',
                    speak: false // Don't speak this automatically so it's a subtle UI text
                }
            }));
        }
    }, [calMonth, isDateBlocked]);

    const isVeryBlocked = useMemo(() => {
        if (blockedDates.length < 5) return false;
        const horizon = addDays(minDate, 90);
        const blocksInHorizon = blockedDates.filter(d => d >= minDate && d <= horizon).length;
        return blocksInHorizon > 65; 
    }, [blockedDates, minDate]);

    const handlePointerDown = (date: Date) => {
        if (isDateBlocked(date)) return;
        
        // If clicking same as start and no end, reset
        if (startDate && !endDate && isSameDay(date, startDate)) {
            handleInternalChange(null, null);
            return;
        }

        // If we already have a full range, start over
        if (startDate && endDate) {
            handleInternalChange(date, null);
            setIsDragging(true);
            return;
        }

        // If we have start but no end, and clicking later date, set end
        if (startDate && !endDate) {
            if (isBefore(date, startDate)) {
                handleInternalChange(date, null); // Selected earlier date, restart
                setIsDragging(true);
            } else {
                handleInternalChange(startDate, date);
            }
        } else {
            // First click
            handleInternalChange(date, null);
            setIsDragging(true);
        }
    };

    const handlePointerEnter = (date: Date) => {
        if (!isDragging || !startDate || endDate) return;
        if (isDateBlocked(date)) return;
        if (isBefore(date, startDate)) return;
        
        handleInternalChange(startDate, date);
    };

    const handlePointerUp = () => {
        setIsDragging(false);
    };

    const getPriceForDate = (date: Date) => {
        if (!propertyPrice) return null;
        const dateStr = format(date, 'yyyy-MM-dd');
        const special = seasonalPrices.find((sp: any) => dateStr >= sp.startDate && dateStr < sp.endDate);
        return special ? special.price : propertyPrice;
    };

    const renderMonth = (monthDate: Date, index: number) => {
        const monthStart = startOfMonth(monthDate);
        const daysInMonth = eachDayOfInterval({ 
          start: startOfWeek(monthStart, { weekStartsOn: 1 }), 
          end: endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 }) 
        });

        return (
            <motion.div 
                key={monthDate.toString()} 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="flex-1 w-full max-w-[340px] md:max-w-none select-none mx-auto"
            >
                <div className="flex justify-between items-center mb-6 px-4">
                    {index === 0 ? (
                        <button 
                            onClick={() => setCalMonth(subMonths(calMonth, 1))}
                            disabled={isSameMonth(calMonth, minDate) || isBefore(calMonth, minDate)}
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 hover:bg-black hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none text-text-main shadow-sm border border-gray-100"
                        >
                            <ChevronLeft size={18} />
                        </button>
                    ) : <div className="w-10 h-10" />}

                    <h4 className="font-serif font-black text-2xl capitalize text-text-main tracking-tight">
                        {format(monthDate, 'MMMM yyyy', { locale: es })}
                    </h4>

                    {index === monthsShown - 1 ? (
                        <button 
                            onClick={() => setCalMonth(addMonths(calMonth, 1))}
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 hover:bg-black hover:text-white transition-all text-text-main shadow-sm border border-gray-100"
                        >
                            <ChevronRight size={18} />
                        </button>
                    ) : <div className="w-10 h-10" />}
                </div>

                <div className="grid grid-cols-7 gap-y-3 gap-x-1 md:gap-x-2 px-2" onPointerLeave={() => isDragging && setIsDragging(false)}>
                    {['LU', 'MA', 'MI', 'JU', 'VI', 'SÁ', 'DO'].map(d => (
                        <div key={d} className="text-center text-[10px] font-black text-gray-400 py-2 uppercase tracking-widest">{d}</div>
                    ))}
                    
                    {daysInMonth.map((day, i) => {
                        const isCurrentMonth = isSameMonth(day, monthDate);
                        const blocked = isDateBlocked(day);
                        const isSelected = startDate && endDate 
                            ? isWithinInterval(day, { start: startDate, end: endDate })
                            : startDate && isSameDay(day, startDate);
                        const isStart = startDate && isSameDay(day, startDate);
                        const isEnd = endDate && isSameDay(day, endDate);
                        const isBetween = isSelected && !isStart && !isEnd;
                        const price = getPriceForDate(day);
                        
                        return (
                            <div
                                key={i}
                                onPointerDown={(e) => { e.preventDefault(); isCurrentMonth && handlePointerDown(day); }}
                                onPointerEnter={(e) => { e.preventDefault(); isCurrentMonth && handlePointerEnter(day); }}
                                onPointerUp={(e) => { e.preventDefault(); handlePointerUp(); }}
                                className={`
                                    relative aspect-square md:aspect-[1.1/1] w-full max-w-[50px] mx-auto rounded-full font-bold transition-all flex flex-col items-center justify-center cursor-pointer select-none touch-none
                                    ${!isCurrentMonth ? 'opacity-0 pointer-events-none' : ''}
                                    ${blocked ? 'text-gray-300 cursor-not-allowed' : 'text-text-main hover:bg-gray-100 shadow-sm'}
                                    ${isSelected ? 'z-20' : ''}
                                `}
                            >
                                {/* Background Highlights for Range */}
                                {isBetween && <div className="absolute inset-0 bg-[#D4AF37]/15 -mx-2 md:-mx-3 rounded-none pointer-events-none"></div>}
                                {isStart && endDate && <div className="absolute inset-y-0 right-0 left-1/2 bg-[#D4AF37]/15 pointer-events-none"></div>}
                                {isEnd && startDate && <div className="absolute inset-y-0 left-0 right-1/2 bg-[#D4AF37]/15 pointer-events-none"></div>}
                                
                                <div className={`
                                    relative z-10 w-full h-full flex flex-col items-center justify-center rounded-full border-2 transition-all
                                    ${(isStart || isEnd) ? 'bg-[#D4AF37] border-[#D4AF37] text-[#0A192F] shadow-[0_8px_25px_rgba(212,175,55,0.4)] scale-105' : 'border-transparent'}
                                    ${blocked && isCurrentMonth ? 'after:content-[""] after:absolute after:w-full after:h-px after:bg-gray-300 after:-rotate-45' : ''}
                                `}>
                                    <span className={`text-[15px] ${isStart || isEnd ? 'font-black text-secondary' : 'font-bold'} ${blocked ? 'opacity-30' : ''}`}>{day.getDate()}</span>
                                    {price && !blocked && !isSelected && (
                                        <span className={`text-[8px] font-black -mt-1 tracking-tighter ${(isStart || isEnd) ? 'text-secondary opacity-80' : 'opacity-30'}`}>${price}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </motion.div>
        );
    };

    return (
        <div className="w-full flex flex-col items-center select-none" onPointerUp={handlePointerUp}>
            {/* 🔱 ELITE HEADER */}
            {!hideHeader && (
                <header className="text-center mb-6 sm:mb-10 px-4 pt-4">
                    <div className="inline-flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100 mb-4 shadow-sm animate-fade-in">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800">Sincronía AST (Puerto Rico Time)</span>
                    </div>
                    <h3 className="font-serif font-black text-4xl sm:text-5xl text-secondary mb-3 tracking-tighter italic leading-none">Disponibilidad Real</h3>
                    <p className="text-[11px] sm:text-[13px] uppercase font-bold tracking-[0.4em] text-secondary/40">Seleccione su estancia Signature</p>
                </header>
            )}
            
            {/* 🛡️ DYNAMIC NOTIFICATIONS (No overlap) */}
            <div className="w-full max-w-4xl h-12 mb-4 relative flex justify-center items-center">
                {startDate && !endDate && minNights > 1 && (
                    <div className="animate-slide-up flex items-center gap-3 bg-secondary px-8 py-3 rounded-full border border-primary/20 shadow-2xl z-10">
                        <CalendarIcon size={16} className="text-primary" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-white">Estancia mínima: {minNights} Noches</span>
                    </div>
                )}
                {isVeryBlocked && !startDate && (
                    <div className="animate-slide-up flex items-center gap-3 bg-secondary/5 px-6 py-2.5 rounded-full border border-secondary/10">
                        <Star size={14} className="text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-secondary/60">Temporada de Alta Demanda</span>
                    </div>
                )}
            </div>

            {/* 🏺 THE CALENDAR CORE */}
            <div className="booking-datepicker-wrapper relative group bg-white/60 backdrop-blur-3xl rounded-[4rem] p-6 sm:p-10 shadow-2xl border border-white/80 ring-1 ring-black/[0.02] w-full max-w-[800px] overflow-hidden">
                <div className={`flex flex-col md:flex-row gap-8 lg:gap-16`}>
                    <AnimatePresence mode="popLayout">
                        {Array.from({ length: monthsShown }).map((_, idx) => renderMonth(addMonths(calMonth, idx), idx))}
                    </AnimatePresence>
                </div>
            </div>

            {/* 📜 LEGEND & TRUST */}
            <div className="w-full max-w-2xl mt-8 px-6">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-6 py-6 border-t border-black/[0.05]">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full bg-[#D4AF37] shadow-lg shadow-[#D4AF37]/40"></div>
                            <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Su Selección</span>
                        </div>
                        <div className="flex items-center gap-3 opacity-40">
                            <div className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center overflow-hidden">
                                <div className="w-full h-px bg-gray-300 -rotate-45"></div>
                            </div>
                            <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Reservado</span>
                        </div>
                    </div>
                    {propertyPrice && (
                        <div className="flex items-center gap-2 pt-2 sm:pt-0">
                             <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">$</div>
                             <span className="text-[10px] font-bold text-secondary opacity-60 uppercase tracking-widest">Tarifa Diaria Visible</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BookingCalendar;
