interface Recommendation {
    action: string;
    confidence: number;
    consumed?: string[];
}

interface RecommendationData {
    type: string;
    data: {
        recommendations: Recommendation[];
        tehai: string[];
        last_kawa_tile: string;
    };
}

let latestRecommendation: RecommendationData | null = null;

const mode = process.argv.includes('mock') ? 'mock' : 'serve';

if (mode === 'mock') {
    // Generate initial data
    latestRecommendation = generateMockData();
    setInterval(() => {
        latestRecommendation = generateMockData();
        console.log('Generated new mock data');
    }, 5000);
}

const server = Bun.serve({
    port: 3001,
    async fetch(req) {
        const url = new URL(req.url);

        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        };

        if (req.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        if (url.pathname === '/update' && req.method === 'POST') {
            try {
                const body = await req.json();
                console.log('Received data from Python:', JSON.stringify(body, null, 2));
                latestRecommendation = body; // Store the latest recommendation
                return new Response('Data received', { status: 200, headers: corsHeaders });
            } catch (error) {
                console.error('Error processing POST request:', error);
                return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
            }
        }

        if (url.pathname === '/recommendations' && req.method === 'GET') {
            return new Response(JSON.stringify(latestRecommendation), {
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json"
                },
                status: 200
            });
        }

        return new Response('Not Found', { status: 404, headers: corsHeaders });
    },
});

console.log(`Server listening on localhost:${server.port} in ${mode} mode`);

function generateMockData(): RecommendationData {
    const tiles = ["1m", "2m", "3m", "4m", "5m", "5mr", "6m", "7m", "8m", "9m", "1p", "2p", "3p", "4p", "5p", "5pr", "6p", "7p", "8p", "9p", "1s", "2s", "3s", "4s", "5s", "5sr", "6s", "7s", "8s", "9s", "E", "S", "W", "N", "P", "F", "C"];
    const nonRedDoraTiles = tiles.filter(t => !t.endsWith('r'));
    const getRandomTile = (exclude: string[] = [], source: string[] = tiles) => {
        let tile;
        do {
            tile = source[Math.floor(Math.random() * source.length)];
        } while (exclude.includes(tile));
        return tile;
    };

    // Generate a mock hand
    const tehai = Array.from({ length: 13 }, () => getRandomTile());

    // Generate recommendations
    const recommendations: Recommendation[] = [];
    const numRecommendations = Math.floor(Math.random() * 2) + 3; // 3 to 4 recommendations

    const actionTypes = ["dahai", "chi_low", "chi_mid", "chi_high", "pon", "kan_select", "reach", "none"];
    
    // Ensure at least one chi or pon for testing
    let last_kawa_tile = getRandomTile();

    for (let i = 0; i < numRecommendations; i++) {
        let actionType = actionTypes[Math.floor(Math.random() * actionTypes.length)];
        
        // Ensure the first recommendation is something interesting for testing
        if (i === 0) {
            const testActions = ["chi_low", "pon", "kan_select"];
            actionType = testActions[Math.floor(Math.random() * testActions.length)];
        }

        const rec: Recommendation = {
            action: '',
            confidence: Math.random(),
        };

        switch (actionType) {
            case "dahai": {
                rec.action = tehai[Math.floor(Math.random() * tehai.length)];
                break;
            }
            case "chi_low":
            case "chi_mid":
            case "chi_high": {
                rec.action = actionType;
                const suits = ['m', 'p', 's'];
                const suit = suits[Math.floor(Math.random() * suits.length)];
                const startNum = Math.floor(Math.random() * 7) + 1; // 1 to 7
                
                const t1 = `${startNum}${suit}`;
                const t2 = `${startNum + 1}${suit}`;
                const t3 = `${startNum + 2}${suit}`;

                if (actionType === 'chi_low') { // eat t3 with t1, t2
                    last_kawa_tile = t3;
                    rec.consumed = [t1, t2];
                } else if (actionType === 'chi_mid') { // eat t2 with t1, t3
                    last_kawa_tile = t2;
                    rec.consumed = [t1, t3];
                } else { // chi_high, eat t1 with t2, t3
                    last_kawa_tile = t1;
                    rec.consumed = [t2, t3];
                }
                break;
            }
            case "pon": {
                rec.action = "pon";
                const ponTile = getRandomTile([], nonRedDoraTiles);
                last_kawa_tile = ponTile;
                rec.consumed = [ponTile, ponTile];
                break;
            }
            case "kan_select": {
                rec.action = "kan_select";
                const kanTile = getRandomTile([], nonRedDoraTiles);
                rec.consumed = [kanTile, kanTile, kanTile];
                break;
            }
            case "reach": {
                rec.action = "reach";
                break;
            }
            case "none": {
                rec.action = "none";
                break;
            }
            default: {
                rec.action = getRandomTile();
            }
        }
        recommendations.push(rec);
    }

    return {
        type: "recommandations",
        data: {
            recommendations: recommendations.sort((a, b) => b.confidence - a.confidence),
            tehai: tehai,
            last_kawa_tile: last_kawa_tile
        }
    };
}
