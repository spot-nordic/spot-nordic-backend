import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectRedis } from './configs/redis.config';
import { setupSocket } from './configs/socket.config';
import { errorHandler } from './middlewares/error.middleware';
import { logger } from './utils/logger';

import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import publicRoutes from './routes/public.routes';
import sharedRoutes from './routes/shared.routes';

const app = express();

app.set('trust proxy', 1);

const httpServer = http.createServer(app);

const io = setupSocket(httpServer);
app.set('io', io);

app.use(morgan('dev', {
    stream: {
        write: (message) => logger.info(message.trim())
    }
}));

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
    maxAge: 86400
}));

app.use(helmet({
    crossOriginResourcePolicy: false,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/shared', sharedRoutes);

app.use(errorHandler);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5001;

const startServer = async () => {
    try {
        await connectRedis();
        
        httpServer.listen(PORT, '0.0.0.0', () => {
            logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();