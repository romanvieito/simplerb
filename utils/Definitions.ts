// At the top of your file, define the interface
export interface DomainInfo {
    domain: string;
    error?: string;
    rate?: number;    
}

export interface DomainInfoArray {
    rows: DomainInfo[];
    admin: boolean;
}

export interface DomainInfoItem {
    dinfo: DomainInfo;
    admin?: boolean;
}

export interface DomainRate {
    domain: string;
    memorability: number;
    simplicity: number;
    brevity: number;
    averageScore: string;
 }

 export const COUNT_DOMAINS_TO_SEARCH_YES_ADMIN = 5;

 export const COUNT_DOMAINS_TO_SEARCH_NOT_ADMIN = 5;