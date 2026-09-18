import * as THREE from 'three';
import { cachedTexture, makeCanvas, toTexture } from './shared';

/** Shared track map — high-detail Tanki Online style tread pattern (1 link per 512px tile). */
export function trackTexture(): THREE.CanvasTexture {
  return cachedTexture('track', () => {
    const S = 512;
    const { c, ctx } = makeCanvas(S);

    // 1. Deep cast-steel background
    ctx.fillStyle = '#101318';
    ctx.fillRect(0, 0, S, S);

    // 2. Inter-link joint gap across tile wrap seam (y = 0 and y = S)
    // Deep ambient occlusion shadow between links
    ctx.fillStyle = '#050709';
    ctx.fillRect(0, 0, S, 22);
    ctx.fillRect(0, S - 22, S, 22);

    // Steel hinge pin cylinder running horizontally through the joint
    const pinGradTop = ctx.createLinearGradient(0, 0, 0, 18);
    pinGradTop.addColorStop(0, '#1c222b');
    pinGradTop.addColorStop(0.5, '#2e3846');
    pinGradTop.addColorStop(1, '#0e1217');
    ctx.fillStyle = pinGradTop;
    ctx.fillRect(40, 2, S - 80, 16);

    const pinGradBot = ctx.createLinearGradient(0, S - 18, 0, S);
    pinGradBot.addColorStop(0, '#0e1217');
    pinGradBot.addColorStop(0.5, '#2e3846');
    pinGradBot.addColorStop(1, '#1c222b');
    ctx.fillStyle = pinGradBot;
    ctx.fillRect(40, S - 18, S - 80, 16);

    // 3. Main steel shoe body (y = 22 .. S - 22, height = 468px)
    const shoeGrad = ctx.createLinearGradient(0, 22, 0, S - 22);
    shoeGrad.addColorStop(0, '#262f3c');
    shoeGrad.addColorStop(0.12, '#202732');
    shoeGrad.addColorStop(0.5, '#1b2029');
    shoeGrad.addColorStop(0.88, '#202732');
    shoeGrad.addColorStop(1, '#171c23');
    ctx.fillStyle = shoeGrad;
    ctx.fillRect(0, 22, S, S - 44);

    // Top and bottom bevel highlights along the shoe plate edges (worn metal)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.fillRect(0, 22, S, 4);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.fillRect(0, S - 26, S, 4);

    // 4. Outer track pin connectors (end caps / links on left & right borders)
    const pinW = 56;
    // Left end-connector block
    ctx.fillStyle = '#2b3442';
    ctx.fillRect(0, 22, pinW, S - 44);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.fillRect(0, 22, pinW, 4);
    ctx.fillRect(pinW - 3, 22, 3, S - 44);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, S - 26, pinW, 4);

    // Right end-connector block
    ctx.fillStyle = '#2b3442';
    ctx.fillRect(S - pinW, 22, pinW, S - 44);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.fillRect(S - pinW, 22, pinW, 4);
    ctx.fillRect(S - pinW, 22, 3, S - 44);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(S - pinW, S - 26, pinW, 4);

    // Massive central track pin heads / bolts
    const drawPinBolt = (cx: number, cy: number, r: number) => {
      // Socket shadow
      ctx.fillStyle = '#090b0e';
      ctx.beginPath();
      ctx.arc(cx, cy + 2, r + 3, 0, Math.PI * 2);
      ctx.fill();

      // Bolt body
      const boltGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r);
      boltGrad.addColorStop(0, '#64748b');
      boltGrad.addColorStop(0.5, '#475569');
      boltGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = boltGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Specular highlight spot
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(cx - r * 0.35, cy - r * 0.35, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    };

    drawPinBolt(pinW * 0.5, S * 0.5, 14);
    drawPinBolt(S - pinW * 0.5, S * 0.5, 14);

    // Secondary locking rivets on end connectors
    drawPinBolt(pinW * 0.5, S * 0.20, 7);
    drawPinBolt(pinW * 0.5, S * 0.80, 7);
    drawPinBolt(S - pinW * 0.5, S * 0.20, 7);
    drawPinBolt(S - pinW * 0.5, S * 0.80, 7);

    // 5. Central guide horn (гребень зацепления с опорными катками)
    const hornX = 224;
    const hornW = 64;
    // Ambient occlusion shadow beside horn
    ctx.fillStyle = '#080a0d';
    ctx.fillRect(hornX - 8, 22, hornW + 16, S - 44);

    // Horn body
    const hornGrad = ctx.createLinearGradient(hornX, 0, hornX + hornW, 0);
    hornGrad.addColorStop(0, '#1e252f');
    hornGrad.addColorStop(0.2, '#3b4554');
    hornGrad.addColorStop(0.5, '#505d72');
    hornGrad.addColorStop(0.8, '#3b4554');
    hornGrad.addColorStop(1, '#1e252f');
    ctx.fillStyle = hornGrad;
    ctx.fillRect(hornX, 24, hornW, S - 48);

    // Horn top ridge highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillRect(hornX + 26, 24, 12, S - 48);

    // 6. Recessed lightening / mud pockets on left & right shoe wings
    ctx.fillStyle = '#0c0f14';
    ctx.fillRect(pinW + 12, 40, hornX - pinW - 24, 70);
    ctx.fillRect(pinW + 12, 215, hornX - pinW - 24, 70);
    ctx.fillRect(pinW + 12, 395, hornX - pinW - 24, 70);

    ctx.fillRect(hornX + hornW + 12, 40, S - pinW - (hornX + hornW) - 24, 70);
    ctx.fillRect(hornX + hornW + 12, 215, S - pinW - (hornX + hornW) - 24, 70);
    ctx.fillRect(hornX + hornW + 12, 395, S - pinW - (hornX + hornW) - 24, 70);

    // 7. Bold Chevron Tread Cleats (шевроны грунтозацепов — канон Tanki Online)
    // Two high-profile chevron bars per shoe for maximum contrast and 3D depth
    const drawChevronBar = (apexY: number, baseY: number) => {
      ctx.lineCap = 'round';

      // Drop shadow underneath chevrons
      ctx.lineWidth = 26;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.88)';
      ctx.beginPath();
      // Left chevron wing
      ctx.moveTo(pinW + 10, baseY + 4);
      ctx.lineTo(hornX - 6, apexY + 4);
      // Right chevron wing
      ctx.moveTo(S - pinW - 10, baseY + 4);
      ctx.lineTo(hornX + hornW + 6, apexY + 4);
      ctx.stroke();

      // Raised steel chevron cleat body
      ctx.lineWidth = 22;
      ctx.strokeStyle = '#2b3543';
      ctx.beginPath();
      ctx.moveTo(pinW + 10, baseY);
      ctx.lineTo(hornX - 6, apexY);
      ctx.moveTo(S - pinW - 10, baseY);
      ctx.lineTo(hornX + hornW + 6, apexY);
      ctx.stroke();

      // Heavy worn metal specular ridge on crest
      ctx.lineWidth = 7;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.52)';
      ctx.beginPath();
      ctx.moveTo(pinW + 12, baseY - 2);
      ctx.lineTo(hornX - 8, apexY - 2);
      ctx.moveTo(S - pinW - 12, baseY - 2);
      ctx.lineTo(hornX + hornW + 8, apexY - 2);
      ctx.stroke();
    };

    // Upper chevron pair (swept forward into the direction of travel)
    drawChevronBar(130, 200);
    // Lower chevron pair
    drawChevronBar(310, 380);

    // 8. Crisp edge contrast (clean comic tracks without dirty grit noise)
    return toTexture(c, 1);
  });
}

