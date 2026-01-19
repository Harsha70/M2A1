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
exports.withExponentialBackoff = void 0;
const withExponentialBackoff = (fn, options) => __awaiter(void 0, void 0, void 0, function* () {
    let retries = 0;
    const { maxAttempts, baseDelay } = options;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        console.log(`----------------Attempt ${attempt + 1} of ${maxAttempts}`);
        try {
            return yield fn();
        }
        catch (error) {
            const isLastAttempt = attempt === maxAttempts - 1;
            console.log('Error code ------', error.code);
            const isRecoverable = !['P2002', 'P2025', 'P2026'].includes(error.code);
            // prisma unique constraint violation
            //record not found
            if (!isRecoverable || isLastAttempt) {
                throw error;
            }
            const delay = (baseDelay * Math.pow(2, attempt)) + Math.random() * 100;
            console.warn(`Retrying after ${delay}ms due to ${error.code}`);
            yield new Promise(resolve => setTimeout(resolve, delay));
        }
    }
});
exports.withExponentialBackoff = withExponentialBackoff;
