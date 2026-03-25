import React, { useMemo } from 'react';
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
        const nowAST = Temporal.Now.zonedDateTimeISO('America/Puerto_Rico');
        return new Date(nowAST.year, nowAST.month - 1, nowAST.day);
    }, []);
    // 📱 MOBILE OPTIMIZATION: One month on mobile/tablet, two only on large desktop (1024px+)
    const monthsShown = typeof window !== 'undefined' && window.innerWidth >= 1024 ? 2 : 1;

    return (
        <div className="space-y-4">
            <h3 className="font-bold text-[10px] uppercase tracking-[0.3em] text-primary/80 mb-2 px-6">Cronograma de Estancia ⚓</h3>
            <div className="relative booking-datepicker-container animate-fade-in shadow-2xl rounded-[3rem] overflow-hidden border border-black/5 bg-white mx-auto max-w-full">
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
                    calendarClassName="luxury-calendar"
                />
            </div>

            <div className="flex justify-center gap-10 py-3">
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_12px_rgba(255,127,63,0.4)]"></div>
                    <span className="text-[9px] font-black text-text-main uppercase tracking-widest">Seleccionado</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-100 border border-black/5"></div>
                    <span className="text-[9px] font-black text-text-light uppercase tracking-widest opacity-60">Ocupado</span>
                </div>
            </div>

            <style>{`
        .luxury-calendar { border: none !important; font-family: 'Outfit', sans-serif !important; width: 100% !important; background: white !important; }
        
        .react-datepicker { 
            display: flex !important;
            flex-direction: column !important;
            border: none !important; 
            width: 100% !important; 
            background: white !important;
            padding: 2rem !important;
            gap: 2rem !important;
        }

        .react-datepicker__month-container { 
            float: none !important;
            display: flex !important;
            flex-direction: column !important;
            width: 100% !important;
            max-width: 100% !important;
        }

        .react-datepicker__header { 
            background-color: white !important; 
            border: none !important; 
            padding: 0 !important;
            width: 100% !important; 
        }

        .react-datepicker__current-month { 
            font-family: 'serif', 'Playfair Display' !important; 
            font-weight: 900 !important; 
            font-size: 1.5rem !important; 
            text-align: center !important;
            margin: 1.5rem 0 2rem 0 !important;
            color: #1a1a1a !important; 
            text-transform: capitalize !important;
            letter-spacing: -0.02em !important;
        }

        /* 🔱 THE GRID MASTER: Standardizing Columns */
        .react-datepicker__day-names {
            display: grid !important;
            grid-template-columns: repeat(7, 1fr) !important;
            text-align: center !important;
            margin-bottom: 1rem !important;
            gap: 8px !important;
        }
        
        .react-datepicker__day-name { 
            text-transform: uppercase !important; 
            font-size: 9px !important; 
            font-weight: 900 !important; 
            color: #ccc !important; 
            width: auto !important;
            margin: 0 !important;
            line-height: normal !important;
            letter-spacing: 0.1em !important;
        }

        /* 🔱 DATES GRID: The Secret Sauce */
        .react-datepicker__month { 
            display: grid !important;
            grid-template-columns: repeat(7, 1fr) !important;
            gap: 8px !important;
            margin: 0 !important;
        }

        /* Essential structural bypass */
        .react-datepicker__week {
            display: contents !important;
        }

        .react-datepicker__day { 
            width: auto !important;
            aspect-ratio: 1/1 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            margin: 0 !important; 
            font-size: 0.85rem !important; 
            font-weight: 700 !important;
            border-radius: 50% !important;
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
            cursor: pointer !important;
            color: #1a1a1a !important;
            border: 2px solid transparent !important;
        }

        .react-datepicker__day--outside-month {
            visibility: hidden !important;
        }
        
        .react-datepicker__day--disabled { 
            background-color: transparent !important;
            color: #f0f0f0 !important; 
            cursor: not-allowed !important;
            font-weight: 400 !important;
            text-decoration: line-through opacity-30 !important;
        }
        
        .react-datepicker__day--selected, 
        .react-datepicker__day--range-start, 
        .react-datepicker__day--range-end { 
            background-color: #FF7F3F !important; 
            color: white !important; 
            box-shadow: 0 10px 20px rgba(255, 127, 63, 0.4) !important;
            z-index: 5 !important;
            border-radius: 50% !important;
            transform: scale(1.1);
        }
        
        .react-datepicker__day--in-range { 
            background-color: rgba(255, 127, 63, 0.08) !important; 
            color: #FF7F3F !important; 
            border-radius: 50% !important;
            transform: scale(0.9);
        }

        .react-datepicker__day--in-selecting-range {
            background-color: rgba(255, 127, 63, 0.05) !important;
        }

        .react-datepicker__day:hover:not(.react-datepicker__day--disabled) { 
            background-color: #1a1a1a !important; 
            color: white !important;
            transform: translateY(-4px) scale(1.1) !important;
            box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important;
        }
        
        @media (min-width: 1024px) {
            .react-datepicker { 
                flex-direction: row !important; 
                justify-content: center !important;
                gap: 5rem !important;
                padding: 3rem !important;
                min-width: 820px !important;
            }
            .react-datepicker__month-container { 
                width: 320px !important; 
            }
        }
      `}</style>
        </div>
    );
};

export default BookingCalendar;

