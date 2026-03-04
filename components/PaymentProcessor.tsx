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

const PaymentProcessor: React.FC<PaymentProcessorProps> = ({ total, onSuccess, isProcessing, user }) => {
    const [paymentMethod, setPaymentMethod] = useState<'ath_movil' | 'paypal'>('ath_movil');
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleATHUpload = async () => {
        if (!screenshot) return null;
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
                        className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'paypal' ? 'border-primary bg-orange-50 scale-[1.02] shadow-sm' : 'border-gray-100 bg-white opacity-60'}`}
                    >
                        <div className="w-12 h-8 flex items-center justify-center">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" className="h-5" alt="PayPal" />
                        </div>
                        <p className="font-bold text-[10px] uppercase tracking-widest text-text-light">PayPal</p>
                    </button>
                    <button
                        onClick={() => setPaymentMethod('ath_movil')}
                        className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'ath_movil' ? 'border-orange-500 bg-orange-50 scale-[1.02] shadow-sm' : 'border-gray-100 bg-white opacity-60'}`}
                    >
                        <div className="w-12 h-8 flex items-center justify-center">
                            <span className="bg-[#FF6B35] text-white px-2 py-0.5 rounded-md font-black text-[10px] italic">ATH</span>
                        </div>
                        <p className="font-bold text-[10px] uppercase tracking-widest text-text-light">ATH Móvil</p>
                    </button>
                </div>
            </div>

            {paymentMethod === 'ath_movil' ? (
                <div className="bg-orange-50/50 p-5 rounded-[1.5rem] border border-orange-100 animate-slide-up">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                            <span className="material-icons text-orange-600 text-sm">info</span>
                        </div>
                        <p className="text-xs font-bold text-orange-800">Pago Directo a Villa Retiro R</p>
                    </div>

                    <div className="space-y-4 mb-5">
                        <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 opacity-5">
                                <span className="material-icons text-4xl">smartphone</span>
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-1">Total a enviar</p>
                            <p className="text-2xl font-black text-orange-600">${total}</p>
                            <p className="text-[10px] text-text-light mt-2 flex items-center gap-1">
                                <span className="material-icons text-[12px]">person</span>
                                A nombre de: <span className="font-bold text-text-main">Villa Retiro R</span>
                            </p>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 bg-white px-4 py-3 rounded-xl border border-orange-100 flex items-center justify-between">
                                <span className="text-sm font-black tracking-widest text-text-main">{HOST_PHONE}</span>
                                <button
                                    onClick={() => navigator.clipboard.writeText(HOST_PHONE)}
                                    className="text-orange-500 hover:text-orange-600 transition-colors"
                                >
                                    <span className="material-icons text-sm">content_copy</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <label className="block w-full cursor-pointer group">
                        <div className="w-full py-5 px-4 bg-white border-2 border-dashed border-orange-200 rounded-2xl flex flex-col items-center justify-center gap-2 group-hover:border-orange-400 group-hover:bg-orange-50 transition-all duration-300">
                            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span className="material-icons text-orange-500">photo_library</span>
                            </div>
                            <p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em]">
                                {screenshot ? screenshot.name : "Subir Captura del Recibo"}
                            </p>
                            <p className="text-[9px] text-orange-400">PDF, JPG o PNG (máx. 5MB)</p>
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
                    className={`w-full text-white font-black text-xs tracking-widest py-5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 ${isProcessing || isUploading || !screenshot ? 'bg-gray-300 cursor-not-allowed' : 'bg-black hover:bg-gray-900 active:scale-95'}`}
                >
                    {isProcessing || isUploading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <>
                            FINALIZAR RESERVA
                            <span className="material-icons text-sm">check_circle</span>
                        </>
                    )}
                </button>
            )}
        </div>
    );
};

export default PaymentProcessor;
