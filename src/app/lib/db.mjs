import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/email_agent';

if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
        };

        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
            return mongoose;
        });
    }
    cached.conn = await cached.promise;
    return cached.conn;
}

// --- Models ---

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    accessToken: String,
    refreshToken: String,
    accessTokenExpires: Number,
    lastSeen: { type: Date, default: Date.now },
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model('User', UserSchema);

const EmailLogSchema = new mongoose.Schema({
    messageId: { type: String, required: true, unique: true },
    threadId: String,
    userEmail: String,
    subject: String,
    from: String,
    snippet: String,
    processedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['received', 'analyzing', 'processed', 'replied', 'skipped', 'error'], default: 'received' },
    emailType: { type: String, enum: ['incoming', 'automated_reply', 'manual_reply'], default: 'incoming' },
    finalDecision: String,
    reason: String,
    analysisResult: mongoose.Schema.Types.Mixed,
    replySent: { type: Boolean, default: false },
    replyError: String,
    attachments: [{
        originalName: String,
        mimeType: String,
        size: Number,
        localPath: String,
    }]
}, { timestamps: true });

export const EmailLog = mongoose.models.EmailLog || mongoose.model('EmailLog', EmailLogSchema);

const AppStateSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

export const AppState = mongoose.models.AppState || mongoose.model('AppState', AppStateSchema);

const NotificationSchema = new mongoose.Schema({
    userEmail: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: 'info' }, // 'info', 'success', 'warning', 'error'
    isRead: { type: Boolean, default: false },
    relatedId: String,
    metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

export const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
