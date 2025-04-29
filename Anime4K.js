import {
    ModeA, ModeB, ModeC,
    CNNx2UL, GANx3L, GANx4UUL, GANUUL,
    DoG, BilateralMean,
    render
} from 'anime4k-webgpu';

let currentRenderer = null;

window.addEventListener('load', () => {
    const video = document.querySelector('video');
    const canvas = document.querySelector('#velocity-canvas');
    const select = document.getElementById('shaderSelect');

    if (!video || !canvas || !select) {
        console.error('Required elements not found.');
        return;
    }

    video.addEventListener('loadedmetadata', async () => {
        const scale = 2;
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;
        await applyShader(select.value);
    });

    select.addEventListener('change', async () => {
        await applyShader(select.value);
    });

    function buildMode(ModeClass, device, inputTexture) {
        return new ModeClass({
            device,
            inputTexture,
            nativeDimensions: {
                width: video.videoWidth,
                height: video.videoHeight,
            },
            targetDimensions: {
                width: canvas.width,
                height: canvas.height,
            },
        });
    }

    async function applyShader(shaderName) {
        if (!video || !canvas) return;

        if (currentRenderer && typeof currentRenderer.stop === 'function') {
            currentRenderer.stop();
        }

        if (shaderName === 'Original') {
            currentRenderer = null;
            return;
        }

        currentRenderer = await render({
            video,
            canvas,
            pipelineBuilder: (device, inputTexture) => {
                switch (shaderName) {
                    case 'Mode A':
                        return [buildMode(ModeA, device, inputTexture)];
                    case 'Mode B':
                        return [buildMode(ModeB, device, inputTexture)];
                    case 'Mode C':
                        return [buildMode(ModeC, device, inputTexture)];
                    case 'Mode A+A': {
                        const m1 = buildMode(ModeA, device, inputTexture);
                        const m2 = buildMode(ModeA, device, m1.getOutputTexture());
                        return [m1, m2];
                    }
                    case 'Mode B+B': {
                        const m1 = buildMode(ModeB, device, inputTexture);
                        const m2 = buildMode(ModeB, device, m1.getOutputTexture());
                        return [m1, m2];
                    }
                    case 'Mode C+A': {
                        const m1 = buildMode(ModeC, device, inputTexture);
                        const m2 = buildMode(ModeA, device, m1.getOutputTexture());
                        return [m1, m2];
                    }
                    case 'Deblur-DoG':
                        return [new DoG({ device, inputTexture })];
                    case 'Restore-CNNUL':
                        return [new CNNx2UL({ device, inputTexture })];
                    case 'Restore-GANUUL':
                        return [new GANUUL({ device, inputTexture })];
                    case 'Upscale-GANx3L':
                        return [new GANx3L({ device, inputTexture })];
                    case 'Upscale-CNNx2UL':
                        return [new CNNx2UL({ device, inputTexture })];
                    case 'Upscale-GANx4UUL':
                        return [new GANx4UUL({ device, inputTexture })];
                    case 'Denoise-BilateralMean':
                        return [new BilateralMean({ device, inputTexture })];
                    default:
                        return [];
                }
            }
        });

        if (video.requestVideoFrameCallback) {
            video.requestVideoFrameCallback(() => { });
        }
    }
});