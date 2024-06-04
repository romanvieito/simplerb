import { createContext, useState, ReactNode, FC } from 'react';

interface SBRContextProps {
  credits: any;
  setCredits: (value: any) => void;
  admin: boolean;
  setAdmin: (value: boolean) => void;  
}

const SBRContext = createContext<SBRContextProps | undefined>(undefined);

interface SBRProviderProps  {
  children: ReactNode;
}

export const SBRProvider: FC<SBRProviderProps> = ({ children }) => {
  const [credits, setCredits] = useState<any>(null);
  const [admin, setAdmin] = useState<boolean>(false);  

  return (
    <SBRContext.Provider value={{ credits, setCredits, admin, setAdmin }}>
      {children}
    </SBRContext.Provider>
  );
};

export default SBRContext;
