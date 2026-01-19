"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.responseTimeNative = void 0;
const responseTimeNative = (req, res, next) => {
    const startHrTime = process.hrtime();
    const originalWriteHead = res.writeHead;
    res.writeHead = function (statusCode, statusMessage, headers) {
        const diff = process.hrtime(startHrTime);
        const timeInMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(3);
        res.setHeader('X-Response-Time', `${timeInMs}ms`);
        // console.log('statusCode, statusMessage, headers',statusCode, statusMessage, headers);
        return originalWriteHead.apply(this, arguments);
    };
    next();
};
exports.responseTimeNative = responseTimeNative;
