import { HealthMonitorService } from '../src/lib/HealthMonitorService.js';

/**
 * 🍏 SYSTEM HEALTH ENDPOINT
 * Endpoint oficial para monitoreo 360° y auto-limpieza.
 * Este endpoint es llamado por el Dashboard del Host para garantizar salud del sistema.
 */

export const maxDuration = 30;

export default async function handler(req: any, res: any) {
    // Solo permitimos GET para monitoreo
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 1. SELF-HEALING: Limpiar bloqueos fantasmas
        const cleanupResult = await HealthMonitorService.clearPhantomBlocks();

        // 2. MONITORING: Verificar iCals y DB + Actualizar system_health
        const healthStatus = await HealthMonitorService.syncHealthToDB();

        return res.status(200).json({
            success: true,
            timestamp: new Date().toISOString(),
            healing: cleanupResult,
            system: healthStatus
        });
    } catch (error: any) {
        console.error('[HEALTH_CHECK_ROUTE_ERROR]:', error.message);
        return res.status(500).json({
            success: false,
            error: 'Error interno en el monitor de salud',
            details: error.message
        });
    }
}
