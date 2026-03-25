import React, { useState, useEffect, useMemo } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { es } from 'date-fns/locale';
import { Temporal } from '@js-temporal/polyfill';

registerLocale('es', es);

interface BookingCalendarProps {
    startDate: Date | null;
    endDate: Date | null;
    onChange: (update: [Date | null, Date | null]) => void;
    blockedDates: Date[];
    minNights?: number; // 🔱 DYNAMIC ANCHOR
    isRangeAvailable?: (start: Date, end: Date) => boolean;
}

const BookingCalendar: React.FC<BookingCalendarProps> = ({ startDate, endDate, onChange, blockedDates, minNights = 2, isRangeAvailable }) => {
    // 🔱 UX GUIDANCE: Dynamically highlight suggested minimum stay days
    const getDayClassName = (date: Date) => {
        if (startDate && !endDate && minNights > 1) {
            const timeDiff = date.getTime() - startDate.getTime();
            const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
            // Highlight days within the min_nights window
            if (dayDiff > 0 && dayDiff < minNights) {
                return "react-datepicker__day--suggested-range";
            }
        }
        return "";
    };
    // 🛡️ AST SHIELD: Min Date calculation anchored to Puerto Rico Time (UTC-4)
    const minDate = useMemo(() => {
        // Get UTC time and adjust to PR (-4)
        const d = new Date();
        const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
        const prTime = new Date(utc + (3600000 * -4));
        return new Date(prTime.getFullYear(), prTime.getMonth(), prTime.getDate(), 0, 0, 0);
    }, []);

    // 📱 MOBILE OPTIMIZATION: Safety check for window width to prevent overlap
    const [monthsShown, setMonthsShown] = useState(1);
    
    useEffect(() => {
        const handleResize = () => setMonthsShown(window.innerWidth > 1024 ? 2 : 1);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 🛡️ BLOCK THE PATH: Dynamic Max Date search after selecting check-in
    const maxDate = useMemo(() => {
        if (!startDate || blockedDates.length === 0) return undefined;
        
        // Find the first blocked date AFTER the startDate
        const laterBlocks = blockedDates
            .filter(d => d.getTime() > startDate.getTime())
            .sort((a, b) => a.getTime() - b.getTime());
            
        return laterBlocks.length > 0 ? laterBlocks[0] : undefined;
    }, [startDate, blockedDates]);

    // 🔱 INTERNAL VALIDATOR: Catch invalid ranges BEFORE they hit the parent state
    const handleInternalChange = (update: [Date | null, Date | null]) => {
        const [start, end] = update;
        
        if (start && end && isRangeAvailable) {
            if (!isRangeAvailable(start, end)) {
                onChange([start, null]); // Force valid selection start point
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

    return (
        <div className="w-full flex flex-col items-center">
            <header className="text-center mb-10">
                <h3 className="font-serif font-black text-3xl text-text-main mb-3 tracking-tight italic">Disponibilidad Real 🔱</h3>
                <div className="flex items-center justify-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600/70">Sincronía AST (Puerto Rico Time)</span>
                </div>
                <p className="text-[11px] uppercase font-black tracking-[0.5em] text-primary/70">Seleccione su cronograma de estancia</p>
            </header>
            
            <div className="booking-datepicker-wrapper relative shadow-[0_45px_100px_-20px_rgba(0,0,0,0.2)] rounded-[3.5rem] overflow-hidden border border-black/5 bg-white">
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
                
                {/* 🔱 EXCLUSIVITY BADGE: Transforming 'No Available' into 'Premium Demand' */}
                {blockedDates.length > 25 && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 animate-fade-in pointer-events-none">
                        <div className="bg-black/80 backdrop-blur-xl border border-white/20 px-6 py-2.5 rounded-full flex items-center gap-3 shadow-2xl">
                            <span className="material-icons text-primary text-sm animate-pulse">hotel_class</span>
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white">Exclusividad Signature Agotada para este ciclo</span>
                        </div>
                    </div>
                )}
                
                {/* 🔱 CONCIERGE GUIDANCE: Informing the captain about stay constraints */}
                {startDate && !endDate && minNights > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 animate-fade-in w-max pointer-events-none">
                        <div className="bg-[#FF7F3F] border border-white/30 px-6 py-2.5 rounded-full flex items-center gap-3 shadow-[0_20px_40px_rgba(255,127,63,0.3)]">
                            <span className="material-icons text-white text-sm animate-bounce">auto_awesome</span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Noches mínimas requeridas: {minNights}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-center gap-16 py-10 mt-6 border-t border-black/5 w-full max-w-xl">
                <div className="flex items-center gap-4">
                    <div className="w-3.5 h-3.5 rounded-full bg-primary shadow-[0_0_20px_rgba(255,127,63,0.6)]"></div>
                    <span className="text-[11px] font-black text-text-main uppercase tracking-widest">Su Selección Signature</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-3.5 h-3.5 rounded-full border border-black/10 bg-white" style={{ 
                        backgroundImage: 'linear-gradient(45deg, transparent 48%, #e0e0e0 48%, #e0e0e0 52%, transparent 52%), linear-gradient(-45deg, transparent 48%, #e0e0e0 48%, #e0e0e0 52%, transparent 52%)' 
                    }}></div>
                    <span className="text-[11px] font-black text-text-light uppercase tracking-widest opacity-60">Reserva Confirmada (iCal)</span>
                </div>
            </div>

            <style>{`
        /* 🔱 VINTAGE-PREMIUM DESIGN SYSTEM - RECONSTRUIDO */
        .vintage-premium-calendar { border: none !important; font-family: 'Outfit', sans-serif !important; background: white !important; }
        
        @keyframes pulse-gold {
            0% { box-shadow: 0 0 0 0 rgba(255, 127, 63, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(255, 127, 63, 0); }
            100% { box-shadow: 0 0 0 0 rgba(255, 127, 63, 0); }
        }

        .react-datepicker__day--suggested-range {
            background-color: rgba(255, 127, 63, 0.05) !important;
            border: 2px dashed rgba(255, 127, 63, 0.3) !important;
            color: #FF7F3F !important;
            animation: pulse-gold 2s infinite !important;
        }

        .react-datepicker { 
            display: flex !important;
            padding: 4rem !important;
            gap: 6rem !important;
            border: none !important;
            background: white !important;
            flex-direction: row !important;
            position: relative !important;
        }

        .react-datepicker__month-container { 
            float: none !important;
            display: flex !important;
            flex-direction: column !important;
            width: 340px !important;
        }

        .react-datepicker__header { 
            background-color: white !important; 
            border: none !important; 
            padding: 0 !important;
            text-align: center !important;
        }

        .react-datepicker__current-month { 
            font-family: 'serif', 'Playfair Display' !important; 
            font-weight: 900 !important; 
            font-size: 2.4rem !important; 
            margin-bottom: 3rem !important;
            color: #1a1a1a !important; 
            text-transform: capitalize !important;
            letter-spacing: -0.05em !important;
        }

        /* 🔱 GRID DE DÍAS ATÓMICO - 7 COLUMNAS FR */
        .react-datepicker__day-names {
            display: grid !important;
            grid-template-columns: repeat(7, 1fr) !important;
            margin-bottom: 1.5rem !important;
            border-bottom: 2px solid #f9f9f9 !important;
            padding-bottom: 1rem !important;
        }
        
        .react-datepicker__day-name { 
            text-transform: uppercase !important; 
            font-size: 11px !important; 
            font-weight: 900 !important; 
            color: #ccc !important; 
            width: auto !important;
            margin: 0 !important;
            text-align: center !important;
        }

        .react-datepicker__month { 
            display: grid !important;
            grid-template-columns: repeat(7, 1fr) !important;
            gap: 15px !important;
            margin: 0 !important;
        }

        .react-datepicker__week {
            display: contents !important;
        }

        .react-datepicker__day { 
            width: 46px !important;
            height: 46px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            margin: 0 !important; 
            font-size: 1.1rem !important; 
            font-weight: 800 !important;
            border-radius: 50% !important;
            transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1) !important;
            cursor: pointer !important;
            color: #1a1a1a !important;
            border: 3px solid transparent !important;
        }

        .react-datepicker__day--outside-month {
            visibility: hidden !important;
        }
        
        /* 🔱 DÍAS DISPONIBLES (PROACTIVOS) */
        .react-datepicker__day:not(.react-datepicker__day--disabled):not(.react-datepicker__day--excluded) {
            color: #1a1a1a !important;
            background: white !important;
            cursor: pointer !important;
            font-weight: 800 !important;
        }

        /* 🔱 DÍAS NO DISPONIBLES (VISIBILIDAD INSTANTÁNEA) */
        .react-datepicker__day--disabled, 
        .react-datepicker__day--excluded { 
            background: #fafafa !important;
            background-image: 
                linear-gradient(45deg, transparent 48%, #e0e0e0 48%, #e0e0e0 52%, transparent 52%),
                linear-gradient(-45deg, transparent 48%, #e0e0e0 48%, #e0e0e0 52%, transparent 52%) !important;
            color: #ccc !important; 
            cursor: not-allowed !important;
            font-weight: 300 !important;
            opacity: 0.6;
            text-decoration: none !important;
        }
        
        .react-datepicker__day--disabled:hover {
            transform: none !important;
            box-shadow: none !important;
            background: #fafafa !important;
        }
        
        .react-datepicker__day--selected, 
        .react-datepicker__day--range-start, 
        .react-datepicker__day--range-end { 
            background-color: #FF7F3F !important; 
            color: white !important; 
            box-shadow: 0 15px 35px rgba(255, 127, 63, 0.5) !important;
            z-index: 5 !important;
            transform: scale(1.1);
        }
        
        .react-datepicker__day--in-range { 
            background-color: rgba(255, 127, 63, 0.12) !important; 
            color: #FF7F3F !important; 
            border-radius: 50% !important;
        }

        .react-datepicker__day:hover:not(.react-datepicker__day--disabled) { 
            background-color: #1a1a1a !important; 
            color: white !important;
            transform: translateY(-5px) scale(1.1);
            box-shadow: 0 15px 30px rgba(0,0,0,0.1) !important;
        }
        
        /* 📱 MOBILE VERTICAL LOCK */
        @media (max-width: 1023px) {
            .react-datepicker { 
                flex-direction: column !important;
                padding: 2.5rem 2rem !important;
                gap: 4rem !important;
            }
            .react-datepicker__month-container {
                width: 100% !important;
            }
        }
      `}</style>
        </div>
    );
};

export default BookingCalendar;
