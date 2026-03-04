import React from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { es } from 'date-fns/locale';

registerLocale('es', es);

interface BookingCalendarProps {
    startDate: Date | null;
    endDate: Date | null;
    onChange: (update: [Date | null, Date | null]) => void;
    blockedDates: Date[];
}

const BookingCalendar: React.FC<BookingCalendarProps> = ({ startDate, endDate, onChange, blockedDates }) => {
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
                    minDate={new Date()}
                    monthsShown={1}
                    inline
                    locale="es"
                    calendarClassName="luxury-calendar"
                />
            </div>

            <div className="flex justify-center gap-6 pt-2">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
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
        .react-datepicker__day-name { text-transform: uppercase !important; font-size: 10px !important; font-weight: 900 !important; color: #999 !important; }
        .react-datepicker__month-container { width: 100% !important; }
        .react-datepicker__day--disabled { color: #ddd !important; text-decoration: line-through !important; cursor: not-allowed !important; }
        .react-datepicker__day--selected, .react-datepicker__day--range-start, .react-datepicker__day--range-end { background-color: #EF4444 !important; border-radius: 14px !important; color: white !important; font-weight: bold !important; }
        .react-datepicker__day--in-range { background-color: rgba(239, 68, 68, 0.08) !important; color: #EF4444 !important; }
        .react-datepicker__day:hover { border-radius: 14px !important; background-color: #f3f4f6 !important; }
      `}</style>
        </div>
    );
};

export default BookingCalendar;
