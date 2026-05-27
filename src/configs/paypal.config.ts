import * as dotenv from 'dotenv';
import path from 'path';

const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = nodeEnv === 'production' ? '.env.production' : '.env.development';

dotenv.config({ path: path.resolve(process.cwd(), envFile) });

export const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID as string;
export const PAYPAL_APP_SECRET = process.env.PAYPAL_APP_SECRET as string;
export const PAYPAL_BASE_URL = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';