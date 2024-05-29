import { VibeType, DomainInfo, VpTransform } from '../utils/Definitions';

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

export const saveBioVite = (bio: any, vibe: VibeType) => {
    window.localStorage.setItem('bio', bio);
    window.localStorage.setItem('vibe', JSON.stringify(vibe));
}  

export const saveDomainFounded = (domainfounded: DomainInfo[]) => {
    window.localStorage.setItem('domainfounded', JSON.stringify(domainfounded)); // JSON.stringify convert array to string    
}

export const resetSearch = () => {
    window.localStorage.removeItem('bio')
    window.localStorage.removeItem('vibe')
    window.localStorage.removeItem('domainfounded')

    window.localStorage.removeItem('vpTabIndex');
    window.localStorage.removeItem('vpContains');
    window.localStorage.removeItem('vpStartsWith');
    window.localStorage.removeItem('vpEndsWith');
    window.localStorage.removeItem('vpSimilarToThisDomainName');    
    window.localStorage.removeItem('vpExtLeft');
    window.localStorage.removeItem('vpExtChecked');
    window.localStorage.removeItem('vpFilterExtLeft');   
    window.localStorage.removeItem('vpTransform');
    window.localStorage.removeItem('vpMinlength');
    window.localStorage.removeItem('vpMaxlength');    
}

  // About Tab Vite Professional
  //-----------------------------------------------------------------------------------------
  // Tab index
  export const getVpTabIndex = () => {
    return window.localStorage.getItem('vpTabIndex')
  }
  export const saveVpTabIndex = (a: any) => {
    window.localStorage.setItem('vpTabIndex', a);
  }

  // Keywords  
  export const getVpContains = () => {
    return window.localStorage.getItem('vpContains')
  }
  export const getVpStartsWith = () => {
    return window.localStorage.getItem('vpStartsWith')
  }
  export const getVpEndsWith = () => {
    return window.localStorage.getItem('vpEndsWith')
  }
  export const getVpSimilarToThisDomainName = () => {
    return window.localStorage.getItem('vpSimilarToThisDomainName')
  }        
  export const saveVpKeywords = (a: any, b: any, c: any, d: any) => {
    window.localStorage.setItem('vpContains', a);
    window.localStorage.setItem('vpStartsWith', b);
    window.localStorage.setItem('vpEndsWith', c);
    window.localStorage.setItem('vpSimilarToThisDomainName', d);
  }

  // Extensions
  export const getVpExtLeft = (): string[] | null => {
    const store = window.localStorage.getItem('vpExtLeft');
    if (store) {
        return JSON.parse(store) as string[];
    }
    return null;    
  }
  export const getVpExtChecked = (): string[] | null => {
    const store = window.localStorage.getItem('vpExtChecked');
    if (store) {
        return JSON.parse(store) as string[];
    }
    return null;    
  }    
  export const getVpFilterExtLeft = (): string | null => {
    return window.localStorage.getItem('vpFilterExtLeft');
  }  
  export const saveVpExtensions = (a: string[], c: string[], d: any) => {
    window.localStorage.setItem('vpExtLeft', JSON.stringify(a));
    window.localStorage.setItem('vpExtChecked', JSON.stringify(c));
    window.localStorage.setItem('vpFilterExtLeft', d);
  }

  // Characters  
  export const getVpTransform = (): VpTransform | null => {
    const store = window.localStorage.getItem('vpTransform');
    if (store) {
        return JSON.parse(store) as VpTransform;
    }
    return null;    
  }  
  export const getVpMinlength = () => {
    return window.localStorage.getItem('vpMinlength')
  }  
  export const getVpMaxlength = () => {
    return window.localStorage.getItem('vpMaxlength')
  }  
  export const saveVpCharacters = (a: VpTransform, b: any, c: any) => {
    window.localStorage.setItem('vpTransform', JSON.stringify(a));
    window.localStorage.setItem('vpMinlength', b);
    window.localStorage.setItem('vpMaxlength', c);    
  }    
  //-----------------------------------------------------------------------------------------