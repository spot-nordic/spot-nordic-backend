import { PAYPAL_CLIENT_ID, PAYPAL_APP_SECRET, PAYPAL_BASE_URL } from '../configs/paypal.config';

export const generatePayPalAccessToken = async (): Promise<string> => {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_APP_SECRET}`).toString('base64');
    
    const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
        method: 'POST',
        body: 'grant_type=client_credentials',
        headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    });

    const data = (await response.json()) as any;
    
    if (!response.ok) {
        throw new Error(data.error_description || 'Failed to generate PayPal access token');
    }
    
    return data.access_token;
};

export const createPayPalOrder = async (amount: number, receipt: string | number) => {
    const accessToken = await generatePayPalAccessToken();
    
    const payload = {
        intent: 'CAPTURE',
        purchase_units: [
            {
                reference_id: receipt.toString(), 
                amount: {
                    currency_code: 'USD', 
                    value: amount.toFixed(2), 
                },
            },
        ],
    };

    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
    });

    const data = (await response.json()) as any;
    
    if (!response.ok) {
        throw new Error(data.message || 'Failed to create PayPal order');
    }
    
    return data;
};

export const verifyAndCapturePayPalOrder = async (orderId: string): Promise<boolean> => {
    try {
        const accessToken = await generatePayPalAccessToken();
        
        const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const data = (await response.json()) as any;
        
        if (!response.ok) {
            return false;
        }
        
        return data.status === 'COMPLETED';
    } catch (error) {
        return false;
    }
};