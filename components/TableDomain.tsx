import { DomainInfo, DomainInfoArray, DomainInfoItem } from "../utils/Definitions";
import { Toaster, toast } from "react-hot-toast";
import mixpanel from "../utils/mixpanel-config";
import React, { useState } from 'react';
import { Table, TableHead, TableBody, TableCell, TableContainer, TableRow, Paper, TablePagination, Tooltip, Switch, Button } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  saveDomainFounded,
} from "../utils/LocalStorage";
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { useUser } from "@clerk/nextjs";

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '80%',
  bgcolor: 'background.paper',
  border: '1px #000',
  boxShadow: 24,
  p: 2,
  maxHeight: '90vh', // Establece la altura máxima del contenedor
  overflow: 'auto'   // Activa el desplazamiento automático  
};

const checkAvailability = async (domain: string) => {  
  try {    
    const response = await fetch("/api/check-availability", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ domains: [domain] }),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if(!data) return -1;

    mixpanel.track("Checked availability successful", {
      // You can add properties to the event as needed
      domain: data[0].domain,
      available: data[0].available
    });

    if(data[0].available) return true;
    
    return false;
  } catch (error: any) {
    mixpanel.track("Checked availability with error", {
      // You can add properties to the event as needed
      domain: domain,
      available: undefined,
      error: error
    });    
    throw new Error(error);
  }
};

