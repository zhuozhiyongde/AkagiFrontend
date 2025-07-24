import { useRef, useEffect, useState } from 'react';
import html2canvas from 'html2canvas';
import WebRecommendation from './components/WebRecommendation';
import StreamRecommendation from './components/StreamRecommendation';
import { Sun, Moon, Laptop, PictureInPicture2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Recommendation {
    action: string;
    confidence: number;
    consumed?: string[];
}

interface FullRecommendationData {
    recommendations: Recommendation[];
    tehai: string[];
    last_kawa_tile: string;
}

const WebRenderComponent = ({ data }: { data: FullRecommendationData | null }) => {
    if (!data) {
        return (
            <div className="p-4 sm:p-8 bg-white dark:bg-zinc-800 text-black dark:text-white flex items-center justify-center w-full h-full">
                <h2 className="text-2xl sm:text-4xl font-bold text-center">Waiting for data...</h2>
            </div>
        );
    }

    const { recommendations, last_kawa_tile } = data;

    return (
        <div className="p-4 sm:p-8 bg-white dark:bg-zinc-800 text-black dark:text-white mb-4 flex flex-col w-full h-full">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 flex-shrink-0">Mortal Recommendations</h2>
            <div className="flex flex-col gap-2 sm:gap-4">
                {recommendations.slice(0, 3).map((rec, index) => (
                    <WebRecommendation key={index + rec.action} {...rec} last_kawa_tile={last_kawa_tile} />
                ))}
            </div>
        </div>
    );
};

const StreamRenderComponent = ({ data, theme }: { data: FullRecommendationData | null; theme: string }) => {
    const themeClass = theme === 'dark' ? 'dark' : '';
    if (!data) {
        return (
            <div
                id="render-source"
                className={`p-8 bg-white dark:bg-zinc-800 text-black dark:text-white flex items-center justify-center ${themeClass}`}
                style={{ width: 1200, height: 675 }}>
                <h2 className="text-4xl font-bold">Waiting for data...</h2>
            </div>
        );
    }

    const { recommendations, last_kawa_tile } = data;

    return (
        <div
            id="render-source"
            className={`p-8 bg-white dark:bg-zinc-800 text-black dark:text-white mb-4 flex flex-col ${themeClass}`}
            style={{ width: 1200, height: 675 }}>
            <h2 className="text-4xl font-bold mb-4 flex-shrink-0">Mortal Recommendations</h2>
            <div className="flex flex-col gap-4">
                {recommendations.slice(0, 3).map((rec, index) => (
                    <StreamRecommendation key={index + rec.action} {...rec} last_kawa_tile={last_kawa_tile} />
                ))}
            </div>
        </div>
    );
};

const StreamPlayer = ({ data, theme }: { data: FullRecommendationData | null; theme: string }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const renderSource = document.getElementById('render-source-pip');

        async function drawToCanvas() {
            if (!canvas || !renderSource) return;
            try {
                const tempCanvas = await html2canvas(renderSource as HTMLElement, {
                    useCORS: true,
                    allowTaint: false,
                    backgroundColor: null,
                    scale: 1,
                    logging: false,
                    width: renderSource.offsetWidth,
                    height: renderSource.offsetHeight,
                });
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (!ctx) return;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, 1200, 675);
            } catch (err) {
                console.error('html2canvas failed:', err);
            }
        }

        drawToCanvas();
    }, [data, theme]);

    useEffect(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        async function setupStream() {
            if (!video || !canvas) return;
            const stream = canvas.captureStream(10);
            video.srcObject = stream;
            video.load();
            video.play().catch((error) => console.error('Video play failed:', error));
        }

        function cleanupStream() {
            if (video && video.srcObject) {
                const stream = video.srcObject as MediaStream;
                stream.getTracks().forEach((track) => track.stop());
                video.pause();
                video.srcObject = null;
            }
        }

        setupStream();
        return cleanupStream;
    }, []);

    const handlePipClick = async () => {
        if (
            document.pictureInPictureEnabled &&
            videoRef.current &&
            videoRef.current.srcObject &&
            videoRef.current.readyState >= 2
        ) {
            try {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                } else {
                    await videoRef.current.requestPictureInPicture();
                }
            } catch (error) {
                console.error('PiP request failed:', error);
                alert('Picture-in-Picture failed: ' + (error as Error).message);
            }
        } else {
            alert('Picture-in-Picture is not supported by your browser or the video is not ready.');
        }
    };

    return (
        <>
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                <div id="render-source-pip">
                    <StreamRenderComponent data={data} theme={theme} />
                </div>
            </div>
            <canvas ref={canvasRef} width="1200" height="675" className="hidden" />
            <div className="w-full mt-4">
                <video
                    ref={videoRef}
                    className="border-2 border-blue-500 w-full rounded-lg"
                    playsInline
                    autoPlay
                    muted
                />
            </div>
            <div className="text-center mt-4">
                <Button onClick={handlePipClick}>
                    <PictureInPicture2 className="mr-2 h-4 w-4" />
                    开启画中画
                </Button>
            </div>
        </>
    );
};

