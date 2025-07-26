import React from 'react';

interface RecommendationProps {
    action: string;
    confidence: number;
    consumed?: string[];
    last_kawa_tile: string;
}

const Tile: React.FC<{ tile: string }> = ({ tile }) => {
    const svgPath = `/Resources/${tile}.svg`;
    return (
        <div className="flex items-center justify-center relative w-10 h-16 md:w-16 md:h-24 lg:w-20 lg:h-28">
            <img src={svgPath} alt={tile} className="absolute bg-white rounded-md border-2 border-zinc-300 dark:border-zinc-700" />
        </div>
    );
};

const ConsumedDisplay: React.FC<{ action: string; consumed: string[]; last_kawa_tile: string }> = ({
    action,
    consumed,
    last_kawa_tile,
}) => {
    if (!consumed || consumed.length === 0) return null;

    let tilesToShow: React.ReactNode = null;

    const getTileValue = (tile: string) => {
        const num = parseInt(tile[0]);
        if (isNaN(num)) return -1;
        return num;
    };

    const handTiles = [...consumed].sort((a, b) => getTileValue(a) - getTileValue(b));

    if (action.startsWith('chi') || action === 'pon' || action === 'kan_select') {
        tilesToShow = (
            <>
                <Tile tile={last_kawa_tile} />
                <div className="w-1 h-16 md:h-20 lg:h-24 bg-zinc-400 dark:bg-zinc-600 mx-1 self-center"></div>
                {handTiles.map((t, i) => (
                    <Tile key={i} tile={t} />
                ))}
            </>
        );
    } else {
        tilesToShow = consumed.map((c, i) => <Tile key={i} tile={c} />);
    }

    return <div className="flex items-center justify-center gap-1 flex-nowrap">{tilesToShow}</div>;
};

const Recommendation: React.FC<RecommendationProps> = ({ action, confidence, consumed, last_kawa_tile }) => {
    const actionNameMapping: { [key: string]: string } = {
        reach: '立直',
        chi_low: '吃',
        chi_mid: '吃',
        chi_high: '吃',
        pon: '碰',
        kan_select: '杠',
        hora: '和',
        ryukyoku: '流局',
        none: '跳过',
        nukidora: '拔北',
    };

    const colorMapping: { [key: string]: string } = {
        hora: '#c13535',
        reach: '#e06c20',
        pon: '#007fff',
        chi_low: '#00ff80',
        chi_mid: '#00ff80',
        chi_high: '#00ff80',
        kan_select: '#9a1cbd',
        nukidora: '#d5508d',
        ryukyoku: '#8574a1',
        none: '#a0a0a0',
    };

    const displayAction = actionNameMapping[action] || '打';
    const tile = actionNameMapping[action] ? null : action;
    const showConsumed = consumed && ['chi_low', 'chi_mid', 'chi_high', 'pon', 'kan_select'].includes(action);
    const actionColor = colorMapping[action] || '#575654';

    return (
        <div className="flex flex-col lg:flex-row items-center justify-between p-3 lg:p-4 bg-zinc-100 dark:bg-zinc-900 rounded-lg w-full border-2 border-zinc-300 dark:border-zinc-700 lg:h-[180px]">
            <div
                className="flex-none w-28 h-16 md:w-36 md:h-24 lg:w-40 lg:h-32 text-2xl md:text-3xl lg:text-[50px] font-bold text-white p-2 md:p-3 lg:p-4 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: actionColor || undefined }}>
                {displayAction}
            </div>

            <div className="flex-grow flex items-center justify-center mx-3 lg:mx-6 my-2 lg:my-0">
                {tile && <Tile tile={tile} />}
                {showConsumed && consumed && (
                    <ConsumedDisplay action={action} consumed={consumed} last_kawa_tile={last_kawa_tile} />
                )}
            </div>

            <div className="flex-none w-28 md:w-36 lg:w-48 text-right font-mono text-cyan-400 text-2xl md:text-3xl lg:text-[48px]">
                {(confidence * 100).toFixed(2)}%
            </div>
        </div>
    );
};

export default Recommendation;