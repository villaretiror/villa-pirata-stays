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

    // 📱 MOBILE OPTIMIZATION: Show 1 month on mobile, 2 on desktop
    const monthsShown = typeof window !== 'undefined' && window.innerWidth > 768 ? 2 : 1;

    return (
        <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-[0.2em] text-text-light mb-4 px-2">Selecciona tus fechas</h3>
            <div className="relative booking-datepicker-container animate-fade-in shadow-xl rounded-[2.5rem] overflow-hidden border border-gray-50 bg-white">
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

            <div className="flex justify-center gap-6 pt-2">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary shadow-sm"></div>
                    <span className="text-[10px] font-bold text-text-light uppercase tracking-widest">Seleccionado</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                    <span className="text-[10px] font-bold text-text-light uppercase tracking-widest">Ocupado</span>
                </div>
            </div>

            <style>{`
        .luxury-calendar { border: none !important; font-family: inherit !important; width: 100% !important; background: white !important; }
        
        /* 🔱 THE GRID MASTER: Standardizing the container */
        .react-datepicker { 
            display: flex !important;
            flex-direction: column !important;
            border: none !important; 
            width: 100% !important; 
            background: white !important;
            padding: 1rem !important;
            gap: 2rem !important;
        }

        .react-datepicker__month-container { 
            float: none !important;
            display: block !important;
            width: 100% !important;
            margin-bottom: 2rem !important;
        }

        .react-datepicker__header { 
            background-color: white !important; 
            border: none !important; 
            padding: 0 !important;
            width: 100% !important; 
            position: relative !important;
        }

        .react-datepicker__current-month { 
            font-family: 'serif' !important; 
            font-weight: 800 !important; 
            font-size: 1.25rem !important; 
            text-align: center !important;
            margin: 1.5rem 0 !important;
            color: #1a1a1a !important; 
            text-transform: capitalize !important;
            display: block !important;
            width: 100% !important;
        }

        /* 🔱 DAY NAMES GRID */
        .react-datepicker__day-names {
            display: grid !important;
            grid-template-columns: repeat(7, 1fr) !important;
            text-align: center !important;
            margin-bottom: 0.5rem !important;
        }
        
        .react-datepicker__day-name { 
            text-transform: uppercase !important; 
            font-size: 10px !important; 
            font-weight: 800 !important; 
            color: #999 !important; 
            width: auto !important;
            margin: 0 !important;
            line-height: normal !important;
        }

        /* 🔱 THE DATES GRID: Rebuilt from scratch */
        .react-datepicker__month { 
            display: grid !important;
            grid-template-columns: repeat(7, 1fr) !important;
            gap: 2px !important;
            margin: 0 !important;
        }

        .react-datepicker__day { 
            width: 100% !important;
            aspect-ratio: 1/1 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            margin: 0 !important; 
            font-size: 0.9rem !important; 
            font-weight: 600 !important;
            border-radius: 50% !important;
            transition: all 0.2s ease !important;
            cursor: pointer !important;
            position: relative !important;
        }

        .react-datepicker__day--outside-month {
            visibility: hidden !important;
        }
        
        /* 🔱 STATUS STYLES */
        .react-datepicker__day--disabled { 
            background-color: transparent !important;
            color: #ddd !important; 
            cursor: not-allowed !important;
        }
        
        .react-datepicker__day--selected, 
        .react-datepicker__day--range-start, 
        .react-datepicker__day--range-end { 
            background-color: #FF7F3F !important; 
            color: white !important; 
            box-shadow: 0 4px 10px rgba(255, 127, 63, 0.3) !important;
            z-index: 5 !important;
            border-radius: 50% !important;
        }
        
        .react-datepicker__day--in-range { 
            background-color: rgba(255, 127, 63, 0.1) !important; 
            color: #FF7F3F !important; 
            border-radius: 0 !important;
        }

        .react-datepicker__day:hover:not(.react-datepicker__day--disabled) { 
            background-color: #ffe8db !important; 
            color: #FF7F3F !important;
        }
        
        @media (min-width: 768px) {
            .react-datepicker { 
                flex-direction: row !important; 
                justify-content: center !important;
                gap: 4rem !important;
                padding: 2rem !important;
            }
            .react-datepicker__month-container { 
                width: 320px !important; 
                margin-bottom: 0 !important;
            }
        }
      `}</style>
        </div>
    );
};

export default BookingCalendar;

