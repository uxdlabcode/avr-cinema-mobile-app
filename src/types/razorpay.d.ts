interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description?: string;
    order_id: string;
    prefill?: {
        name?: string;
        email?: string;
        contact?: string;
    };
    notes?: Record<string, any>;
    theme?: {
        color?: string;
        hide_topbar?: boolean;
    };
    modal?: {
        ondismiss?: () => void;
        confirm_close?: boolean;
        escape?: boolean;
    };
    handler?: (response: any) => void;
}

interface RazorpayInstance {
    open: () => void;
    on: (event: string, callback: (response: any) => void) => void;
}

interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
}