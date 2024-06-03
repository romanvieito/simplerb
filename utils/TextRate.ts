import { DomainInfo, DomainRate, value_rate_for_save } from "./Definitions";

export function convertTextRateToJson(data: string): DomainRate[] {
    const dr: DomainRate[] = [];
    try {
        for (const item of data.split("\n\n")) {
          const lines = item.split(/\r?\n/);
          const domain = lines[0].split(" ").length > 0 ? lines[0].split(" ")[1] : lines[0]; 
          const memorability = lines[1].split(": ").length > 0 ? parseInt(lines[1].split(": ")[1]) : -1;
          const simplicity = lines[2].split(": ").length > 0 ? parseInt(lines[2].split(": ")[1]) : -1;
          const brevity = lines[3].split(": ").length > 0 ? parseInt(lines[3].split(": ")[1]) : -1;
          const averageScore = (memorability+simplicity+brevity)/3;
          const data: DomainRate = {
            domain: domain,
            memorability: memorability,
            simplicity: simplicity,
            brevity: brevity,
            averageScore: averageScore > 0 ? averageScore.toFixed(2) : '',
          };
          dr.push(data);
        }        
    } catch (error: any) {
        console.log(error);
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