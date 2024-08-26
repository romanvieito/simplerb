// At the top of your file, define the interface
export interface DomainInfo {
    domain: string;
    available?: boolean;
    favorite?: boolean;
    error?: string;
    memorability?: number,
    simplicity?: number,
    brevity?: number,    
    rate?: number;
}

export interface DomainInfoArray {
    rows: DomainInfo[];
    admin: boolean;
    email: string;
    functionDomainFounded?: any;
    cred?: number; 
    functionCred?: any;    
}

export interface DomainInfoItem {
    dinfo: DomainInfo;
    admin?: boolean;
    email?: string;
    cr?: number;
    functioncr?: any;
}

export interface DomainRate {
    domain: string;
    memorability: number;
    simplicity: number;
    brevity: number;
    averageScore: string;
}

export interface EmailModalProps {
    open: boolean;
    onClose: () => void;
    subjectType: string
}

export type VibeType = 'Professional' | 'Friendly' | 'Sophisticated' | 'Creative';

export interface VpTransform {
    vpHiremecom: boolean;
    vpFlickercom: boolean;
    vpToolcom: boolean;
}

export const default_extensions = ['.com', '.co', '.info', '.net', '.org'];

export const COUNT_DOMAINS_TO_SEARCH_YES_ADMIN = 10;

export const COUNT_DOMAINS_TO_SEARCH_NOT_ADMIN = 5;

// Parametros de openai

export const ptemp = 0.7;

export const ptop = 1;

// Rate limit to save in database

export const value_rate_for_save = 8;