function App() {
    const [fullRecData, setFullRecData] = useState<FullRecommendationData | null>(null);
    const [theme, setTheme] = useState('system'); // 'light', 'dark', 'system'
    const [backendUrl, setBackendUrl] = useState('http://127.0.0.1:3001');
    const [mode, setMode] = useState('stream'); // 'web' or 'stream'

    useEffect(() => {
        const applyTheme = () => {
            const root = window.document.documentElement;
            root.classList.remove('light', 'dark');

            if (theme === 'system') {
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                root.classList.add(systemTheme);
                return;
            }

            root.classList.add(theme);
        };

        applyTheme();

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => applyTheme();
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    // Effect to fetch data periodically
    useEffect(() => {
        const fetchData = async () => {
            if (!backendUrl) return;
            try {
                const response = await fetch(`${backendUrl}/recommendations`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                if (data) { // The server might return null initially
                    setFullRecData(data.data);
                }
            } catch (error) {
                console.error("Failed to fetch recommendations:", error);
                setFullRecData(null); // Clear data on error
            }
        };

        fetchData(); // Fetch immediately on component mount
        const intervalId = setInterval(fetchData, 2000); // Poll every 2 seconds

        return () => clearInterval(intervalId); // Cleanup on component unmount
    }, [backendUrl]);

    return (
        <div className="p-4 sm:p-8 bg-zinc-100 dark:bg-black text-black dark:text-white flex flex-col min-h-[100svh]">
            <header className="flex flex-col items-center mb-4 sm:mb-6">
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500 mt-2">
                    Akagi Frontend
                </h1>
                <div className="flex space-x-2 mt-4">
                    <Button
                        variant={theme === 'light' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => setTheme('light')}>
                        <Sun className="h-[1.2rem] w-[1.2rem]" />
                    </Button>
                    <Button
                        variant={theme === 'dark' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => setTheme('dark')}>
                        <Moon className="h-[1.2rem] w-[1.2rem]" />
                    </Button>
                    <Button
                        variant={theme === 'system' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => setTheme('system')}>
                        <Laptop className="h-[1.2rem] w-[1.2rem]" />
                    </Button>
                </div>
            </header>

            <main className="flex-grow flex flex-col items-center">
                <div className="w-full max-w-5xl mb-4">
                    <label htmlFor="backendUrl" className="block text-sm font-medium mb-1">
                        Backend URL
                    </label>
                    <Input
                        type="text"
                        id="backendUrl"
                        value={backendUrl}
                        onChange={(e) => setBackendUrl(e.target.value)}
                        placeholder="http://..."
                    />
                </div>

                <Tabs value={mode} onValueChange={setMode} className="w-full max-w-5xl">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="web">Web</TabsTrigger>
                        <TabsTrigger value="stream">Stream</TabsTrigger>
                    </TabsList>
                    <TabsContent value="web">
                        <div className="mt-4">
                            <WebRenderComponent data={fullRecData} />
                        </div>
                    </TabsContent>
                    <TabsContent value="stream">
                        {mode === 'stream' && <StreamPlayer data={fullRecData} theme={theme} />}
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}

export default App;
