"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeMiddleware = void 0;
const logger_1 = require("./logger");
// console.log('logger----------------',logger);
const timeMiddleware = (name, middleware) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        const start = process.hrtime();
        const interceptedNext = () => {
            const diff = process.hrtime(start);
            const duration = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(3);
            logger_1.logger.info({
                type: 'middleware_perf',
                middleware: name,
                duration: `${duration}ms`,
            });
            next();
        };
        return middleware(req, res, interceptedNext);
    });
};
exports.timeMiddleware = timeMiddleware;
