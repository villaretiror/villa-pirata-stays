import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from '../lib/SupabaseService';
import { HOST_PHONE } from '../constants';
import PayPalPayment from './PayPalPayment';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface PaymentProcessorProps {
    total: number;
    bookingId?: string;
    onSuccess: (status: string, proofUrl?: string, method?: string) => void;
    isProcessing: boolean;
    user: any;
    isTermsAccepted?: boolean;
}

const CheckoutForm: React.FC<{ onSuccess: any, total: number, isProcessing: boolean, isTermsAccepted?: boolean }> = ({ onSuccess, total, isProcessing, isTermsAccepted = true }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [localProcessing, setLocalProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!stripe || !elements) return;

        setLocalProcessing(true);
        setErrorMessage(null);

        window.dispatchEvent(new CustomEvent('salty-push', {
            detail: { message: "🔱 Asegurando tu pago en nuestra bóveda... ⚓", speak: false }
        }));

        const { error: submitError } = await elements.submit();
        if (submitError) {
            setErrorMessage(submitError.message || "Ha ocurrido un error inesperado.");
            setLocalProcessing(false);
            return;
        }

        try {
            // onSuccess gets hijacked to insert booking and fetch clientSecret securely
            const clientSecret = await onSuccess('pending_webhook', undefined, 'stripe');
            
            if (typeof clientSecret === 'string') {
                const { error: confirmError } = await stripe.confirmPayment({
                    elements,
                    clientSecret,
                    confirmParams: {
                        return_url: `${window.location.origin}/success`,
                    }
                });

                if (confirmError) {
                    setErrorMessage(confirmError.message || "Fallo confirmando el túnel de pago");
                    setLocalProcessing(false);
                }
            } else {
                setErrorMessage("Conexión a la Bóveda de V.R.R denegada. Reintente más tarde.");
                setLocalProcessing(false);
            }
        } catch (err) {
             setErrorMessage("Línea cortada con Stripe Gateway.");
             setLocalProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 animate-slide-up bg-white/40 pt-4 rounded-[2.5rem] border-transparent backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-2 px-2">
                <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-primary shadow-soft">
                    <span className="material-icons text-sm">lock</span>
                </div>
                <div>
                   <h3 className="font-bold text-xs uppercase tracking-wider text-text-light">Tarjeta de Crédito / Débito</h3>
                   <p className="text-[9px] text-gray-500 tracking-widest uppercase">Cifrado B2B por Stripe</p>
                </div>
            </div>

            <div className="p-4 bg-white rounded-3xl border border-primary/10 shadow-soft">
                <PaymentElement 
                    options={{
                        layout: 'tabs',
                    }} 
                />
            </div>
            
            {errorMessage && (
                <div className="text-[10px] font-black tracking-widest text-[#FF6B35] uppercase bg-[#FF6B35]/10 p-3 rounded-xl border border-[#FF6B35]/20">
                    {errorMessage}
                </div>
            )}

            <button
                type="submit"
                disabled={!stripe || isProcessing || localProcessing || !isTermsAccepted}
                className={`w-full font-black text-xs tracking-[0.2em] py-5 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 uppercase disabled:opacity-30 disabled:scale-100 disabled:cursor-not-allowed ${
                     localProcessing || isProcessing 
                     ? 'bg-secondary/80 text-primary cursor-wait' 
                     : 'bg-secondary text-primary hover:scale-[1.02] active:scale-95 border border-primary/20 hover:shadow-primary/20'
                }`}
            >
                {localProcessing || isProcessing ? (
                    <>
                        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                        VALIDANDO 🔱
                    </>
                ) : (
                    <>
                        FINALIZAR RESERVA DE ${total.toFixed(2)}
                        <span className="material-icons text-sm">check_circle</span>
                    </>
                )}
            </button>
            <div className="w-full text-center mt-4 animate-fade-in flex flex-col items-center gap-2">
               <p className="text-[10px] uppercase font-semibold tracking-[0.25em] text-text-main flex items-center justify-center gap-1.5 opacity-80">
                 <span className="material-icons text-xs text-[#0A192F]">lock</span>
                 Transacción encriptada y segura vía Stripe
               </p>
               <div className="flex justify-center opacity-40 grayscale hover:grayscale-0 transition-all hover:opacity-100">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" className="h-4" alt="Powered by Stripe" />
               </div>
            </div>
        </form>
    );
};

