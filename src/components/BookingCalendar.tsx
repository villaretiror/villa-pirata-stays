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
}

const BookingCalendar: React.FC<BookingCalendarProps> = ({ startDate, endDate, onChange, blockedDates }) => {
    // 🛡️ AST SHIELD: Min Date calculation based on Puerto Rico Time
    const minDate = useMemo(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
    }, []);

    // 📱 MOBILE OPTIMIZATION: Safety check for window width to prevent overlap
    const [monthsShown, setMonthsShown] = useState(1);
    
    useEffect(() => {
        const handleResize = () => setMonthsShown(window.innerWidth > 1024 ? 2 : 1);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="w-full flex flex-col items-center">
            <header className="text-center mb-10">
                <h3 className="font-serif font-black text-3xl text-text-main mb-3 tracking-tight italic">Disponibilidad Signature 🔱</h3>
                <p className="text-[11px] uppercase font-black tracking-[0.5em] text-primary/70">Seleccione su cronograma de estancia</p>
            </header>
            
            <div className="booking-datepicker-wrapper relative shadow-[0_45px_100px_-20px_rgba(0,0,0,0.2)] rounded-[3.5rem] overflow-hidden border border-black/5 bg-white">
                <DatePicker
                    selectsRange={true}
                    startDate={startDate}
                    endDate={endDate}
                    onChange={onChange}
                    excludeDates={blockedDates}
                    minDate={minDate}
                    monthsShown={monthsShown}
                    inline
                    locale="es"
                    calendarClassName="vintage-premium-calendar"
                />
            </div>

            <div className="flex justify-center gap-16 py-10 mt-6 border-t border-black/5 w-full max-w-xl">
                <div className="flex items-center gap-4">
                    <div className="w-3.5 h-3.5 rounded-full bg-primary shadow-[0_0_20px_rgba(255,127,63,0.6)]"></div>
                    <span className="text-[11px] font-black text-text-main uppercase tracking-widest">Su Selección</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-3.5 h-3.5 rounded-full bg-gray-200 border border-black/10"></div>
                    <span className="text-[11px] font-black text-text-light uppercase tracking-widest opacity-60">No Disponible</span>
                </div>
            </div>

            <style>{`
        /* 🔱 VINTAGE-PREMIUM DESIGN SYSTEM - RECONSTRUIDO */
        .vintage-premium-calendar { border: none !important; font-family: 'Outfit', sans-serif !important; background: white !important; }
        
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
        
        /* 🏛️ REACCIÓN DE BLOQUEO (iCal Visibility) - REFORZADA */
        .react-datepicker__day--disabled, 
        .react-datepicker__day--excluded { 
            background-color: #f5f5f5 !important;
            color: #888 !important; 
            cursor: not-allowed !important;
            font-weight: 300 !important;
            text-decoration: line-through solid #ff4d4d 2px !important;
            opacity: 0.5;
        }
        
        .react-datepicker__day--disabled:hover {
            background-color: #f5f5f5 !important;
            color: #888 !important;
            transform: none !important;
            box-shadow: none !important;
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
