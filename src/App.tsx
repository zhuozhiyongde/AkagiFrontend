import { useRef, useEffect, useState } from 'react';
import html2canvas from 'html2canvas';
import StreamRecommendation from './components/StreamRecommendation';
import { Sun, Moon, Laptop, PictureInPicture2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// 类型声明扩展
declare global {
    interface Window {
        gc?: () => void;
    }
    interface Performance {
        memory?: {
            usedJSHeapSize: number;
            totalJSHeapSize: number;
            jsHeapSizeLimit: number;
        };
    }
}

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
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const [memoryWarning, setMemoryWarning] = useState<string | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const renderSource = document.getElementById('render-source-pip');

        // 获取或创建 canvas context（只创建一次）
        if (canvas && !ctxRef.current) {
            ctxRef.current = canvas.getContext('2d', { willReadFrequently: true });
        }

        async function drawToCanvas() {
            if (!canvas || !renderSource || !ctxRef.current) return;
            
            try {
                // 清理之前的 tempCanvas
                if (tempCanvasRef.current) {
                    const oldCtx = tempCanvasRef.current.getContext('2d');
                    if (oldCtx) {
                        oldCtx.clearRect(0, 0, tempCanvasRef.current.width, tempCanvasRef.current.height);
                    }
                    tempCanvasRef.current = null;
                }

                const tempCanvas = await html2canvas(renderSource as HTMLElement, {
                    useCORS: true,
                    allowTaint: false,
                    backgroundColor: null,
                    scale: 1,
                    logging: false,
                    width: renderSource.offsetWidth,
                    height: renderSource.offsetHeight,
                    scrollX: -window.scrollX,
                    scrollY: -window.scrollY,
                });
                
                // 保存引用以便后续清理
                tempCanvasRef.current = tempCanvas;
                
                const ctx = ctxRef.current;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, 1200, 675);
                
                // 内存监控 (仅在支持的浏览器中)
                if (performance.memory) {
                    const memInfo = performance.memory;
                    const usedMB = Math.round(memInfo.usedJSHeapSize / 1024 / 1024);
                    const limitMB = Math.round(memInfo.jsHeapSizeLimit / 1024 / 1024);
                    
                    // 当内存使用超过限制的80%时发出警告
                    if (usedMB / limitMB > 0.8) {
                        setMemoryWarning(`内存使用过高: ${usedMB}MB/${limitMB}MB`);
                        console.warn(`Memory usage high: ${usedMB}MB/${limitMB}MB`);
                    } else {
                        setMemoryWarning(null);
                    }
                }
                
            } catch (err) {
                console.error('html2canvas failed:', err);
                setMemoryWarning('渲染失败，可能由于内存不足');
                
                // 强制触发垃圾回收（在支持的浏览器中）
                if (window.gc) {
                    window.gc();
                }
            }
        }

        drawToCanvas();
        
        // 清理函数
        return () => {
            if (tempCanvasRef.current) {
                const oldCtx = tempCanvasRef.current.getContext('2d');
                if (oldCtx) {
                    oldCtx.clearRect(0, 0, tempCanvasRef.current.width, tempCanvasRef.current.height);
                }
                tempCanvasRef.current = null;
            }
        };
    }, [data, theme]);

    useEffect(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        let currentStream: MediaStream | null = null;

        async function setupStream() {
            if (!video || !canvas) return;
            
            try {
                // 清理之前的流
                if (currentStream) {
                    currentStream.getTracks().forEach((track) => track.stop());
                }
                
                currentStream = canvas.captureStream(10);
                video.srcObject = currentStream;
                video.load();
                await video.play();
            } catch (error) {
                console.error('Video play failed:', error);
                // 在 iOS 上，如果视频播放失败，清理资源
                if (currentStream) {
                    currentStream.getTracks().forEach((track) => track.stop());
                    currentStream = null;
                }
            }
        }

        function cleanupStream() {
            if (video && video.srcObject) {
                const stream = video.srcObject as MediaStream;
                stream.getTracks().forEach((track) => {
                    track.stop();
                    // 手动触发垃圾回收提示（在支持的浏览器中）
                    if (track.kind === 'video') {
                        (track as any).enabled = false;
                    }
                });
                video.pause();
                video.srcObject = null;
            }
            if (currentStream) {
                currentStream.getTracks().forEach((track) => track.stop());
                currentStream = null;
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
                    // 在启动PiP前检查内存状态
                    if (performance.memory) {
                        const memInfo = performance.memory;
                        const usedMB = Math.round(memInfo.usedJSHeapSize / 1024 / 1024);
                        const limitMB = Math.round(memInfo.jsHeapSizeLimit / 1024 / 1024);
                        
                        if (usedMB / limitMB > 0.75) {
                            if (!confirm(`内存使用较高 (${usedMB}MB/${limitMB}MB)，可能影响PiP性能。是否继续？`)) {
                                return;
                            }
                        }
                    }
                    
                    await videoRef.current.requestPictureInPicture();
                }
            } catch (error) {
                console.error('PiP request failed:', error);
                const errorMsg = (error as Error).message;
                
                // 根据错误类型提供更好的用户反馈
                if (errorMsg.includes('NotSupportedError')) {
                    alert('您的设备或浏览器不支持画中画功能');
                } else if (errorMsg.includes('InvalidStateError')) {
                    alert('视频未准备就绪，请稍等片刻再试');
                } else if (errorMsg.includes('NotAllowedError')) {
                    alert('画中画权限被拒绝，请检查浏览器设置');
                } else {
                    alert('画中画启动失败，可能由于内存不足: ' + errorMsg);
                }
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
                {memoryWarning && (
                    <div className="mb-2 p-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded text-sm">
                        ⚠️ {memoryWarning}
                    </div>
                )}
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
    const [protocol, setProtocol] = useState(() => {
        const saved = localStorage.getItem('protocol');
        if (saved === 'https' || saved === 'wss') {
            return 'https';
        }
        return 'http';
    });
    const [backendAddress, setBackendAddress] = useState(() => localStorage.getItem('backendAddress') || '127.0.0.1:8765');
    const [clientId] = useState(() => {
        let id = localStorage.getItem('clientId');
        if (!id) {
            id = Math.random().toString(36).substring(2, 15);
            localStorage.setItem('clientId', id);
        }
        return id;
    });
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

        let currentSource: EventSource | null = null;
        let reconnectTimer: number | undefined;
        let stopped = false;
        let backoff = 1000;
        const maxBackoff = 30_000;

        const scheduleReconnect = () => {
            if (stopped || reconnectTimer) return;
            reconnectTimer = window.setTimeout(() => {
                reconnectTimer = undefined;
                backoff = Math.min(backoff * 2, maxBackoff);
                connect();
            }, backoff);
        };

        const connect = () => {
            if (stopped) return;

            // 关闭旧连接，避免同 clientId 并发导致服务器踢出
            if (currentSource) {
                currentSource.close();
                currentSource = null;
            }

            let es: EventSource;
            try {
                es = new EventSource(backendUrl);
            } catch (e) {
                console.error('Invalid SSE URL:', e);
                setError('Invalid SSE URL. Please check the address.');
                setIsConnected(false);
                scheduleReconnect();
                return;
            }

            currentSource = es;

            es.onopen = () => {
                console.log('SSE connected');
                setIsConnected(true);
                setError(null);
                backoff = 1000;
                if (reconnectTimer) {
                    clearTimeout(reconnectTimer);
                    reconnectTimer = undefined;
                }
            };

            es.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data) {
                        setFullRecData(data.data);
                    }
                } catch (error) {
                    console.error('Failed to parse SSE message:', error);
                }
            };

            es.onerror = (event) => {
                console.error('SSE error:', event);
                // EventSource 会自动重连（readyState === CONNECTING），只有真正关闭时我们才手动重试
                setIsConnected(false);
                setError('连接断开，正在重试...');
                if (es.readyState === EventSource.CLOSED) {
                    scheduleReconnect();
                }
            };
        };

        connect();

        return () => {
            stopped = true;
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
            }
            if (currentSource) {
                currentSource.close();
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
                                        <SelectItem value="http">http://</SelectItem>
                                        <SelectItem value="https">https://</SelectItem>
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

                <div className="w-full max-w-5xl">
                    <StreamPlayer data={fullRecData} theme={effectiveTheme} />
                </div>
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