const PaymentProcessor: React.FC<PaymentProcessorProps> = ({ total, bookingId, onSuccess, isProcessing, user, isTermsAccepted }) => {
    const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'ath_movil' | 'paypal'>('stripe');
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [copied, setCopied] = useState(false);

    // 🛡️ INVETORY SHIELD: 15-Minute Block for ATH Móvil
    const activateTemporalBlock = async () => {
        if (!bookingId || bookingId === 'new') return;
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        await supabase.from('bookings').update({
            status: 'pending_ai_validation',
            payment_method: 'ath_movil',
            hold_expires_at: expiresAt
        }).eq('id', bookingId);
        
        window.dispatchEvent(new CustomEvent('salty-push', {
            detail: { message: "🔱 Capitán, hemos bloqueado las fechas por 15 min para tu reservación.", speak: false }
        }));
    };

    const handleCopyPhone = () => {
        const cleanPhone = HOST_PHONE.replace(/\D/g, '').replace(/^1/, '');
        navigator.clipboard.writeText(cleanPhone);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleATHUpload = async () => {
        if (!screenshot) return null;

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(screenshot.type)) {
            alert("⚠️ Formato inválido. Solo se permiten imágenes (.jpg, .png, .webp)");
            setScreenshot(null);
            return null;
        }

        const maxSize = 5 * 1024 * 1024;
        if (screenshot.size > maxSize) {
            alert("⚠️ Archivo demasiado grande. El límite es de 5MB.");
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
        
        if (bookingId && data.publicUrl) {
            await supabase.from('bookings').update({ 
                payment_proof_url: data.publicUrl,
                status: 'Paid'
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

    // Configuramos Stripe Elements con la Appearance API dictada por VRR
    const appearance = {
        theme: 'flat' as const,
        variables: {
            colorPrimary: '#997300',
            colorBackground: '#FDFCF0',
            colorText: '#333333',
            fontFamily: '"Playfair Display", serif',
            borderRadius: '16px',
            colorDanger: '#FF6B35',
            spacingUnit: '4px'
        },
        rules: {
            '.Tab': {
                border: '1px solid rgba(153, 115, 0, 0.2)',
                boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
            },
            '.Tab:hover': {
                color: '#997300',
            },
            '.Tab--selected': {
                borderColor: '#997300',
                boxShadow: '0px 4px 12px rgba(153, 115, 0, 0.15)',
            },
            '.Input': {
                padding: '12px 16px',
                border: '1px solid rgba(0, 0, 0, 0.05)',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
            },
            '.Input:focus': {
                borderColor: '#997300',
                boxShadow: '0px 0px 0px 2px rgba(153, 115, 0, 0.2)',
            }
        }
    };

    return (
        <div className="space-y-6 animate-fade-in w-full">
            <div className="space-y-3">
                <h3 className="font-bold text-sm uppercase tracking-wider text-text-light">Selecciona Método de Inversión</h3>
                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => setPaymentMethod('stripe')}
                        className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all ${paymentMethod === 'stripe' ? 'border-primary bg-primary/5 scale-[1.02] shadow-soft' : 'border-gray-100 bg-white opacity-60 hover:opacity-100 hover:border-primary/30'}`}
                    >
                        <div className="w-10 h-8 flex items-center justify-center text-primary">
                            <span className="material-icons">credit_card</span>
                        </div>
                        <p className="font-bold text-[9px] uppercase tracking-widest text-text-light text-center leading-tight">Tarjeta</p>
                    </button>
                    
                    <button
                        onClick={() => setPaymentMethod('paypal')}
                        className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all ${paymentMethod === 'paypal' ? 'border-primary bg-primary/5 scale-[1.02] shadow-soft' : 'border-gray-100 bg-white opacity-60 hover:opacity-100 hover:border-primary/30'}`}
                    >
                        <div className="w-10 h-8 flex items-center justify-center">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" className="h-4" alt="PayPal" />
                        </div>
                        <p className="font-bold text-[9px] uppercase tracking-widest text-text-light text-center leading-tight">PayPal</p>
                    </button>
                    
                    <button
                        onClick={() => { setPaymentMethod('ath_movil'); activateTemporalBlock(); }}
                        className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all ${paymentMethod === 'ath_movil' ? 'border-primary bg-primary/5 scale-[1.02] shadow-soft' : 'border-gray-100 bg-white opacity-60 hover:opacity-100 hover:border-primary/30'}`}
                    >
                        <div className="w-10 h-8 flex items-center justify-center">
                            <span className="bg-[#FF6B35] text-white px-2 py-0.5 rounded-md font-black text-[9px] italic">ATH</span>
                        </div>
                        <p className="font-bold text-[9px] uppercase tracking-widest text-text-light text-center leading-tight">ATH Móvil</p>
                    </button>
                </div>
            </div>

            {paymentMethod === 'stripe' && (
                <Elements 
                    stripe={stripePromise} 
                    options={{ 
                        mode: 'payment',
                        amount: Math.max(50, Math.round(total * 100)),
                        currency: 'usd',
                        appearance,
                        paymentMethodCreation: 'manual'
                    }}
                >
                    <CheckoutForm 
                        onSuccess={onSuccess} 
                        total={total} 
                        isProcessing={isProcessing} 
                        isTermsAccepted={isTermsAccepted} 
                    />
                </Elements>
            )}

            {paymentMethod === 'ath_movil' && (
                <div className="bg-primary/5 p-5 rounded-[1.5rem] border border-primary/10 animate-slide-up">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                            <span className="material-icons text-primary text-xs">account_balance_wallet</span>
                        </div>
                        <p className="text-xs font-bold text-secondary leading-tight">Transferencia ATH Móvil</p>
                    </div>

                    <div className="space-y-4 mb-5">
                        <div className="bg-white p-5 rounded-3xl border border-primary/10 shadow-soft relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:rotate-12 transition-transform">
                                <span className="material-icons text-6xl text-secondary">qr_code_2</span>
                            </div>

                            <div className="space-y-4 relative z-10">
                                <div>
                                    <p className="text-[9px] font-semibold uppercase tracking-[0.25em] opacity-80 text-primary mb-1 leading-none">Número de Transferencia</p>
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
                                    <p className="text-[9px] font-semibold uppercase tracking-[0.25em] opacity-80 text-primary mb-1 leading-none">A nombre de</p>
                                    <p className="text-sm font-bold text-slate-700">Villa Retiro R</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-secondary text-white p-5 rounded-3xl shadow-xl relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent p-5"></div>
                            <div className="relative z-10 flex justify-between items-center">
                                <div>
                                    <p className="text-[9px] font-semibold uppercase tracking-[0.25em] opacity-80 text-white/40 mb-1">Inversión Total</p>
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

                    <button
                        onClick={handleManualConfirm}
                        disabled={isProcessing || isUploading || !screenshot || !isTermsAccepted}
                        className={`w-full font-black text-xs tracking-widest py-5 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 mt-5 ${isProcessing || isUploading || !screenshot || !isTermsAccepted ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-30 shadow-none' : 'bg-secondary text-primary hover:scale-[1.02] active:scale-95 border border-primary/20'}`}
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
                </div>
            )}

            {paymentMethod === 'paypal' && (
                <div className="animate-fade-in p-2 bg-white/40 rounded-[2.5rem] border border-primary/10 shadow-soft">
                    <div className={!isTermsAccepted ? 'opacity-20 pointer-events-none grayscale' : ''}>
                        <PayPalPayment
                            amount={total}
                            onSuccess={(details) => onSuccess('confirmed', undefined, 'paypal')}
                            onError={(err) => alert("Error en PayPal: " + err)}
                        />
                    </div>
                    <p className="text-[9px] text-center text-text-light mb-4 uppercase tracking-widest opacity-60">
                        Confirmación Instantánea vía PayPal Secure Gateway
                    </p>
                </div>
            )}
        </div>
    );
};

export default PaymentProcessor;
