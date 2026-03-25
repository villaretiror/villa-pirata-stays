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
    // 📱 MOBILE OPTIMIZATION: One month on mobile/tablet, two on large desktop
    const monthsShown = typeof window !== 'undefined' && window.innerWidth >= 1024 ? 2 : 1;

    return (
        <div className="w-full flex flex-col items-center">
            <h3 className="font-bold text-[10px] uppercase tracking-[0.5em] text-primary/80 mb-6 text-center">Plan de Vuelo: Su Estancia ⚓</h3>
            
            <div className="booking-datepicker-wrapper relative shadow-2xl rounded-[3rem] overflow-hidden border border-black/5 bg-white">
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

            <div className="flex justify-center gap-12 py-6 mt-4">
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_10px_rgba(255,127,63,0.4)]"></div>
                    <span className="text-[9px] font-black text-text-main uppercase tracking-widest">Seleccionado</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-100 border border-black/10"></div>
                    <span className="text-[9px] font-black text-text-light uppercase tracking-widest opacity-40">Ocupado</span>
                </div>
            </div>

            <style>{`
        /* 🔱 RESET QUIRÚRGICO */
        .luxury-calendar { border: none !important; font-family: 'Outfit', sans-serif !important; background: white !important; display: block !important; }
        
        .react-datepicker { 
            display: flex !important;
            padding: 2.5rem !important;
            gap: 3rem !important;
            border: none !important;
            background: white !important;
            position: relative !important;
        }

        /* Essential fix for twin months jumping */
        .react-datepicker__month-container { 
            float: none !important;
            display: inline-block !important;
            vertical-align: top !important;
            width: 320px !important;
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
            font-size: 1.8rem !important; 
            margin: 1rem 0 2rem 0 !important;
            color: #1a1a1a !important; 
            text-transform: capitalize !important;
            letter-spacing: -0.02em !important;
        }

        /* 🔱 GRID DE DÍAS */
        .react-datepicker__day-names {
            display: grid !important;
            grid-template-columns: repeat(7, 1fr) !important;
            margin-bottom: 0.75rem !important;
        }
        
        .react-datepicker__day-name { 
            text-transform: uppercase !important; 
            font-size: 9px !important; 
            font-weight: 900 !important; 
            color: #bbb !important; 
            width: auto !important;
            margin: 0 !important;
        }

        .react-datepicker__month { 
            display: grid !important;
            grid-template-columns: repeat(7, 1fr) !important;
            gap: 4px !important;
            margin: 0 !important;
        }

        /* Hidden layers bypass */
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
            font-size: 0.95rem !important; 
            font-weight: 800 !important;
            border-radius: 50% !important;
            transition: all 0.3s ease !important;
            cursor: pointer !important;
            color: #1a1a1a !important;
        }

        .react-datepicker__day--outside-month {
            visibility: hidden !important;
        }
        
        .react-datepicker__day--disabled { 
            color: #eee !important; 
            cursor: not-allowed !important;
            font-weight: 300 !important;
        }
        
        .react-datepicker__day--selected, 
        .react-datepicker__day--range-start, 
        .react-datepicker__day--range-end { 
            background-color: #FF7F3F !important; 
            color: white !important; 
            box-shadow: 0 8px 15px rgba(255, 127, 63, 0.3) !important;
            z-index: 5 !important;
            transform: scale(1.1);
        }
        
        .react-datepicker__day--in-range { 
            background-color: rgba(255, 127, 63, 0.08) !important; 
            color: #FF7F3F !important; 
            border-radius: 0 !important;
        }

        .react-datepicker__day:hover:not(.react-datepicker__day--disabled) { 
            background-color: #1a1a1a !important; 
            color: white !important;
            transform: scale(1.1);
        }
        
        @media (max-width: 1023px) {
            .react-datepicker { 
                flex-direction: column !important;
                gap: 2rem !important;
                padding: 1.5rem !important;
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
