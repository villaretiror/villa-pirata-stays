import React, { useState, useEffect, useMemo } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { es } from 'date-fns/locale';
import { addDays } from 'date-fns';

registerLocale('es', es);

interface BookingCalendarProps {
    startDate: Date | null;
    endDate: Date | null;
    onChange: (update: [Date | null, Date | null]) => void;
    blockedDates: Date[];
    minNights?: number;
    isRangeAvailable?: (start: Date, end: Date) => boolean;
}

const BookingCalendar: React.FC<BookingCalendarProps> = ({ startDate, endDate, onChange, blockedDates, minNights = 2, isRangeAvailable }) => {
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
            <header className="text-center mb-6 sm:mb-10 px-4">
                <h3 className="font-serif font-black text-3xl sm:text-4xl text-secondary mb-2 sm:mb-3 tracking-tighter italic">Disponibilidad Real 🔱</h3>
                <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse border-2 border-white shadow-lg"></div>
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.25em] text-emerald-700/80">Sincronía AST (Puerto Rico Time)</span>
                </div>
                <p className="text-[10px] sm:text-[12px] uppercase font-black tracking-[0.3em] sm:tracking-[0.4em] text-primary/60 leading-relaxed max-w-xs mx-auto">Seleccione su cronograma de estancia</p>
            </header>
            
            <div className="booking-datepicker-wrapper relative shadow-bunker rounded-[3.5rem] overflow-hidden border border-black/5 bg-white">
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
                
                {isVeryBlocked && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 animate-fade-in pointer-events-none">
                        <div className="bg-secondary/90 backdrop-blur-2xl border border-white/20 px-8 py-3 rounded-full flex items-center gap-3 shadow-2xl">
                            <span className="material-icons text-primary text-base animate-pulse">stars</span>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Temporada Signature de Alta Demanda</span>
                        </div>
                    </div>
                )}
                
                {startDate && !endDate && minNights > 1 && (
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 animate-fade-in w-max pointer-events-none">
                        <div className="bg-secondary/95 backdrop-blur-xl border border-white/20 px-10 py-4 rounded-full flex items-center gap-3 shadow-[0_25px_50px_rgba(10,25,47,0.4)]">
                            <span className="material-icons text-primary text-base">calendar_today</span>
                            <span className="text-[12px] font-black uppercase tracking-[0.3em] text-white">Estancia Mínima: {minNights} Noches</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-10 sm:gap-20 py-12 mt-8 border-t border-black/5 w-full max-w-2xl px-6">
                <div className="flex items-center gap-4">
                    <div className="w-4 h-4 rounded-full bg-primary shadow-[0_0_20px_rgba(212,175,55,0.6)]"></div>
                    <span className="text-[11px] font-black text-secondary uppercase tracking-widest">Su Selección Signature</span>
                </div>
                <div className="flex items-center gap-4 opacity-50">
                    <div className="w-4 h-4 rounded-full border border-black/10 bg-gray-50 flex items-center justify-center overflow-hidden">
                        <div className="w-full h-[1px] bg-gray-300 rotate-45"></div>
                    </div>
                    <span className="text-[11px] font-black text-secondary uppercase tracking-widest">Ya Reservado (iCal)</span>
                </div>
            </div>

            <style>{`
        .vintage-premium-calendar { border: none !important; font-family: 'Outfit', sans-serif !important; background: white !important; }
        .react-datepicker { display: flex !important; padding: 2rem !important; gap: 3rem !important; border: none !important; background: white !important; flex-direction: row !important; }
        .react-datepicker__navigation { top: 2.5rem !important; width: 44px !important; height: 44px !important; background: #fafafa !important; border-radius: 50% !important; border: 1px solid #eee !important; transition: all 0.3s ease !important; z-index: 10 !important; }
        .react-datepicker__navigation:hover { background: #f0f0f0 !important; transform: scale(1.1); }
        .react-datepicker__navigation--previous { left: 2rem !important; }
        .react-datepicker__navigation--next { right: 2rem !important; }
        .react-datepicker__month-container { width: 320px !important; }
        .react-datepicker__header { background-color: white !important; border: none !important; padding: 0 !important; }
        .react-datepicker__current-month { font-family: 'serif' !important; font-weight: 900 !important; font-size: 2rem !important; margin-bottom: 2.5rem !important; color: #0A192F !important; text-transform: capitalize !important; letter-spacing: -0.06em !important; text-align: center !important; width: 100% !important; }
        .react-datepicker__day-names { display: grid !important; grid-template-columns: repeat(7, 1fr) !important; margin-bottom: 1.5rem !important; border-bottom: 1px solid #f0f0f0 !important; padding-bottom: 0.5rem !important; }
        .react-datepicker__day-name { text-transform: uppercase !important; font-size: 10px !important; font-weight: 900 !important; color: #999 !important; width: auto !important; margin: 0 !important; letter-spacing: 0.1em !important; }
        .react-datepicker__month { display: grid !important; grid-template-columns: repeat(7, 1fr) !important; row-gap: 8px !important; column-gap: 0 !important; margin: 0 !important; }
        .react-datepicker__day { width: 100% !important; height: 48px !important; display: flex !important; align-items: center !important; justify-content: center !important; margin: 0 !important; font-size: 14px !important; font-weight: 800 !important; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important; cursor: pointer !important; color: #1a1a1a !important; position: relative !important; z-index: 1; }
        .react-datepicker__day--selected, .react-datepicker__day--range-start, .react-datepicker__day--range-end, .react-datepicker__day--in-range { background-color: #D4AF37 !important; color: #0A192F !important; border-radius: 0 !important; font-weight: 900 !important; }
        .react-datepicker__day--range-start { border-radius: 50% 0 0 50% !important; box-shadow: -10px 0 20px rgba(212, 175, 55, 0.3) !important; }
        .react-datepicker__day--range-end { border-radius: 0 50% 50% 0 !important; box-shadow: 10px 0 20px rgba(212, 175, 55, 0.3) !important; }
        .react-datepicker__day--range-start.react-datepicker__day--range-end { border-radius: 50% !important; }
        .react-datepicker__day--in-range:not(.react-datepicker__day--range-start):not(.react-datepicker__day--range-end) { background-color: rgba(212, 175, 55, 0.2) !important; color: #0A192F !important; }
        .react-datepicker__day--disabled, .react-datepicker__day--excluded { background: #fafafa !important; color: #bbb !important; cursor: not-allowed !important; font-weight: 400 !important; opacity: 0.7; }
        .react-datepicker__day--excluded::after { content: ""; position: absolute; width: 60%; height: 1px; background: #ddd; transform: rotate(-45deg); z-index: 0; }
        .react-datepicker__day:hover:not(.react-datepicker__day--disabled) { background-color: #0A192F !important; color: white !important; z-index: 10 !important; border-radius: 50% !important; transform: translateY(-4px); box-shadow: 0 10px 20px rgba(0,0,0,0.15) !important; }
        @media (max-width: 1023px) {
            .react-datepicker { flex-direction: column !important; padding: 1.5rem 1rem !important; gap: 2rem !important; }
            .react-datepicker__month-container { width: 100% !important; }
            .react-datepicker__navigation { top: 1.5rem !important; width: 44px !important; height: 44px !important; }
            .react-datepicker__navigation--previous { left: 1rem !important; }
            .react-datepicker__navigation--next { right: 1rem !important; }
            .react-datepicker__day { height: 50px !important; font-size: 15px !important; }
            .react-datepicker__current-month { font-size: 1.75rem !important; margin-bottom: 2rem !important; }
            .react-datepicker__day-name { font-size: 11px !important; }
        }
      `}</style>
        </div>
    );
};

export default BookingCalendar;
