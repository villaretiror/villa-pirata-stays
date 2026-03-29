import React, { useState, useEffect, useMemo } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { es } from 'date-fns/locale';
import { addDays } from 'date-fns';
import { ShieldCheck, Calendar as CalendarIcon, Star } from 'lucide-react';

registerLocale('es', es);

interface BookingCalendarProps {
    startDate: Date | null;
    endDate: Date | null;
    onChange: (update: [Date | null, Date | null]) => void;
    blockedDates: Date[];
    minNights?: number;
    isRangeAvailable?: (start: Date, end: Date) => boolean;
    hideHeader?: boolean;
}

const BookingCalendar: React.FC<BookingCalendarProps> = ({ startDate, endDate, onChange, blockedDates, minNights = 2, isRangeAvailable, hideHeader = false }) => {
    const getDayClassName = (date: Date) => {
        if (startDate && !endDate && minNights > 1) {
            const timeDiff = date.getTime() - startDate.getTime();
            const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
            if (dayDiff > 0 && dayDiff < minNights) return "react-datepicker__day--suggested-range";
        }
        return "";
    };

    const minDate = useMemo(() => {
        const d = new Date();
        const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
        const prTime = new Date(utc + (3600000 * -4));
        return new Date(prTime.getFullYear(), prTime.getMonth(), prTime.getDate(), 0, 0, 0);
    }, []);

    const [monthsShown, setMonthsShown] = useState(1);
    
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

    const handleInternalChange = (update: [Date | null, Date | null]) => {
        const [start, end] = update;
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
        onChange(update);
    };

    const isVeryBlocked = useMemo(() => {
        if (blockedDates.length < 5) return false;
        const horizon = addDays(minDate, 90);
        const blocksInHorizon = blockedDates.filter(d => d >= minDate && d <= horizon).length;
        return blocksInHorizon > 65; 
    }, [blockedDates, minDate]);

    return (
        <div className="w-full flex flex-col items-center">
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
            <div className="booking-datepicker-wrapper relative group bg-white rounded-[4rem] p-4 sm:p-10 shadow-bunker border border-black/5 ring-1 ring-black/[0.02]">
                <DatePicker
                    selectsRange={true}
                    startDate={startDate}
                    endDate={endDate}
                    onChange={handleInternalChange}
                    excludeDates={blockedDates}
                    minDate={minDate}
                    maxDate={maxDate}
                    monthsShown={monthsShown}
                    dayClassName={getDayClassName}
                    inline
                    locale="es"
                    calendarClassName="vintage-premium-calendar"
                />
            </div>

            {/* 📜 LEGEND & TRUST */}
            <div className="w-full max-w-3xl mt-12 px-6">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-8 py-8 border-t border-black/[0.05]">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full bg-primary shadow-lg shadow-primary/20"></div>
                            <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Su Selección</span>
                        </div>
                        <div className="flex items-center gap-3 opacity-40">
                            <div className="w-4 h-4 rounded-full border-2 border-dashed border-secondary/20 bg-gray-50 flex items-center justify-center overflow-hidden">
                                <div className="w-full h-[1px] bg-secondary/30 rotate-45"></div>
                            </div>
                            <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Ya Reservado</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-6 py-2 bg-gray-50 rounded-full border border-black/5">
                        <ShieldCheck size={14} className="text-emerald-600" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-secondary/50 italic">Canal Blindado & Encriptado</span>
                    </div>
                </div>
            </div>

            <style>{`
        .vintage-premium-calendar { border: none !important; font-family: 'Outfit', sans-serif !important; background: transparent !important; }
        .react-datepicker { display: flex !important; gap: 4rem !important; border: none !important; background: transparent !important; flex-direction: row !important; }
        
        /* 🔱 ELITE NAVIGATION */
        .react-datepicker__navigation { top: 0rem !important; width: 52px !important; height: 52px !important; background: white !important; border-radius: 50% !important; border: 1px solid rgba(0,0,0,0.08) !important; transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1) !important; z-index: 100 !important; display: flex !important; align-items: center !important; justify-content: center !important; box-shadow: 0 10px 25px rgba(0,0,0,0.05) !important; }
        .react-datepicker__navigation:hover { background: #0A192F !important; transform: translateY(-3px) scale(1.05) !important; box-shadow: 0 15px 35px rgba(10,25,47,0.15) !important; border-color: transparent !important; }
        .react-datepicker__navigation:hover .react-datepicker__navigation-icon::before { border-color: #D4AF37 !important; }
        .react-datepicker__navigation--previous { left: -1.5rem !important; }
        .react-datepicker__navigation--next { right: -1.5rem !important; }
        .react-datepicker__navigation-icon::before { border-color: #0A192F !important; border-width: 2px 2px 0 0 !important; width: 12px !important; height: 12px !important; transition: border-color 0.3s ease !important; }
        
        .react-datepicker__month-container { width: 340px !important; }
        .react-datepicker__header { background-color: transparent !important; border: none !important; padding: 0 !important; }
        .react-datepicker__current-month { font-family: 'serif' !important; font-weight: 900 !important; font-size: 2.25rem !important; margin-bottom: 3rem !important; color: #0A192F !important; text-transform: capitalize !important; letter-spacing: -0.05em !important; text-align: center !important; width: 100% !important; }
        
        .react-datepicker__day-names { display: flex !important; justify-content: space-between !important; margin-bottom: 1.5rem !important; padding: 0 10px !important; }
        .react-datepicker__day-name { text-transform: uppercase !important; font-size: 10px !important; font-weight: 900 !important; color: #aaa !important; width: 38px !important; margin: 0 !important; letter-spacing: 0.15em !important; text-align: center !important; }
        
        .react-datepicker__month { margin: 0 !important; display: flex !important; flex-direction: column !important; gap: 8px !important; }
        .react-datepicker__week { display: flex !important; justify-content: space-between !important; }
        
        .react-datepicker__day { width: 44px !important; height: 44px !important; display: flex !important; align-items: center !important; justify-content: center !important; margin: 0 !important; font-size: 14px !important; font-weight: 700 !important; transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1) !important; cursor: pointer !important; color: #222 !important; position: relative !important; z-index: 1; border-radius: 50% !important; }
        
        /* 🔱 THE SIGNATURE SELECTION */
        .react-datepicker__day--selected, .react-datepicker__day--range-start, .react-datepicker__day--range-end { background-color: #D4AF37 !important; color: #0A192F !important; border-radius: 50% !important; font-weight: 900 !important; box-shadow: 0 8px 25px rgba(212,175,55,0.4) !important; z-index: 2 !important; }
        .react-datepicker__day--in-range { background-color: rgba(212, 175, 55, 0.12) !important; color: #D4AF37 !important; border-radius: 0 !important; }
        .react-datepicker__day--in-selecting-range { background-color: rgba(212, 175, 55, 0.08) !important; color: #D4AF37 !important; border-radius: 0 !important; }
        
        .react-datepicker__day--disabled, .react-datepicker__day--excluded { background: transparent !important; color: #ddd !important; cursor: not-allowed !important; font-weight: 300 !important; }
        .react-datepicker__day--excluded::after { content: ""; position: absolute; width: 14px; height: 1px; background: #eee; transform: rotate(-45deg); z-index: 0; }
        
        .react-datepicker__day:hover:not(.react-datepicker__day--disabled) { background-color: #0A192F !important; color: white !important; z-index: 10 !important; transform: scale(1.15) translateY(-2px); box-shadow: 0 15px 30px rgba(0,0,0,0.1) !important; }
        
        @media (max-width: 1023px) {
            .react-datepicker { flex-direction: column !important; padding: 0.5rem !important; gap: 3rem !important; }
            .react-datepicker__month-container { width: 100% !important; }
            .react-datepicker__navigation { top: 0rem !important; }
            .react-datepicker__navigation--previous { left: 0.5rem !important; }
            .react-datepicker__navigation--next { right: 0.5rem !important; }
            .react-datepicker__current-month { font-size: 1.75rem !important; margin-bottom: 2rem !important; }
            .react-datepicker__day { width: 12vw !important; height: 12vw !important; max-width: 50px !important; max-height: 50px !important; font-size: 15px !important; }
        }
      `}</style>
        </div>
    );
};

export default BookingCalendar;
