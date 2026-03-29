import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { HOST_PHONE } from '../constants';
import PayPalPayment from './PayPalPayment';

interface PaymentProcessorProps {
    total: number;
    bookingId?: string; // Reservar ID si ya se creó, o pasarlo después
    onSuccess: (status: string, proofUrl?: string, method?: string) => void;
    isProcessing: boolean;
    user: any;
}

const PaymentProcessor: React.FC<PaymentProcessorProps> = ({ total, bookingId, onSuccess, isProcessing, user }) => {
    const [paymentMethod, setPaymentMethod] = useState<'ath_movil' | 'paypal'>('ath_movil');
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [copied, setCopied] = useState(false);

    // 🛡️ INVETORY SHIELD: 15-Minute Block for ATH Móvil
    const activateTemporalBlock = async () => {
        if (!bookingId || bookingId === 'new') return;
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        await supabase.from('bookings').update({
            status: 'pending_verification',
            payment_method: 'ath_movil',
            hold_expires_at: expiresAt
        }).eq('id', bookingId);
        
        window.dispatchEvent(new CustomEvent('salty-push', {
            detail: { message: "🔱 Capitán, hemos bloqueado las fechas por 15 min para tu pago.", type: 'success' }
        }));
    };

    const handleCopyPhone = () => {
        // We clean the phone for ATH Movil (no hyphens, no leading 1 if present)
        const cleanPhone = HOST_PHONE.replace(/\D/g, '').replace(/^1/, '');
        navigator.clipboard.writeText(cleanPhone);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleATHUpload = async () => {
        if (!screenshot) return null;

        // 1. Validación de Tipo
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(screenshot.type)) {
            alert("⚠️ Formato inválido. Solo se permiten imágenes (.jpg, .png, .webp)");
            setScreenshot(null);
            return null;
        }

        // 2. Validación de Tamaño (5MB)
        const maxSize = 5 * 1024 * 1024;
        if (screenshot.size > maxSize) {
            alert("⚠️ Archivo demasiado grande. El límite es de 5MB. Por favor, toma una captura de pantalla (screenshot) más pequeña.");
            setScreenshot(null);
            return null;
        }

        setIsUploading(true);
        const fileExt = screenshot.name.split('.').pop();
        const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
        const filePath = `receipts/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('payments')
            .upload(filePath, screenshot);

        if (uploadError) {
            alert("Error subiendo el comprobante: " + uploadError.message);
            setIsUploading(false);
            return null;
        }

        const { data } = supabase.storage.from('payments').getPublicUrl(filePath);
        
        // 🛡️ COO SAFEGUARD: Vincular recibo a la reserva
        if (bookingId && data.publicUrl) {
            await supabase.from('bookings').update({ 
                payment_proof_url: data.publicUrl,
                status: 'pending_ai_validation' // Salty o el Host podrán validarlo
            }).eq('id', bookingId);
        }

        setIsUploading(false);
        return data.publicUrl;
    };

    const handleManualConfirm = async () => {
        if (paymentMethod === 'ath_movil' && !screenshot) {
            alert("Por favor, sube una captura de pantalla de tu pago por ATH Móvil.");
            return;
        }

        let proofUrl = undefined;
        if (paymentMethod === 'ath_movil') {
            proofUrl = await handleATHUpload();
            if (!proofUrl) return;
        }

        onSuccess('waiting_approval', proofUrl || undefined, 'ath_movil');
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="space-y-3">
                <h3 className="font-bold text-sm uppercase tracking-wider text-text-light">¿Cómo prefieres pagar?</h3>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setPaymentMethod('paypal')}
                        className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'paypal' ? 'border-primary bg-primary/5 scale-[1.02] shadow-sm' : 'border-gray-100 bg-white opacity-60'}`}
                    >
                        <div className="w-12 h-8 flex items-center justify-center">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" className="h-5" alt="PayPal" />
                        </div>
                        <p className="font-bold text-[10px] uppercase tracking-widest text-text-light">PayPal</p>
                    </button>
                    <button
                        onClick={() => { setPaymentMethod('ath_movil'); activateTemporalBlock(); }}
                        className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'ath_movil' ? 'border-primary bg-primary/5 scale-[1.02] shadow-sm' : 'border-gray-100 bg-white opacity-60'}`}
                    >
                        <div className="w-12 h-8 flex items-center justify-center">
                            <span className="bg-[#FF6B35] text-white px-2 py-0.5 rounded-md font-black text-[10px] italic">ATH</span>
                        </div>
                        <p className="font-bold text-[10px] uppercase tracking-widest text-text-light">ATH Móvil</p>
                    </button>
                </div>
            </div>

            {paymentMethod === 'ath_movil' ? (
                <div className="bg-primary/5 p-5 rounded-[1.5rem] border border-primary/10 animate-slide-up">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                            <span className="material-icons text-primary text-xs">account_balance_wallet</span>
                        </div>
                        <p className="text-xs font-bold text-secondary leading-tight">Transferencia ATH Móvil</p>
                    </div>

                    <div className="space-y-4 mb-5">
                        {/* Information Card */}
                        <div className="bg-white p-5 rounded-3xl border border-primary/10 shadow-soft relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:rotate-12 transition-transform">
                                <span className="material-icons text-6xl text-secondary">qr_code_2</span>
                            </div>

                            <div className="space-y-4 relative z-10">
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-1 leading-none">Número de Transferencia</p>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xl font-black text-secondary tracking-tighter">787-356-0895</p>
                                        <button
                                            onClick={handleCopyPhone}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black transition-all ${copied ? 'bg-green-500 text-white' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                                        >
                                            <span className="material-icons text-xs">{copied ? 'done' : 'content_copy'}</span>
                                            {copied ? '¡COPIADO!' : 'COPIAR'}
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-primary/20">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-1 leading-none">A nombre de</p>
                                    <p className="text-sm font-bold text-slate-700">Villa Retiro R</p>
                                </div>
                            </div>
                        </div>

                        {/* Amount Card */}
                        <div className="bg-secondary text-white p-5 rounded-3xl shadow-xl relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent p-5"></div>
                            <div className="relative z-10 flex justify-between items-center">
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Inversión Total</p>
                                    <p className="text-2xl font-black tracking-tight text-primary">${total}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[8px] font-black text-primary uppercase tracking-widest leading-none mb-1">Instrucción</p>
                                    <p className="text-[10px] font-medium text-white/80 leading-tight">Usa la opción <span className="text-primary font-bold">Transferir</span></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <label className="block w-full cursor-pointer group">
                        <div className="w-full py-5 px-4 bg-white border-2 border-dashed border-primary/20 rounded-2xl flex flex-col items-center justify-center gap-2 group-hover:border-primary group-hover:bg-primary/5 transition-all duration-300">
                            <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span className="material-icons text-primary">photo_library</span>
                            </div>
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                                {screenshot ? screenshot.name : "Subir Captura del Recibo"}
                            </p>
                            <p className="text-[9px] text-primary/40">PDF, JPG o PNG (máx. 5MB)</p>
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                        />
                    </label>
                </div>
            ) : (
                <div className="animate-fade-in p-2">
                    <PayPalPayment
                        amount={total}
                        onSuccess={(details) => onSuccess('confirmed', undefined, 'paypal')}
                        onError={(err) => alert("Error en PayPal: " + err)}
                    />
                    <p className="text-[9px] text-center text-text-light mt-4 uppercase tracking-widest opacity-60">
                        Confirmación Instantánea vía PayPal Secure Gateway
                    </p>
                </div>
            )}

            {paymentMethod === 'ath_movil' && (
                <button
                    onClick={handleManualConfirm}
                    disabled={isProcessing || isUploading || !screenshot}
                    className={`w-full font-black text-xs tracking-widest py-5 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 ${isProcessing || isUploading || !screenshot ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-secondary text-primary hover:scale-[1.02] active:scale-95 border border-primary/20'}`}
                >
                    {isProcessing || isUploading ? (
                        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    ) : (
                        <>
                            FINALIZAR RESERVA 🔱
                            <span className="material-icons text-sm">check_circle</span>
                        </>
                    )}
                </button>
            )}
        </div>
    );
};

export default PaymentProcessor;
