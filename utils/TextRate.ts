import { DomainInfo, DomainRate, value_rate_for_save } from "./Definitions";

export function jsonToAverageScore(data: string): DomainRate[] {
    const dr: DomainRate[] = [];
    console.log('data:', data);
    try {
        const items = JSON.parse(data);
        
        for (const item of items) {
            const memorability = item.memorability;
            const simplicity = item.simplicity;
            const brevity = item.brevity;
            const averageScore = (memorability + simplicity + brevity) / 3;
            
            const domainRate: DomainRate = {
                domain: item.domain,
                memorability: memorability,
                simplicity: simplicity,
                brevity: brevity,
                averageScore: averageScore.toFixed(2),
            };
            dr.push(domainRate);
        }
    } catch (error: any) {
        console.error("Error parsing JSON:", error);
    }
    return dr;
}

export function addRateToDomainInfo(jsonA: DomainInfo[], jsonB: DomainRate[]): DomainInfo[] {
    // Create a map to store the averageScore with the domain name as the key
    const scoresMap = new Map<string, any>();
    jsonB.forEach(item => {
        const rate = {
            memorability: item.memorability,
            simplicity: item.simplicity,
            brevity: item.brevity,
            average: parseFloat(item.averageScore)
        }
        scoresMap.set(item.domain, rate);
    });

    // Iterate through jsonA and add the 'rate' key if the domain is found in the scoresMap
    jsonA.forEach(item => {
        if (scoresMap.has(item.domain)) {
            item.memorability = scoresMap.get(item.domain).memorability;
            item.simplicity = scoresMap.get(item.domain).simplicity;
            item.brevity = scoresMap.get(item.domain).brevity;
            item.rate = scoresMap.get(item.domain).average;
        }
    });

    // Sort jsonA by the 'rate' key in descending order
    jsonA.sort((a, b) => {
        // Ensure items with no 'rate' are sorted to the end of the list
        const rateA = a.rate ?? -Infinity;
        const rateB = b.rate ?? -Infinity;
        return rateB - rateA;
    });

    return jsonA;
}

export async function saveInDataBaseDomainRate(resultDomainsRate: DomainInfo[], user_id: string) {
    try {
        for(const elem of resultDomainsRate) {
            if(elem.rate! >= value_rate_for_save) {
                const namedomain = elem.domain;
                const available = elem.available;
                const rate = elem.rate;
        
                const data = {
                    namedomain,
                    available,
                    rate,
                    user_id
                };
    
                const resp = await fetch('/api/user-domainrating', {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify(data),
                });
    
                if (!resp.ok) {
                    throw new Error(
                      "Network response was not ok. Failed to save domain rating"
                    );
                }
            }
        }
    } catch (error) {
        console.error("Error saving domain rating:", error);    
    }
}