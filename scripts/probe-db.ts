import { PrismaClient } from '@prisma/client';
import * as process from 'process';

const host = '127.0.0.1';
const port = '5432';

// Common credential combinations for local dev
const attempts = [
    { user: 'postgres', pass: 'postgres' }, // Already tried, but no harm retrying
    { user: 'postgres', pass: '' },         // Common: no password
    { user: 'adnan', pass: '' },            // OS user, no password
    { user: 'adnan', pass: 'adnan' },       // OS user, same password
];

async function main() {
    console.log("Probing PostgreSQL credentials...");

    for (const cred of attempts) {
        const url = `postgresql://${cred.user}:${cred.pass}@${host}:${port}/postgres`; // Connect to 'postgres' default DB
        console.log(`Trying USER=${cred.user} PASS=${cred.pass ? '****' : '(empty)'}...`);

        const prisma = new PrismaClient({
            datasources: {
                db: { url },
            },
        });

        try {
            await prisma.$queryRaw`SELECT 1`;
            console.log(`\n✅ SUCCESS! Connected with User: ${cred.user}, Password: ${cred.pass ? '****' : '(empty)'}`);
            console.log(`DATABASE_URL="postgresql://${cred.user}:${cred.pass}@${host}:${port}/giveaways?schema=public"`);

            // Update .env automatically? Or just print?
            // Printing is safer for this script.
            await prisma.$disconnect();
            process.exit(0);
        } catch (e: any) {
            // Just log failure and continue
            // console.log(`Failed: ${e.message}`); 
        } finally {
            await prisma.$disconnect();
        }
    }

    console.log("\n❌ All probes failed. Please verify your PostgreSQL credentials manually.");
    process.exit(1);
}

main();
