import { VibeType, DomainInfo } from '../utils/Definitions';

export const getBio = () => {
    return  window.localStorage.getItem('bio')
}

export const getVibe = (): VibeType | null => {
    const storeVibe = window.localStorage.getItem('vibe');
    if (storeVibe) {
        return JSON.parse(storeVibe) as VibeType;
    }
    return null;      
}

export const getDomainFounded = (): DomainInfo[] | null => {
    const storedf = window.localStorage.getItem('domainfounded');
    if (storedf) {
        return JSON.parse(storedf) as DomainInfo[];
    }
    return null;    
}

export const saveSearch = (bio: any, vibe: VibeType, domainfounded: DomainInfo[]) => {
    window.localStorage.setItem('bio', bio);
    window.localStorage.setItem('vibe', JSON.stringify(vibe));
    window.localStorage.setItem('domainfounded', JSON.stringify(domainfounded)); // JSON.stringify convert array to string    
}  

export const saveDomainFounded = (domainfounded: DomainInfo[]) => {
    window.localStorage.setItem('domainfounded', JSON.stringify(domainfounded)); // JSON.stringify convert array to string    
}

export const resetSearch = () => {
    window.localStorage.removeItem('bio')
    window.localStorage.removeItem('vibe')
    window.localStorage.removeItem('domainfounded')
}