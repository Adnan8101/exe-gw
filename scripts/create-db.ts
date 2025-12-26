import { PrismaClient } from '@prisma/client';
import * as process from 'process';

const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/giveaways?schema=public";
// Extract credentials and host, but switch DB to 'postgres' (default) to perform administrative creation
const adminUrl = databaseUrl.replace(/\/giveaways(\?.*)?$/, '/postgres$1');

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: adminUrl,
        },
    },
});

async function main() {
    console.log(`Connecting to admin DB at ${adminUrl}...`);
    try {
        // Try to query to verify connection
        await prisma.$queryRaw`SELECT 1`;
        console.log("Connected to 'postgres' database successfully.");

        // Check if database exists
        const result: any[] = await prisma.$queryRaw`SELECT 1 FROM pg_database WHERE datname = 'giveaways'`;
        if (result.length > 0) {
            console.log("Database 'giveaways' already exists.");
        } else {
            console.log("Creating database 'giveaways'...");
            // CREATE DATABASE cannot run in a transaction block, so we might need a separate connection or simple execute
            // Prisma executeRaw might wrap in tx? Usually not for top level.
            // But acts weird with CREATE DATABASE.
            // Actually standard Prisma Client cannot run CREATE DATABASE usually because it connects to a DB.
            // But we are connected to 'postgres'.
            await prisma.$executeRawUnsafe(`CREATE DATABASE giveaways`);
            console.log("Database 'giveaways' created successfully!");
        }
    } catch (e) {
        console.error("Failed to connect or create database.");
        console.error("Error details:", e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
