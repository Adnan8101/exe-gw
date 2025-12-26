import { createCanvas, registerFont } from 'canvas';
import * as path from 'path';

export async function generateCaptcha() {
    const width = 400;
    const height = 150;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#23272A';
    ctx.fillRect(0, 0, width, height);
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous characters (I, 1, O, 0)
    let text = '';
    for (let i = 0; i < 6; i++) {
        text += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    for (let i = 0; i < 20; i++) {
        ctx.strokeStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.5)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(Math.random() * width, Math.random() * height);
        ctx.lineTo(Math.random() * width, Math.random() * height);
        ctx.stroke();
    }

    // Noise (Dots)
    for (let i = 0; i < 100; i++) {
        ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.8)`;
        ctx.beginPath();
        ctx.arc(Math.random() * width, Math.random() * height, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // Text
    ctx.font = 'bold 60px Sans';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw each char with rotation
    const charWidth = width / 8;
    for (let i = 0; i < text.length; i++) {
        ctx.save();
        ctx.translate(60 + i * 50, height / 2);
        ctx.rotate((Math.random() - 0.5) * 0.4); // Random rotation
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text[i], 0, 0);
        ctx.restore();
    }

    return {
        buffer: canvas.toBuffer(),
        text: text
    };
}
