import React from 'react';
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";

interface PayPalPaymentProps {
    amount: number;
    onSuccess: (details: any) => void;
    onError: (error: any) => void;
}

const PayPalPayment: React.FC<PayPalPaymentProps> = ({ amount, onSuccess, onError }) => {
    const initialOptions = {
        clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || "test",
        currency: "USD",
        intent: "capture",
    };

    return (
        <div className="w-full">
            <PayPalScriptProvider options={initialOptions}>
                <PayPalButtons
                    style={{ layout: "vertical", shape: "pill", label: "pay" }}
                    createOrder={(data, actions) => {
                        return actions.order.create({
                            intent: "CAPTURE",
                            purchase_units: [
                                {
                                    amount: {
                                        currency_code: "USD",
                                        value: amount.toString(),
                                    },
                                },
                            ],
                        });
                    }}
                    onApprove={(data, actions) => {
                        if (actions.order) {
                            return actions.order.capture().then((details) => {
                                onSuccess(details);
                            });
                        }
                        return Promise.resolve();
                    }}
                    onError={(err) => {
                        onError(err);
                    }}
                />
            </PayPalScriptProvider>
        </div>
    );
};

export default PayPalPayment;
