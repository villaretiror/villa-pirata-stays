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
        .react-datepicker { 
            display: flex !important; 
            flex-direction: column !important;
            border: none !important; 
            width: 100% !important; 
            background: white !important;
            padding: 1rem !important;
        }
        .react-datepicker__month-container { 
            width: 100% !important; 
            float: none !important; 
            padding: 0 10px !important;
        }
        .react-datepicker__header { background-color: white !important; border: none !important; padding-top: 10px !important; width: 100% !important; }
        .react-datepicker__current-month { 
            font-family: 'serif' !important; 
            font-weight: 800 !important; 
            font-size: 1.1rem !important; 
            margin-bottom: 20px !important; 
            color: #1a1a1a !important; 
            text-transform: capitalize !important;
        }
        .react-datepicker__day-name { text-transform: uppercase !important; font-size: 10px !important; font-weight: 900 !important; color: #888 !important; width: 2.5rem !important; margin: 0.2rem !important; }
        .react-datepicker__month { margin: 0.5rem 0 !important; }
        .react-datepicker__day { 
            width: 2.5rem !important; 
            line-height: 2.5rem !important; 
            margin: 0.2rem !important; 
            font-size: 0.9rem !important; 
            font-weight: 600 !important;
            border-radius: 14px !important;
            transition: all 0.2s ease !important;
            position: relative !important;
            display: inline-block !important;
        }
        
        /* Ocupado / Disabled */
        .react-datepicker__day--disabled { 
            background-color: #f5f5f5 !important;
            color: #d1d1d1 !important; 
            text-decoration: none !important;
        }
        
        .react-datepicker__day--selected, .react-datepicker__day--range-start, .react-datepicker__day--range-end { 
            background-color: #FF7F3F !important; 
            color: white !important; 
            box-shadow: 0 4px 12px rgba(255, 127, 63, 0.4) !important;
            z-index: 10;
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
                gap: 2rem !important;
            }
            .react-datepicker__month-container { 
                width: auto !important; 
            }
            .react-datepicker__day { 
                width: 2.2rem !important; 
                line-height: 2.2rem !important; 
            }
        }
      `}</style>
        </div>
    );
};

export default BookingCalendar;