/** Camo is keyed by its palette; crisp comic panel layout with ink seams and rivets. */
export function camoTexture(base: string, dark: string, light: string): THREE.CanvasTexture {
  return cachedTexture(`camo:${base}:${dark}:${light}`, () => {
    const S = 256;
    const { c, ctx } = makeCanvas(S);

    // 1. Clean, vibrant base coat
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, S, S);

    // 2. Bold geometric comic camouflage panels
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(0, 40);
    ctx.lineTo(90, 0);
    ctx.lineTo(160, 50);
    ctx.lineTo(80, 120);
    ctx.lineTo(0, 90);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(140, 160);
    ctx.lineTo(256, 110);
    ctx.lineTo(256, 210);
    ctx.lineTo(190, 256);
    ctx.lineTo(110, 230);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.moveTo(180, 0);
    ctx.lineTo(256, 0);
    ctx.lineTo(256, 70);
    ctx.lineTo(150, 60);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, 160);
    ctx.lineTo(80, 180);
    ctx.lineTo(60, 256);
    ctx.lineTo(0, 256);
    ctx.closePath();
    ctx.fill();

    // 3. Crisp comic ink panel seams
    ctx.strokeStyle = '#10141a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'square';
    ctx.beginPath();
    ctx.moveTo(0, 128);
    ctx.lineTo(256, 128);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(128, 0);
    ctx.lineTo(128, 256);
    ctx.stroke();

    // 4. Subtle inner plate highlight along panel borders (comic cell edge)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(2, 2);
    ctx.lineTo(126, 2);
    ctx.lineTo(126, 126);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(130, 130);
    ctx.lineTo(254, 130);
    ctx.lineTo(254, 254);
    ctx.stroke();

    // 5. Stylized comic corner rivets
    const drawRivet = (x: number, y: number) => {
      ctx.fillStyle = '#0a0d12';
      ctx.beginPath();
      ctx.arc(x, y + 1, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#4a5568';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x - 1, y - 1, 1, 0, Math.PI * 2);
      ctx.fill();
    };

    drawRivet(16, 16);
    drawRivet(112, 16);
    drawRivet(16, 112);
    drawRivet(112, 112);

    drawRivet(144, 144);
    drawRivet(240, 144);
    drawRivet(144, 240);
    drawRivet(240, 240);

    return toTexture(c, 1);
  });
}
