"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.blacklistMiddleware = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const blacklistPath = path_1.default.join(__dirname, 'blacklist.json');
const defaultBlacklist = {
    blockedKeys: [
        "notorious_key_123",
        "bot_attacker_999",
        "spam_user_abc"
    ]
};
if (!fs_1.default.existsSync(blacklistPath)) {
    fs_1.default.writeFileSync(blacklistPath, JSON.stringify(defaultBlacklist, null, 2), 'utf-8');
    console.log('Created blacklist.json with default keys');
}
else {
    console.log('blacklist.json already exists');
}
const blacklist = JSON.parse(fs_1.default.readFileSync(blacklistPath, 'utf-8'));
const blacklistMiddleware = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey)
        return next();
    try {
        if (blacklist.blockedKeys.includes(apiKey)) {
            return res.status(403).json({ error: "API key is blacklisted" });
        }
        next();
    }
    catch (error) {
        console.error("Blacklist error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
exports.blacklistMiddleware = blacklistMiddleware;
