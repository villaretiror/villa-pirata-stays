import { differenceInDays, parseISO, addDays, isValid } from 'date-fns';

/**
 * 🔱 DATE VALIDATOR (Sovereign Utility)
 * Handles all date integrity, night minimums, and horizon checks.
 */
export const DateValidator = {
    /**
     * Validates and normalizes check-in/out dates.
     */
    validateRange(checkIn: string, checkOut: string, minNights: number = 2): { 
        ok: boolean; 
        nights: number; 
        error?: string; 
        qIn: Date; 
        qOut: Date;
    } {
        const qIn = new Date(checkIn);
        const qOut = new Date(checkOut);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (!isValid(qIn) || !isValid(qOut)) {
            return { 
                ok: false, 
                nights: 0, 
                error: 'Mis brújulas no reconocen esas fechas. ¿Podría ser más específico?', 
                qIn, 
                qOut 
            };
        }

        const checkInDate = new Date(qIn);
        checkInDate.setHours(0, 0, 0, 0);

        if (checkInDate < today) {
            return { 
                ok: false, 
                nights: 0, 
                error: 'El tiempo fluye hacia adelante en el Caribe. Esa fecha ya ha pasado.', 
                qIn, 
                qOut 
            };
        }

        const diffTime = qOut.getTime() - qIn.getTime();
        const nights = Math.ceil(diffTime / (1000 * 3600 * 24));

        if (nights < minNights) {
            return { 
                ok: false, 
                nights, 
                error: `Esta estancia no cumple con el mínimo de ${minNights} noches requerido.`, 
                qIn, 
                qOut 
            };
        }

        return { ok: true, nights, qIn, qOut };
    },

    /**
     * Checks if a date is beyond the allowed booking window.
     */
    isBeyondWindow(checkIn: Date, windowMonths: number = 6): boolean {
        const windowDate = new Date();
        windowDate.setMonth(windowDate.getMonth() + windowMonths);
        return checkIn > windowDate;
    }
};
