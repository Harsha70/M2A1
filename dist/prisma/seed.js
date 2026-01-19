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
const client_1 = require("@prisma/client");
const adapter_better_sqlite3_1 = require("@prisma/adapter-better-sqlite3");
const adapter = new adapter_better_sqlite3_1.PrismaBetterSqlite3({
    url: "file:./dev.db"
});
const prisma = new client_1.PrismaClient({ adapter });
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        yield prisma.user.createMany({
            data: [
                { email: 'free@gmail.com', name: 'Free', apiKey: 'free_key_123', tier: 'free' },
                // { email: 'abc@gmail.com', name: 'ABC', apiKey: '123' },
                // { email: 'def@gmail.com', name: 'DEF', apiKey: '234' },
                // { email: 'ghi@gmail.com', name: 'GHI', apiKey: '345' },
                // { email: 'hobby@gmail.com', name: 'Hobby', apiKey: 'hobby_key_123', tier: 'hobby' },
                // { email: 'enterprise@gmail.com', name: 'Enterprise', apiKey: 'enterprise_key_456', tier: 'enterprise' },
            ]
        });
    });
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
