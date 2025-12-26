import { createCanvas, loadImage, registerFont } from 'canvas';
import { AttachmentBuilder } from 'discord.js';
import * as path from 'path';

export async function generateBirthdayImage(user: any, guild: any): Promise<AttachmentBuilder> {
    // Register Font
    try {
        const fontPath = path.join(__dirname, '../assets/GreatVibes-Regular.ttf');
        registerFont(fontPath, { family: 'GreatVibes' });
    } catch (e) {
        console.error("Failed to register font", e);
    }

    const width = 800; // Original image width
    const height = 600;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Load Background
    try {
        const bgPath = path.join(__dirname, '../assets/birthday_bg.png');
        const background = await loadImage(bgPath);
        ctx.drawImage(background, 0, 0, width, height);
    } catch (e) {
        console.error("Failed to load background:", e);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
    }

    ctx.textAlign = 'center';

    // 2. User Avatar (Top-Mid)
    const avatarSize = 100;
    const avatarX = (width / 2) - (avatarSize / 2);
    const avatarY = 5;

    // Draw Avatar
    try {
        const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256 });
        const avatar = await loadImage(avatarUrl);

        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();

        // Border
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#000000';
        ctx.stroke();
    } catch (e) { }

    // 3. Username
    // 3. Username & Text
    // Mask lower area to write custom text
    ctx.fillStyle = '#ffffff'; // Assuming white matches the background or we want a clean slate
    // If background is complex, this white box might look bad.
    // The previous code masked 200, 380, 400, 80.
    // We'll expand it slightly but try to keep it centered.
    ctx.fillRect(100, 360, 600, 200);

    // Text Settings
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';

    // Add "Highlight" (Glow/Shadow)
    ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // 1. "We wish you"
    ctx.font = '40px "GreatVibes"';
    ctx.fillText("We wish you", width / 2, 400);

    // 2. Name
    ctx.font = '70px "GreatVibes"';
    let name = user.username;
    if (name.length > 15) name = name.substring(0, 15) + '...';
    ctx.fillText(name, width / 2, 470);

    // 3. Guild Name
    if (guild) {
        ctx.font = '40px "GreatVibes"';
        ctx.fillText(guild.name, width / 2, 530);
    }

    // Reset shadow
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // 4. Guild Icon (Top Left)
    try {
        if (guild && guild.iconURL()) {
            const iconUrl = guild.iconURL({ extension: 'png', size: 128 });
            const icon = await loadImage(iconUrl);

            const iconSize = 80;
            const padding = 20;

            ctx.save();
            ctx.beginPath();
            ctx.arc(padding + iconSize / 2, padding + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(icon, padding, padding, iconSize, iconSize);
            ctx.restore();

            // Guild Border
            ctx.beginPath();
            ctx.arc(padding + iconSize / 2, padding + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#000000';
            ctx.stroke();
        }
    } catch (e) {
        console.error("Failed to load guild icon", e);
    }

    return new AttachmentBuilder(canvas.toBuffer(), { name: 'birthday.png' });
}
