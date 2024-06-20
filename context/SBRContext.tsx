import { createContext, useState, ReactNode, FC } from 'react';

interface SBRContextProps {
  dataUser: any;
  setDataUser: (value: any) => void;  
  credits: any;
  setCredits: (value: any) => void;
  admin: boolean;
  setAdmin: (value: boolean) => void;
  subsTplan: any;
  setSubsTplan: (value: any) => void;
  subsCancel: any;
  setSubsCancel: (value: any) => void;      
}

const SBRContext = createContext<SBRContextProps | undefined>(undefined);

interface SBRProviderProps  {
  children: ReactNode;
}

export const SBRProvider: FC<SBRProviderProps> = ({ children }) => {
  const [dataUser, setDataUser] = useState<any>({
    id: '0',
    name: 'anonymous',
    email: 'anonymous@anonymous.com'
  });
  const [credits, setCredits] = useState<any>(null);
  const [admin, setAdmin] = useState<boolean>(false);    
  const [subsTplan, setSubsTplan] = useState<any>(undefined);
  const [subsCancel, setSubsCancel] = useState<any>(undefined);  

  return (
    <SBRContext.Provider value={{ dataUser, 
                                  setDataUser,
                                  credits, 
                                  setCredits, 
                                  admin, 
                                  setAdmin, 
                                  subsTplan, 
                                  setSubsTplan, 
                                  subsCancel, 
                                  setSubsCancel}}>
      {children}
    </SBRContext.Provider>
  );
};

export default SBRContext;
