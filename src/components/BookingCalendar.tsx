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

    const [[monthOffset, direction], setMonthOffset] = useState([0, 0]);
    const calMonth = useMemo(() => addMonths(minDate, monthOffset), [minDate, monthOffset]);

    const paginate = (newDirection: number) => {
        setMonthOffset([monthOffset + newDirection, newDirection]);
    };

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 50 : -50,
            opacity: 0,
            scale: 0.98
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 50 : -50,
            opacity: 0,
            scale: 0.98
        })
    };

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
                // 🛡️ UX SHIELD: Instead of a hard reset, we find the maximum possible range
                // or just keep the start date if no intermediate fits.
                onChange([start, null]);
                
                window.dispatchEvent(new CustomEvent('salty-push', {
                    detail: { 
                        message: "¡Ups! Hay una travesía confirmada en ese intervalo. Salty te sugiere elegir un Check-out anterior. 🏝️",
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

    const [scarcityLevel, setScarcityLevel] = useState<number>(0);
    // Scarcity Checker - Salty Intelligence
    useEffect(() => {
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
        
        setScarcityLevel(freeWeekends.size);

        if (freeWeekends.size > 0 && freeWeekends.size < 3) {
            window.dispatchEvent(new CustomEvent('salty-push', {
                detail: { 
                    message: `¡Atención! Quedan pocos fines de semana disponibles este mes en la Villa. ¡No te quedes fuera! ⚓`,
                    type: 'warning',
                    speak: false 
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
        // 🏺 SMART LIMIT: If clicking on or after a blocked date when we have a start, auto-set to max range
        if (isDateBlocked(date)) {
            if (startDate && !endDate && isBefore(startDate, date) && maxDate) {
                // Set to the last available day (the one before maxDate)
                const autoEnd = addDays(maxDate, -1);
                if (isBefore(startDate, autoEnd)) {
                    handleInternalChange(startDate, autoEnd);
                    window.dispatchEvent(new CustomEvent('salty-push', {
                        detail: { 
                            message: "Salty: He ajustado tu estancia al máximo disponible antes del próximo bloqueo. ⚓", 
                            type: 'info' 
                        }
                    }));
                }
            }
            return;
        }
        
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
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.3 }
                }}
                className="flex-1 w-full max-w-[340px] md:max-w-none select-none mx-auto"
            >
                <div className="flex justify-between items-center mb-6 px-4">
                    {index === 0 ? (
                        <button 
                            onClick={() => paginate(-1)}
                            disabled={isSameMonth(calMonth, minDate) || isBefore(calMonth, minDate)}
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/40 hover:bg-black/90 hover:text-white transition-all disabled:opacity-5 disabled:pointer-events-none text-text-main shadow-lg border border-white/50 backdrop-blur-xl group/btn"
                        >
                            <ChevronLeft size={18} className="group-hover/btn:-translate-x-0.5 transition-transform" />
                        </button>
                    ) : <div className="w-10 h-10" />}

                    <div className="text-center">
                        <h4 className="font-serif font-black text-2xl capitalize text-secondary tracking-tight">
                            {format(monthDate, 'MMMM yyyy', { locale: es })}
                        </h4>
                        {scarcityLevel > 0 && scarcityLevel < 4 && (
                            <div className="flex items-center justify-center gap-1.5 mt-1 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                                    {scarcityLevel} {scarcityLevel === 1 ? 'fin' : 'fines'} de semana libres
                                </span>
                            </div>
                        )}
                    </div>

                    {index === monthsShown - 1 ? (
                        <button 
                            onClick={() => paginate(1)}
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/40 hover:bg-black/90 hover:text-white transition-all text-text-main shadow-lg border border-white/50 backdrop-blur-xl group/btn"
                        >
                            <ChevronRight size={18} className="group-hover/btn:translate-x-0.5 transition-transform" />
                        </button>
                    ) : <div className="w-10 h-10" />}
                </div>

                <div className="grid grid-cols-7 gap-y-3 gap-x-1 md:gap-x-2 px-2" onPointerLeave={() => isDragging && setIsDragging(false)}>
                    {['LU', 'MA', 'MI', 'JU', 'VI', 'SÁ', 'DO'].map(d => (
                        <div key={d} className="text-center text-[10px] font-black text-secondary/30 py-2 uppercase tracking-widest">{d}</div>
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
                                    relative aspect-square md:aspect-[1.1/1] w-full max-w-[50px] mx-auto rounded-xl font-bold transition-all flex flex-col items-center justify-center cursor-pointer select-none touch-none
                                    ${!isCurrentMonth ? 'opacity-0 pointer-events-none' : ''}
                                    ${blocked ? 'text-gray-300/40 cursor-not-allowed bg-transparent' : 'text-text-main hover:bg-white/40 hover:shadow-xl hover:scale-105 active:scale-95'}
                                    ${isSelected ? 'z-20' : ''}
                                `}
                            >
                                {/* Background Highlights for Range */}
                                {isBetween && <div className="absolute inset-0 bg-[#D4AF37]/10 -mx-1 md:-mx-1.5 rounded-none pointer-events-none transition-all duration-500"></div>}
                                {isStart && endDate && <div className="absolute inset-y-0 right-0 left-1/2 bg-[#D4AF37]/10 pointer-events-none transition-all"></div>}
                                {isEnd && startDate && <div className="absolute inset-y-0 left-0 right-1/2 bg-[#D4AF37]/10 pointer-events-none transition-all"></div>}
                                
                                <div className={`
                                    relative z-10 w-full h-full flex flex-col items-center justify-center rounded-xl border-2 transition-all duration-300
                                    ${(isStart || isEnd) ? 'bg-[#D4AF37] border-[#D4AF37] text-white shadow-[0_12px_30px_rgba(212,175,55,0.5)] scale-110' : 'border-transparent'}
                                    ${blocked && isCurrentMonth ? "after:content-[''] after:absolute after:w-1/2 after:h-px after:bg-gray-300/40 after:-rotate-45 after:left-1/4" : ''}
                                `}>
                                    <span className={`text-[16px] ${isStart || isEnd ? 'font-black text-secondary' : 'font-bold'} ${blocked ? 'opacity-40' : ''}`}>{day.getDate()}</span>
                                    {price && !blocked && !isBetween && (
                                        <span className={`text-[8px] font-black -mt-1 tracking-tighter opacity-70 ${(isStart || isEnd) ? 'text-secondary' : 'text-primary'}`}>${price}</span>
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
                    <div className="inline-flex items-center gap-2 bg-white/40 backdrop-blur-xl px-4 py-2 rounded-full border border-white/60 mb-4 shadow-xl animate-fade-in ring-1 ring-black/5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] opacity-80 text-secondary">Sincronía AST (Puerto Rico Time)</span>
                    </div>
                    <h3 className="font-serif font-black text-4xl sm:text-6xl text-secondary mb-3 tracking-tighter italic leading-none drop-shadow-sm">Disponibilidad Real</h3>
                    <p className="text-[11px] sm:text-[13px] uppercase font-bold tracking-[0.5em] text-primary/60">Seleccione su estancia Signature</p>
                </header>
            )}
            
            {/* 🛡️ DYNAMIC NOTIFICATIONS (No overlap) */}
            <div className="w-full max-w-4xl h-12 mb-6 relative flex justify-center items-center">
                <AnimatePresence mode="wait">
                    {startDate && !endDate && minNights > 1 && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.9 }}
                            className="flex items-center gap-3 bg-secondary px-8 py-3 rounded-full border border-primary/20 shadow-2xl z-10"
                        >
                            <CalendarIcon size={16} className="text-primary" />
                            <span className="text-[11px] font-black uppercase tracking-[0.25em] text-white">Estancia mínima: {minNights} Noches</span>
                        </motion.div>
                    )}
                    {isVeryBlocked && !startDate && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center gap-3 bg-white/30 backdrop-blur-xl px-6 py-2.5 rounded-full border border-white/60 shadow-xl"
                        >
                            <Star size={14} className="text-primary" />
                            <span className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80 text-secondary">Temporada de Alta Demanda</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* 🏺 THE CALENDAR CORE (Glassmorphism Overhaul) */}
            <div className="booking-datepicker-wrapper relative group bg-white/20 backdrop-blur-2xl rounded-[3rem] p-6 sm:p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-white/40 ring-1 ring-white/50 w-full max-w-[850px] overflow-hidden">
                <div className={`flex flex-col md:flex-row gap-8 lg:gap-16`}>
                    <AnimatePresence mode="popLayout" custom={direction}>
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
