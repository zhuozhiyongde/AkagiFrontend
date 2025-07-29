import { useRef, useEffect, useState } from 'react';
import html2canvas from 'html2canvas';
import WebRecommendation from './components/WebRecommendation';
import StreamRecommendation from './components/StreamRecommendation';
import { Sun, Moon, Laptop, PictureInPicture2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
            <div className="absolute left-[-9999px] top-[-100px]">
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
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'system');
    const [protocol, setProtocol] = useState(() => localStorage.getItem('protocol') || 'ws');
    const [backendAddress, setBackendAddress] = useState(() => localStorage.getItem('backendAddress') || '127.0.0.1:8765');
    const [clientId] = useState(() => {
        let id = localStorage.getItem('clientId');
        if (!id) {
            id = Math.random().toString(36).substring(2, 15);
            localStorage.setItem('clientId', id);
        }
        return id;
    });
    const [mode, setMode] = useState('stream'); // 'web' or 'stream'
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [backendUrl, setBackendUrl] = useState('');

    const effectiveTheme = (() => {
        if (theme === 'system') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return theme;
    })();

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(effectiveTheme);
        localStorage.setItem('theme', theme);
    }, [theme, effectiveTheme]);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            setTheme((prevTheme) => (prevTheme === 'system' ? 'system' : prevTheme));
        };
        if (theme === 'system') {
            mediaQuery.addEventListener('change', handleChange);
        }
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    useEffect(() => {
        if (protocol && backendAddress) {
            const url = `${protocol}://${backendAddress}?clientId=${clientId}`;
            setBackendUrl(url);
            localStorage.setItem('protocol', protocol);
            localStorage.setItem('backendAddress', backendAddress);
        }
    }, [protocol, backendAddress, clientId]);

    useEffect(() => {
        if (!backendUrl) return;

        let ws: WebSocket;
        let reconnectTimeoutId: number;
        let reconnectAttempts = 0;
        const maxReconnectAttempts = 3;

        const connect = () => {
            try {
                ws = new WebSocket(backendUrl);
            } catch (e) {
                console.error('Invalid WebSocket URL:', e);
                setError('Invalid WebSocket URL. Please check the address.');
                setIsConnected(false);
                return;
            }

            ws.onopen = () => {
                console.log('WebSocket connected');
                setIsConnected(true);
                setError(null);
                reconnectAttempts = 0; // Reset on successful connection
                if (reconnectTimeoutId) {
                    clearTimeout(reconnectTimeoutId);
                }
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data) {
                        setFullRecData(data.data);
                    }
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                setError('Connection failed. Check the console for details.');
                setIsConnected(false);
            };

            ws.onclose = () => {
                console.log('WebSocket disconnected.');
                setIsConnected(false);
                if (reconnectAttempts < maxReconnectAttempts) {
                    reconnectAttempts++;
                    console.log(`Attempting to reconnect... (${reconnectAttempts}/${maxReconnectAttempts})`);
                    // Attempt to reconnect after a delay
                    reconnectTimeoutId = window.setTimeout(connect, 1000);
                } else {
                    console.log('Max reconnect attempts reached. Giving up.');
                    setError('Connection lost. Max reconnect attempts reached.');
                }
            };
        };

        connect();

        return () => {
            if (reconnectTimeoutId) {
                clearTimeout(reconnectTimeoutId);
            }
            if (ws) {
                // Prevent onclose from triggering reconnect on component unmount
                ws.onclose = null;
                ws.close();
            }
        };
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
                    <div className="flex items-end gap-2">
                        <div className="flex-grow">
                            <label htmlFor="backendUrl" className="block text-sm font-medium mb-1">
                                DataServer
                            </label>
                            <div className="flex rounded-md shadow-sm">
                                <Select value={protocol} onValueChange={setProtocol}>
                                    <SelectTrigger className="w-[100px] rounded-r-none -mr-[1px]">
                                        <SelectValue placeholder="Protocol" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ws">ws://</SelectItem>
                                        <SelectItem value="wss">wss://</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input
                                    type="text"
                                    id="backendUrl"
                                    value={backendAddress}
                                    onChange={(e) => setBackendAddress(e.target.value)}
                                    placeholder="e.g., 127.0.0.1:8765"
                                    className="rounded-l-none"
                                />
                            </div>
                        </div>
                        <div className="flex items-center h-10">
                            <div className={`w-4 h-4 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        </div>
                    </div>
                    {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
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
                        {mode === 'stream' && <StreamPlayer data={fullRecData} theme={effectiveTheme} />}
                    </TabsContent>
                </Tabs>
            </main>
            <footer className="text-center mt-8 text-xs text-gray-500">
                <p>
                    Made with ❤️ by{' '}
                    <a
                        href="https://arthals.ink"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pink-500 hover:underline">
                        @Arthals
                    </a>
                </p>
                <p className="mt-1">
                    <a
                        href="https://github.com/zhuozhiyongde/AkagiFrontend/blob/main/LICENSE"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline">
                        GPL-3.0 License
                    </a>
                </p>
            </footer>
        </div>
    );
}

export default App;
