import React, { useRef, useEffect, useState } from 'react';

// Define scenes data
const scenes = [
    {
        index: 0,
        sentence: "This is a simple Javascript test",
        textPosition: "middle-center",
        textAnimation: "typing",
        media: "https://miro.medium.com/max/1024/1*OK8xc3Ic6EGYg2k6BeGabg.jpeg",
        duration: 3,
    },
    {
        index: 1,
        sentence: "Here comes the video!",
        textPosition: "top-right",
        textAnimation: "blink",
        media: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        duration: 5,
    },
];


const backgroundMusicURL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

const CanvasVideo = () => {
    const canvasRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
    const [typingText, setTypingText] = useState('');
    const [blinkVisible, setBlinkVisible] = useState(true);
    const requestRef = useRef();
    const startTimeRef = useRef();
    const backgroundMusicRef = useRef(null);
    const [mediaElements, setMediaElements] = useState([]);
    const sceneStartTimeRef = useRef(0); // Track when the current scene started

    // Preload media
    useEffect(() => {
        const loadMedia = async () => {
            const elements = await Promise.all(scenes.map(async (scene) => {
                if (/\.(jpeg|jpg|png)$/.test(scene.media)) {
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    img.src = scene.media;
                    await new Promise((resolve) => {
                        img.onload = () => {
                            console.log(`Image loaded: ${scene.media}`);
                            resolve();
                        };
                        img.onerror = () => {
                            console.error(`Failed to load image: ${scene.media}`);
                            resolve();
                        };
                    });
                    return img;
                } else if (/\.(mp4|webm|ogg)$/.test(scene.media)) {
                    const video = document.createElement('video');
                    video.src = scene.media;
                    // Ensure CORS is handled
                    video.crossOrigin = "anonymous";
                    video.muted = true;
                    video.loop = false;
                    video.preload = "auto";
                    video.playsInline = true;
                    await new Promise((resolve) => {
                        video.onloadeddata = () => {
                            console.log(`Video loaded: ${scene.media}`);
                            resolve();
                        };
                        video.onerror = () => {
                            console.error(`Failed to load video: ${scene.media}`);
                            resolve();
                        };
                    });
                    return video;
                } else {
                    console.warn(`Unsupported media type: ${scene.media}`);
                    return null;
                }
            }));
            setMediaElements(elements);
        };
        loadMedia();
    }, []);

    // Setup background music
    useEffect(() => {
        const audio = new Audio(backgroundMusicURL);
        audio.loop = true;
        audio.volume = 0.5;
        backgroundMusicRef.current = audio;
        return () => {
            audio.pause();
            audio.src = "";
        };
    }, []);

    const handleCanvasClick = () => {
        if (isPlaying) {
            setIsPlaying(false);
            backgroundMusicRef.current.pause();
            const media = mediaElements[currentSceneIndex];
            if (media instanceof HTMLVideoElement) {
                media.pause();
            }
        } else {
            setIsPlaying(true);
            backgroundMusicRef.current.play().catch((e) => {
                console.error("Background music play failed:", e);
            });
            const media = mediaElements[currentSceneIndex];
            // if media is video
            if (media instanceof HTMLVideoElement) {
                // Start video from third second as required
                media.currentTime = 3;
                media.play().catch((e) => {
                    console.error("Video play failed:", e);
                });
            }
            // init start time
            if (!startTimeRef.current) {
                startTimeRef.current = performance.now();
                sceneStartTimeRef.current = 0;
            }
        }
    };

    // Handle typing and blinking text animations
    useEffect(() => {
        let typingInterval;
        let blinkInterval;

        // Check if scene index is valid
        if (isPlaying && currentSceneIndex < scenes.length) {
            const scene = scenes[currentSceneIndex];
            if (scene.textAnimation === 'typing') {
                let charIndex = 0;
                typingInterval = setInterval(() => {
                    charIndex++;
                    // Set typing animation loop
                    setTypingText(scene.sentence.slice(0, charIndex));
                    if (charIndex >= scene.sentence.length) {
                        clearInterval(typingInterval);
                    }
                }, 100); // Adjust typing speed here
            } else if (scene.textAnimation === 'blink') {
                // Set blink animation loop
                blinkInterval = setInterval(() => {
                    setBlinkVisible((prev) => !prev);
                }, 500); // Blink every 500ms
            }
        } else {
            setTypingText('');
            setBlinkVisible(true);
        }

        return () => {
            clearInterval(typingInterval);
            clearInterval(blinkInterval);
        };
    }, [isPlaying, currentSceneIndex]);

    const drawText = (ctx, scene) => {
        ctx.font = "30px Arial";
        ctx.fillStyle = "white";
        ctx.textBaseline = "top";

        let text = '';
        if (scene.textAnimation === 'typing') {
            text = typingText;
        } else if (scene.textAnimation === 'blink') {
            text = blinkVisible ? scene.sentence : '';
        }

        const textMetrics = ctx.measureText(text);
        const canvasWidth = ctx.canvas.width;
        const canvasHeight = ctx.canvas.height;

        let x, y;

        switch (scene.textPosition) {
            case 'middle-center':
                x = (canvasWidth - textMetrics.width) / 2;
                // 30 is font size
                y = (canvasHeight - 30) / 2;
                break;
            case 'top-right':
                // 20px padding
                x = canvasWidth - textMetrics.width - 20;
                y = 20;
                break;
            // Add more positions when needed
            default:
                x = 0;
                y = 0;
        }

        ctx.fillText(text, x, y);
    };

    const animate = (time) => {
        if (!startTimeRef.current) startTimeRef.current = time;
         // in seconds
        const elapsed = (time - startTimeRef.current) / 1000;

        const ctx = canvasRef.current.getContext('2d');
        const canvasWidth = canvasRef.current.width;
        const canvasHeight = canvasRef.current.height;

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Determine current scene
        let accumulated = 0;
        let sceneIndex = 0;
        for (; sceneIndex < scenes.length; sceneIndex++) {
            accumulated += scenes[sceneIndex].duration;
            if (elapsed < accumulated) {
                break;
            }
        }

        if (sceneIndex >= scenes.length) {
            setIsPlaying(false);
            backgroundMusicRef.current.pause();
            return;
        }

        // Update current scene index if it has changed
        if (currentSceneIndex !== sceneIndex) {
            setCurrentSceneIndex(sceneIndex);
            sceneStartTimeRef.current = elapsed - (accumulated - scenes[sceneIndex].duration);
        }

        const scene = scenes[sceneIndex];
        const sceneElapsed = elapsed - (accumulated - scene.duration);

        // Duration of fade in/out in seconds
        const transitionDuration = 1;
        let opacity = 1;

        if (sceneElapsed < transitionDuration) {
            // Fade in and Calculate opacity for transitions
            opacity = sceneElapsed / transitionDuration;
        } else if (scene.duration - sceneElapsed < transitionDuration) {
            // Fade out and Calculate opacity for transitions
            opacity = (scene.duration - sceneElapsed) / transitionDuration;
        }

        ctx.save();
        ctx.globalAlpha = opacity;

        // Render media
        const media = mediaElements[sceneIndex];
        if (media) {
            if (media instanceof HTMLImageElement) {
                ctx.drawImage(media, 0, 0, canvasWidth, canvasHeight);
            } else if (media instanceof HTMLVideoElement) {
                // Start video from specific time if needed
                if (scene.index === 1 && sceneElapsed < 0.1) {
                    media.currentTime = 3;
                }
                if (media.readyState >= 2) {
                    if (media.paused) {
                        media.play().catch((e) => {
                            console.error("Video play failed:", e);
                        });
                    }
                    ctx.drawImage(media, 0, 0, canvasWidth, canvasHeight);
                }
            }
        }

        // Draw text
        drawText(ctx, scene);

        ctx.restore();

        // Continue the loop
        if (isPlaying) {
            requestRef.current = requestAnimationFrame(animate);
        }
    };

    useEffect(() => {
        if (isPlaying) {
            requestRef.current = requestAnimationFrame(animate);
        } else {
            cancelAnimationFrame(requestRef.current);
            const media = mediaElements[currentSceneIndex];
            if (media instanceof HTMLVideoElement) {
                media.pause();
            }
        }

        return () => {
            cancelAnimationFrame(requestRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPlaying, currentSceneIndex, typingText, blinkVisible, mediaElements]);

    return (
        <div>
            <canvas
                ref={canvasRef}
                width={1280} // 16:9 aspect ratio (e.g., 1280x720)
                height={720}
                onClick={handleCanvasClick}
                style={{ border: "1px solid black", cursor: "pointer" }}
            />
            <div style={{ marginTop: "10px", textAlign: "center" }}>
                {isPlaying ? "Playing" : "Paused/Stopped"}
            </div>
        </div>
    );
};

export default CanvasVideo;