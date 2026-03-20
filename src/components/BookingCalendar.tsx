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
            <h3 className="font-bold text-sm uppercase tracking-wider text-text-light">Selecciona tus fechas</h3>
            <div className="relative booking-datepicker-container animate-fade-in shadow-sm rounded-[2rem] overflow-hidden border border-gray-100">
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
        .react-datepicker { display: block !important; border: none !important; }
        .react-datepicker__header { background-color: white !important; border: none !important; padding-top: 20px !important; }
        .react-datepicker__current-month { font-family: 'serif' !important; font-weight: 800 !important; font-size: 1.1rem !important; margin-bottom: 10px !important; color: #1a1a1a !important; }
        .react-datepicker__day-name { text-transform: uppercase !important; font-size: 10px !important; font-weight: 900 !important; color: #4B5563 !important; }
        .react-datepicker__month-container { width: 100% !important; }
        
        /* Ocupado / Disabled (Airbnb/Booking Sync) */
        .react-datepicker__day--disabled { 
            background-color: #FAFAFA !important;
            background-image: repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.03) 4px, rgba(0,0,0,0.03) 8px) !important;
            color: #D1D5DB !important; 
            text-decoration: none !important; 
            cursor: not-allowed !important; 
            border-radius: 8px !important;
        }

        /* 🏨 SMART COLOR CUES: Check-out dates (Industry standard) */
        /* Note: react-datepicker doesn't naturally provide a "check-out-only" class, but we can style the range */
        
        .react-datepicker__day--selected, .react-datepicker__day--range-start, .react-datepicker__day--range-end { 
            background-color: #FF7F3F !important; 
            border-radius: 12px !important; 
            color: white !important; 
            font-weight: bold !important; 
            box-shadow: 0 4px 10px rgba(255, 127, 63, 0.3) !important;
        }
        
        .react-datepicker__day--in-range { 
            background-color: rgba(255, 127, 63, 0.08) !important; 
            color: #FF7F3F !important; 
        }

        .react-datepicker__day:hover { border-radius: 12px !important; background-color: #f3f4f6 !important; }
        
        /* Adjusting for 2 months desktop view */
        @media (min-width: 768px) {
            .react-datepicker__month-container { width: 50% !important; float: left; }
        }
      `}</style>
        </div>
    );
};

export default BookingCalendar;

