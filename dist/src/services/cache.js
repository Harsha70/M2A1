"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = void 0;
const redirectCache = {};
exports.cacheService = {
    get: (code) => redirectCache[code],
    set: (code, entry) => {
        redirectCache[code] = entry;
    },
    clear: () => {
        for (const key in redirectCache)
            delete redirectCache[key];
    }
};
