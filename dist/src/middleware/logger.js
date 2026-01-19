"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
require("winston-daily-rotate-file");
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json());
const transport = new winston_1.default.transports.DailyRotateFile({
    filename: 'logs/shortener-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '10m',
    maxFiles: '14d'
});
exports.logger = winston_1.default.createLogger({
    format: logFormat,
    transports: [transport, new winston_1.default.transports.Console()
    ]
});
const logMiddleware = (req, res, next) => {
    const start = process.hrtime();
    res.on('finish', () => {
        const diff = process.hrtime(start);
        const duration = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(3);
        const payload = {
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            statusCode: res.statusCode,
            duration: `${duration}ms`
        };
        if (payload.statusCode >= 500) {
            exports.logger.error(`HTTP 500: ${payload.method} ${payload.url}`, { extra: payload });
        }
        else if (payload.statusCode >= 400) {
            console.log(payload);
            exports.logger.warn(`HTTP ${payload.statusCode}: ${payload.method} ${payload.url}`, { extra: payload });
        }
        else {
            exports.logger.info(`HTTP ${payload.statusCode}: ${payload.method} ${payload.url}`, { extra: payload });
        }
    });
    next();
};
exports.default = logMiddleware;
