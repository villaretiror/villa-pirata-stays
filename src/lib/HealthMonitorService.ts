import { createClient } from '@supabase/supabase-js';
import ical from 'node-ical';
import { NotificationService } from '../services/NotificationService.js';

/**
 * 🛠️ HEALTH MONITOR SERVICE (BACKEND)
 * Centraliza la verificación de iCals, DB y limpieza de bloqueos.
 * Cumple con la Directiva de Conectividad Total.
 */

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
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
     * Verifica la disponibilidad de los Feeds de iCal desde la Base de Datos
     */
    async checkICals() {
        const reports: any[] = [];
        
        // 🛰️ DIRECTIVA DE CONECTIVIDAD: Fetch properties from DB, not from constants
        const { data: dbProperties, error: pError } = await supabase
            .from('properties')
            .select('id, title, "calendarSync"');

        if (pError || !dbProperties) {
            console.error('[HealthMonitor] Error fetching properties for iCal check:', pError?.message);
            return [];
        }

        for (const property of dbProperties) {
            const syncFeeds = Array.isArray(property.calendarSync) ? property.calendarSync : [];
            if (syncFeeds.length === 0) continue;

            for (const sync of syncFeeds) {
                const start = Date.now();
                try {
                    if (!sync.url) continue;
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

        // 1. Fetch current health state to check previous failure counts
        const { data: previousHealth } = await supabase.from('system_health').select('service_name, consecutive_failures');
        const failureMap = new Map<string, number>(previousHealth?.map(h => [h.service_name, h.consecutive_failures || 0]) || []);

        for (const report of allReports) {
            try {
                const prevFailures = failureMap.get(report.service_name) || 0;
                const currentFailures = report.status === 'error' ? prevFailures + 1 : 0;

                const { error } = await supabase.from('system_health').upsert({
                    service_name: report.service_name,
                    status: report.status,
                    latency_ms: report.latency_ms,
                    error_details: report.error_details,
                    property_id: report.property_id,
                    metadata: report.metadata,
                    consecutive_failures: currentFailures,
                    last_check: new Date().toISOString()
                }, { onConflict: 'service_name' });

                if (error) console.error(`[HealthMonitor] Error upserting ${report.service_name}:`, error.message);

                // 🚨 TELEGRAM STRATEGIC ALERT: 3-Strike Rule (Threshold of 3 failures)
                if (report.status === 'error' && currentFailures === 3) {
                    const platform = report.metadata?.platform || 'Sistema';
                    const propertyTitle = report.metadata?.title || 'General';

                    await NotificationService.sendTelegramAlert(
                        `⚠️ <b>FALLO PERSISTENTE (3/3)</b>: La conexión con <b>${platform}</b> en <i>${propertyTitle}</i> ha fallado 3 veces consecutivas.\n\n` +
                        `<b>Error actual:</b> ${report.error_details || 'Fallo de timeout'}\n` +
                        `📅 <b>Última revisión:</b> ${new Date().toLocaleString()}\n\n` +
                        `Escalando a revisión técnica. <a href="https://villaretiror.com/host/dashboard">Ver Status</a>`
                    );
                }
            } catch (e: any) {
                console.error(`[HealthMonitor] Critical exception upserting ${report.service_name}:`, e.message);
                // Fail silently, don't crash the main thread
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