const checkUserDomainFavorite = async (domain: DomainInfo, user: any) => {  

  const email = user?.emailAddresses[0].emailAddress;

  try {
    const resp1 = await fetch(`/api/getUser?email=${email}`);
    if (!resp1.ok) {
      throw new Error("Network response was not ok");
    }

    const userData = await resp1.json();

    const namedomain = domain.domain;
    const available = domain.available;
    const favorite = domain.favorite;
    const rate = domain.rate;
    const users_id = userData.user.rows[0].id;

    const data = {
      namedomain,
      available,
      favorite,
      rate,
      users_id
    };

    const resp2 = await fetch('/api/user-domainfavorite', {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!resp2.ok) {
      throw new Error(
        "Network response was not ok. Failed to set users domain favorite"
      );
    }    
    toast(
      (t) => (
        <div>
          { favorite ? <>Check favorite</> : <>Uncheck favorite</>}
        </div>
      ),
      {
        icon: favorite ? "❤️" : "🖤",
        duration: 5000,
      }
    );    
    mixpanel.track("Checked domain favorite", {
      domain: namedomain,
      favorite: favorite
    });
  } catch (error) {
    console.error("Error checking domain favorite:", error);
    mixpanel.track("Checked domain favorite with error", {
      domain: domain.domain,
      favorite: domain.favorite,
      error: error
    });    
  }
};

const checkBuyDomain = async (domain: string) => {
    toast(
      (t) => (
        <div>
          Buy domain for <b>{domain}</b> coming soon
        </div>
      ),
      {
        icon: "🔍",
      }
    );
    // Mixpanel tracking for button click
    mixpanel.track("Buy domain", {
      // You can add properties to the event as needed
      domain: domain,
    });
};

const checkSocialNetworks = async (domain: string) => {
    toast(
      (t) => (
        <div>
          Checking social networks for <b>{domain}</b> coming soon
        </div>
      ),
      {
        icon: "🔍",
      }
    );
    // Mixpanel tracking for button click
    mixpanel.track("Check Socials", {
      // You can add properties to the event as needed
      domain: domain,
    });
};

const getCleanDomainName = (dinfo: any) => {
    return dinfo.domain.replace(
        /^\d+\.\s*/,
        ""
    );
}

const CellDomain: React.FC<DomainInfoItem> = ({ dinfo, admin }) => {
    const cleanDomainName = dinfo.domain.replace(/^\d+\.\s*/, "");
    return admin ? (
      <>
        <Box>
          <a
            href={`http://${cleanDomainName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg font-medium mr-4 flex-1 hover:underline"
          >
            {cleanDomainName}
          </a>
        </Box>
      </>
    ) : (
      <>
        <Box>{cleanDomainName}</Box>
      </>
    );  
};

const CellResultAvailability: React.FC<DomainInfoItem> = ({ dinfo }) => {
  return (
    <>
      {dinfo.available===undefined ? <span></span> : dinfo.available ? <span> ✔</span> : <span> ❌</span>} 
    </>
  );  
};

const CellFavorite = ({ domain, domains, functiondf, user } : { domain : DomainInfo, domains: DomainInfo[], functiondf: any, user: any }) => {  
  const [isLoading, setIsLoading] = useState(false);
  return (
    <Tooltip title={!domain.favorite ? "Mask a favorite" : "Unmark as favorite"} disableHoverListener={domain.available}>
      <IconButton
        disabled={isLoading} 
        onClick={()=>{
          const updateDomain = [...domains];
          updateDomain.forEach(async (elem) => {
            if (elem.domain === domain.domain) {
                if(elem.favorite === undefined || !elem.favorite)
                  elem.favorite = true;
                else if(elem.favorite)
                  elem.favorite = false;            
                try {
                  setIsLoading(true);
                  await checkUserDomainFavorite(domain, user);
                  setIsLoading(false);
                } catch (error: any) {
                  toast(
                    (t) => (
                      <div>
                        <span>{error}</span>
                      </div>
                    ),
                    {
                      icon: "🔴",
                      duration: 5000,
                    }
                  );                
                  return;
                }
            }
          });
          functiondf(updateDomain);
          saveDomainFounded(updateDomain);        
        }} 
        aria-label="add to favorites">
        {domain.favorite ? <FavoriteIcon color="primary" /> : <FavoriteBorderIcon />}
      </IconButton>
    </Tooltip>    
  );  
};

const CellCheckAvailability = ({ domain, domains, functiondf } : { domain : DomainInfo, domains: DomainInfo[], functiondf: any }) => {  
  const [isLoading, setIsLoading] = useState(false);    
  return (
    <IconButton aria-label="toggle visibility">
      <Tooltip
        title={
          <div>
            <p>Check domain availability</p>
            <p><span>✔</span>: Available</p>
            <p><span>❌</span>: Not available</p>
          </div>
        }
      >
        <span>
          <IconButton 
              onClick={async () => {
                setIsLoading(true);
                try {
                  const result = await checkAvailability(domain.domain);
                  setIsLoading(false);
                  if(result === -1) {
                    toast(
                      (t) => (
                        <div>
                          <span>Failed to get data. Let's try again</span>
                        </div>
                      ),
                      {
                        icon: "🔴",
                        duration: 5000,
                      }
                    );
                  } else {
                    toast(
                      (t) => (
                        <div>
                          { result ? <>Domain available</> : <>Domain not available</>}
                        </div>
                      ),
                      {
                        icon: result ? "✔" : "❌",
                        duration: 5000,
                      }
                    );             
                    const updateDomain = [...domains];
                    updateDomain.forEach(elem => {
                      if (elem.domain === domain.domain) {
                          elem.available = result;
                      }
                    });
                    functiondf(updateDomain);
                    saveDomainFounded(updateDomain);
                  } 
                } catch (error: any) {
                  toast(
                    (t) => (
                      <div>
                        <span>{error}</span>
                      </div>
                    ),
                    {
                      icon: "🔴",
                      duration: 5000,
                    }
                  );            
                }          
              }} 
              disabled={isLoading}
              color="primary"
          >
            <VisibilityIcon />
          </IconButton>
        </span>
      </Tooltip>      
    </IconButton>
  )
};

const CellRate: React.FC<DomainInfoItem> = ({ dinfo, admin }) => {
    /*return (
      admin ? 
      <>
        <span className="text-lg font-medium mr-4 flex-1 hover:underline">{dinfo.rate}</span>
      </> : 
      <>*
      </>
    )*/
    return (
      <>
        <span className="text-lg font-medium mr-4 flex-1 hover:underline">{dinfo.rate}</span>
      </>
    )  
};

const CellBuyDomain: React.FC<DomainInfoItem> = ({ dinfo, admin }) => {
    /*return (
        admin ? 
        <>
        <Tooltip title={!dinfo.available ? "Check its availability to buy it" : ""} disableHoverListener={dinfo.available}>
          <span>
          <Button
              disabled={!dinfo.available}
              onClick={() => checkBuyDomain(getCleanDomainName(dinfo))}
              variant="contained"
              color="primary"
            >Buy</Button>            
          </span>
        </Tooltip>        
        </> : 
        <>
        </>
    )*/
    return (
      <Tooltip title={!dinfo.available ? "Check its availability to buy it" : ""} disableHoverListener={dinfo.available}>
      <span>
      <Button
          disabled={!dinfo.available}
          onClick={() => checkBuyDomain(getCleanDomainName(dinfo))}
          variant="contained"
          color="primary"
        >Buy</Button>            
      </span>
    </Tooltip>      
    )
};

const CellCheckSocials: React.FC<DomainInfoItem> = ({ dinfo, admin }) => {
    /*return (
        admin ? 
        <>
        <button
            onClick={() =>
                checkSocialNetworks(getCleanDomainName(dinfo))
            }
            className="ml-4 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
        >
            Check Socials
        </button>
        </> : 
        <>
        </>
    )*/
    return (
      <button
          onClick={() =>
              checkSocialNetworks(getCleanDomainName(dinfo))
          }
          className="ml-4 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
      >
          Check Socials
      </button>
    )    
};

const TableDomain: React.FC<DomainInfoArray> = ({ rows, admin, functionDomainFounded }) => {
  
  const { user } = useUser();

  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Calcular opciones dinámicas para filas por página
  const rowsPerPageOptions = [5, 10, 25].filter(option => option <= rows.length);

  const handleChangePage = (event: any, newPage: React.SetStateAction<number>) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: any) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Restablecer a la primera página con los nuevos `rowsPerPage`
  };

  return (
    <Paper sx={{ overflow: "hidden" }}>
      <TableContainer className="mx-2">
        <Table stickyHeader aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell align="left"></TableCell>
              {/* <TableCell align="center">
                Status{" "}
                {!admin && (
                  <>
                    <Tooltip
                      title={
                        <div>
                          <p>*Premium feature</p>
                        </div>
                      }
                    >
                      <span className="info-icon cursor-pointer">&#x24D8;</span>
                    </Tooltip>
                  </>
                )}
              </TableCell> */}
              <TableCell align="center">
                Rating{" "}
                {/*!admin ? (
                  <>
                    <Tooltip
                      title={
                        <div>
                          <p>*{" "}Premium feature</p>
                        </div>
                      }
                    >
                      <span className="info-icon cursor-pointer">&#x24D8;</span>
                    </Tooltip>
                  </>
                ) : */(
                  <>
                    <Tooltip
                      title={
                        <div>
                          <p>Click to learn about domain rating</p>
                        </div>
                      }
                    >
                      <span
                        className="info-icon cursor-pointer"
                        onClick={handleOpen}
                      >
                        &#x24D8;
                      </span>
                    </Tooltip>
                    <Modal
                      open={open}
                      onClose={handleClose}
                      aria-labelledby="modal-modal-title"
                      aria-describedby="modal-modal-description"
                    >
                      <Box sx={style}>
                        <Typography
                          id="modal-modal-title"
                          variant="h6"
                          component="h2"
                        >
                          Domain Scoring Guide
                        </Typography>
                        <Typography id="modal-modal-description" sx={{ mt: 2 }}>
                          <p>
                            Our scoring system evaluates each domain name based
                            on three key attributes (Memorability, Simplicity,
                            Brevity), ensuring it aligns well with branding and
                            user experience goals. Each category is scored from
                            0 to 10, with 10 being the highest.
                          </p>
                          <br />
                          <p>
                            - Memorability (0-10): This score reflects how
                            easily a domain name can be remembered. High scores
                            indicate names that are catchy and leave a lasting
                            impression, making them great for word-of-mouth
                            advertising and repeat visits.
                          </p>
                          <p>
                            - Simplicity (0-10): This score assesses how
                            straightforward a domain name is to spell and
                            pronounce. Names that score high are devoid of
                            complex spellings or pronunciations, reducing the
                            risk of confusion and enhancing user recall.
                          </p>
                          <p>
                            - Brevity (0-10): This score evaluates the length of
                            the domain name. Shorter names score higher because
                            they are quicker to type, easier to remember, and
                            less susceptible to typographical errors.
                          </p>
                          <br />
                          <p>Example:</p>
                          <p>"QuickPet.com" Rating: 7.7</p>
                          <p>
                            - Memorability: 8/10 - Catchy and fun, easy to
                            remember.
                          </p>
                          <p>
                            - Simplicity: 9/10 - Simple, straightforward
                            spelling and pronunciation.
                          </p>
                          <p>
                            - Brevity: 6/10 - Concise but with eight characters.
                          </p>
                        </Typography>
                      </Box>
                    </Modal>
                  </>
                )}
              </TableCell>
              {/* <TableCell></TableCell> */}
              {/* <TableCell></TableCell> */}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row, index) => (
                <TableRow key={index}>
                  <TableCell component="th" scope="row">
                    <section style={{ display: 'flex', alignItems: 'center' }}>
                      <CellDomain dinfo={row} admin={admin} />
                      <CellCheckAvailability domain={row} domains={rows} functiondf={functionDomainFounded}/>
                      <CellResultAvailability dinfo={row}/>
                      <CellFavorite domain={row} domains={rows} functiondf={functionDomainFounded} user={user}/>
                    </section>
                    <CellBuyDomain dinfo={row} admin={admin} />
                    <CellCheckSocials dinfo={row} admin={admin} />
                  </TableCell>
                  <TableCell align="center">
                    <CellRate dinfo={row} admin={admin} />
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      {/* <TablePagination
        rowsPerPageOptions={rowsPerPageOptions}
        component="div"
        count={rows.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      /> */}
    </Paper>
  );
};

export default TableDomain;