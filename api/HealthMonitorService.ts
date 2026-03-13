import { createClient } from '@supabase/supabase-js';
import ical from 'node-ical';
import { PROPERTIES } from '../constants.js';
import { NotificationService } from '../services/NotificationService.js';

/**
 * 🛠️ HEALTH MONITOR SERVICE (BACKEND)
 * Centraliza la verificación de iCals, DB y limpieza de bloqueos.
 * Cumple con la Directiva de Conectividad Total.
 */

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
);

export const HealthMonitorService = {
    /**
     * Verifica la latencia y estado de la conexión con Supabase
     */
    async checkDatabase() {
        const start = Date.now();
        try {
            const { error } = await supabase.from('properties').select('id').limit(1);
            if (error) throw error;
            return { status: 'healthy', latency: Date.now() - start };
        } catch (e: any) {
            return { status: 'error', latency: Date.now() - start, error: e.message };
        }
    },

    /**
     * Verifica la disponibilidad de los Feeds de iCal definidos en las constantes
     */
    async checkICals() {
        const reports: any[] = [];

        for (const property of PROPERTIES) {
            if (!property.calendarSync) continue;

            for (const sync of property.calendarSync) {
                const start = Date.now();
                try {
                    // Validamos que el feed sea accesible y contenga datos iCal válidos
                    const data = await ical.fromURL(sync.url);
                    const events = Object.values(data).filter(e => e && e.type === 'VEVENT');

                    reports.push({
                        service_name: `${sync.platform}_${property.id}`,
                        status: 'healthy',
                        latency_ms: Date.now() - start,
                        property_id: property.id,
                        metadata: {
                            platform: sync.platform,
                            events_count: events.length,
                            title: property.title
                        }
                    });
                } catch (e: any) {
                    reports.push({
                        service_name: `${sync.platform}_${property.id}`,
                        status: 'error',
                        latency_ms: Date.now() - start,
                        error_details: e.message,
                        property_id: property.id,
                        metadata: {
                            platform: sync.platform,
                            title: property.title
                        }
                    });
                }
            }
        }
        return reports;
    },

    /**
     * Ejecuta el monitoreo completo y lo persiste en la tabla system_health
     */
    async syncHealthToDB() {
        const dbReport = await this.checkDatabase();
        const icalReports = await this.checkICals();

        const allReports = [
            {
                service_name: 'Supabase_DB',
                status: dbReport.status,
                latency_ms: dbReport.latency,
                error_details: dbReport.error,
                property_id: null,
                metadata: { type: 'database' }
            },
            ...icalReports
        ];

        for (const report of allReports) {
            const { error } = await supabase.from('system_health').upsert({
                service_name: report.service_name,
                status: report.status,
                latency_ms: report.latency_ms,
                error_details: report.error_details,
                property_id: report.property_id,
                metadata: report.metadata,
                last_check: new Date().toISOString()
            }, { onConflict: 'service_name' });

            if (error) console.error(`[HealthMonitor] Error upserting ${report.service_name}:`, error.message);

            // 🚨 TELEGRAM CRITICAL ALERT: Notifica al Host si un canal clave falla
            if (report.status === 'error') {
                const platform = report.metadata?.platform || 'Sistema';
                const propertyTitle = report.metadata?.title || 'General';

                await NotificationService.sendTelegramAlert(
                    `⚠️ <b>ALERTA TÉCNICA</b>: Se ha perdido la conexión con <b>${platform}</b> en <i>${propertyTitle}</i>.\n\n` +
                    `<b>Error:</b> ${report.error_details || 'Fallo de timeout'}\n` +
                    `📅 <b>Fecha:</b> ${new Date().toLocaleString()}\n\n` +
                    `Revisa el Dashboard: <a href="https://villaretiror.com/host/dashboard">Abrir Control Center</a>`
                );
            }
        }

        return allReports;
    },

    /**
     * Limpia bloqueos temporales (holds) expirados.
     * Estos son creados por el AI Concierge durante la preventa.
     */
    async clearPhantomBlocks() {
        const now = new Date().toISOString();
        const { error, count } = await supabase
            .from('bookings')
            .delete()
            .eq('status', 'pending_ai_validation')
            .lt('hold_expires_at', now);

        if (error) {
            console.error('[HealthMonitor] Error en auto-limpieza:', error.message);
        } else if (count && count > 0) {
            console.log(`[HealthMonitor] Se liberaron ${count} bloqueos fantasmas.`);
        }

        return { success: !error, count: count || 0 };
    }
};
