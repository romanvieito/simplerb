import {
  DomainInfo,
  DomainInfoArray,
  DomainInfoItem,
} from "../utils/Definitions";
import { Toaster, toast } from "react-hot-toast";
import mixpanel from "../utils/mixpanel-config";
import React, { useState, useContext } from "react";
import {
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  TablePagination,
  Tooltip,
  Switch,
  Button,
} from "@mui/material";
import IconButton from "@mui/material/IconButton";
import { saveDomainFounded } from "../utils/LocalStorage";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import SBRContext from "../context/SBRContext";
import CPricing from "./CPricing";
import Link from "next/link";

const style = {
  position: "absolute" as "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "80%",
  bgcolor: "background.paper",
  border: "1px #000",
  boxShadow: 24,
  p: 2,
  maxHeight: "90vh", // Establece la altura máxima del contenedor
  overflow: "auto", // Activa el desplazamiento automático
};

const setUserByEmail = async (credits: number, email: string) => {
  try {
    const payload = {
      credits,
      // other fields to update...
    };

    const response = await fetch(`/api/editUser?email=${email}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        "Network response was not ok. Failed to set user by email"
      );
    }

    const updatedUserData = await response.json();
    // Do something with the response, such as returning it or setting state.
    return updatedUserData;
  } catch (error: any) {
    throw new Error(error);
  }
};

const checkAvailability = async (domain: string) => {
  try {
    const response = await fetch("/api/check-availability-godaddy", {
      //"/api/check-availability-godaddy"
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

    //console.log('data-check-availability', data);

    if (!data) return -1;

    mixpanel.track("Checked availability successful", {
      // You can add properties to the event as needed
      domain: data[0].domain,
      available: data[0].available,
    });

    if (data[0].available) return true;

    return false;
  } catch (error: any) {
    mixpanel.track("Checked availability with error", {
      // You can add properties to the event as needed
      domain: domain,
      available: undefined,
      error: error,
    });
    throw new Error(error);
  }
};

const checkUserDomainFavorite = async (domain: DomainInfo, email: string) => {
  try {
    const resp1 = await fetch(`/api/getUser?email=${email}`);
    if (!resp1.ok) {
      throw new Error("Network response was not ok");
    }

    const userData = await resp1.json();

    const namedomain = domain.domain;
    const available = domain.available;
    const favorite = domain.favorite;
    const rate = domain.rate ? domain.rate : -1;
    const users_id = userData.user.rows[0].id;

    const data = {
      namedomain,
      available,
      favorite,
      rate,
      users_id,
    };

    const resp2 = await fetch("/api/user-domainfavorite", {
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
          {favorite ? (
            <>Save {namedomain} as favorite</>
          ) : (
            <>Unchecked {namedomain} as favorite</>
          )}
        </div>
      ),
      {
        icon: favorite ? "❤️" : "🖤",
        duration: 5000,
      }
    );
    mixpanel.track("Checked domain favorite", {
      domain: namedomain,
      favorite: favorite,
    });
  } catch (error) {
    console.error("Error checking domain favorite:", error);
    mixpanel.track("Checked domain favorite with error", {
      domain: domain.domain,
      favorite: domain.favorite,
      error: error,
    });
  }
};

const getCleanDomainName = (dinfo: any) => {
  return dinfo.domain.replace(/^\d+\.\s*/, "");
};

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

const SpanResultAvailability: React.FC<DomainInfoItem> = ({ dinfo }) => {
  return (
    <>
      {dinfo.available === undefined ? (
        <span></span>
      ) : dinfo.available ? (
        <span> ✔</span>
      ) : (
        <span> ❌</span>
      )}
    </>
  );
};

const CellFavorite = ({
  domain,
  domains,
  functiondf,
  email,
}: {
  domain: DomainInfo;
  domains: DomainInfo[];
  functiondf: any;
  email: string;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  return (
    <Tooltip
      title={!domain.favorite ? "Save as favorite" : "Uncheck favorite"}
      placement="top"
    >
      <span>
        <IconButton
          disabled={isLoading}
          onClick={() => {
            const updateDomain = [...domains];
            updateDomain.forEach(async (elem) => {
              if (elem.domain === domain.domain) {
                if (elem.favorite === undefined || !elem.favorite)
                  elem.favorite = true;
                else if (elem.favorite) elem.favorite = false;
                try {
                  setIsLoading(true);
                  await checkUserDomainFavorite(domain, email);
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
          aria-label="add to favorites"
        >
          {domain.favorite ? (
            <FavoriteIcon color="primary" />
          ) : (
            <FavoriteBorderIcon />
          )}
        </IconButton>
      </span>
    </Tooltip>
  );
};

const CellRate: React.FC<DomainInfoItem> = ({ dinfo, admin }) => {
  /*return (
      admin ? 
      <>
      </> : 
      <>*
      </>
    )*/
  return (
    <>
      <Tooltip
        title={
          <div>
            <p>Rating details</p>
            <p>
              <span>Memorability</span>: {dinfo.memorability}
            </p>
            <p>
              <span>Simplicity</span>: {dinfo.simplicity}
            </p>
            <p>
              <span>Brevity</span>: {dinfo.brevity}
            </p>
          </div>
        }
      >
        <span className="text-lg font-medium mr-4 flex-1 hover:underline">
          {dinfo.rate}
        </span>
      </Tooltip>
    </>
  );
};

const ButtonCheckAvailability = ({
  domain,
  domains,
  functiondf,
  plan,
}: {
  domain: DomainInfo;
  domains: DomainInfo[];
  functiondf: any;
  plan: string;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [openPricing, setOpenPricing] = React.useState(false);

  const closePricing = () => setOpenPricing(false);

  const handleCheckAvailability = () => {
    const cleanDomainName = domain.domain.replace(/^\d+\.\s*/, "");
    const namecheapUrl = `https://www.namecheap.com/domains/registration/results/?domain=${cleanDomainName}`;
    window.open(namecheapUrl, "_blank");

    mixpanel.track("Check Domain Availability", {
      domain: cleanDomainName,
      plan: plan,
    });
  };

  return (
    <div>
      <span>
        <button
          className="bg-blue-600 rounded-xl text-white font-medium px-4 py-2 sm:mt-2 mt-2 hover:bg-gray-300 hover:text-black w-full flex items-center justify-center"
          onClick={handleCheckAvailability}
          disabled={isLoading}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
          Check availability
        </button>
      </span>
      <div>
        <Modal
          open={openPricing}
          onClose={closePricing}
          aria-labelledby="modal-modal-title"
          aria-describedby="modal-modal-description"
        >
          <Box sx={style}>
            <Typography id="modal-modal-description" sx={{ mt: 2 }}>
              <CPricing />
            </Typography>
          </Box>
        </Modal>
      </div>
    </div>
  );
};

// const ButtonBuyDomain: React.FC<DomainInfoItem> = ({
//   dinfo,
//   admin,
//   email,
//   cr,
//   functioncr,
// }) => {
//   /*return (
//         admin ?
//         <>
//         </> :
//         <>
//         </>
//     )*/
//   return (
//     <Tooltip
//       title={!dinfo.available ? "Check its availability to buy it" : ""}
//       disableHoverListener={dinfo.available}
//     >
//       <span>
//         <button
//           className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-2 mt-2 hover:bg-gray-300 hover:text-black w-full"
//           disabled={!dinfo.available}
//           onClick={async () => {
//             const d = getCleanDomainName(dinfo);
//             if (cr! > 0) {
//               functioncr((prevCredits: number) => prevCredits - 1);
//               try {
//                 await setUserByEmail(cr! - 1, email!);
//                 toast(
//                   (t) => (
//                     <div>
//                       Buy domain for <b>{d}</b> coming soon
//                     </div>
//                   ),
//                   {
//                     icon: "🔍",
//                   }
//                 );
//                 mixpanel.track("Buy domain", {
//                   domain: d,
//                 });
//               } catch (error: any) {
//                 toast(
//                   (t) => (
//                     <div>
//                       Error<b>{error}</b>
//                     </div>
//                   ),
//                   {
//                     icon: "🔴",
//                   }
//                 );
//               }
//             }
//           }}
//         >
//           Get Domain
//         </button>
//       </span>
//     </Tooltip>
//   );
// };

// const ButtonCheckSocials: React.FC<DomainInfoItem> = ({
//   dinfo,
//   admin,
//   email,
//   cr,
//   functioncr,
// }) => {
//   /*return (
//         admin ?
//         <>
//         </> :
//         <>
//         </>
//     )*/
//   return (
//     <Tooltip
//       title={!dinfo.available ? "Check its availability to buy it" : ""}
//       disableHoverListener={dinfo.available}
//     >
//       <span>
//         <button
//           className="bg-white border border-black rounded-xl text-black font-medium px-4 py-2 sm:mt-2 mt-2 hover:bg-gray-300 w-full"
//           disabled={!dinfo.available}
//           onClick={async () => {
//             const d = getCleanDomainName(dinfo);
//             if (cr! > 0) {
//               functioncr((prevCredits: number) => prevCredits - 1);
//               try {
//                 await setUserByEmail(cr! - 1, email!);
//                 toast(
//                   (t) => (
//                     <div>
//                       Checking social networks for <b>{d}</b> coming soon
//                     </div>
//                   ),
//                   {
//                     icon: "🔍",
//                   }
//                 );
//                 mixpanel.track("Check Socials", {
//                   domain: d,
//                 });
//               } catch (error: any) {
//                 toast(
//                   (t) => (
//                     <div>
//                       Error<b>{error}</b>
//                     </div>
//                   ),
//                   {
//                     icon: "🔴",
//                   }
//                 );
//               }
//             }
//           }}
//         >
//           Check Socials
//         </button>
//       </span>
//     </Tooltip>
//   );
// };

const buttonStyle =
  "bg-blue-600 rounded-xl text-white font-medium px-4 py-2 sm:mt-2 mt-2 hover:bg-gray-300 hover:text-black w-full";

const ButtonCreateWebsite: React.FC<DomainInfoItem> = ({ dinfo, admin }) => {
  const cleanDomainName = getCleanDomainName(dinfo);

  return (
    <Tooltip
      title={!dinfo.available ? "Create a website with this domain" : ""}
      disableHoverListener={dinfo.available}
    >
      <span>
        <Link
          href={`/web?domain=${encodeURIComponent(cleanDomainName)}`}
          passHref
        >
          <button className={buttonStyle} disabled={!dinfo.available}>
            <span className="flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z"
                  clipRule="evenodd"
                />
              </svg>
              Create Website
            </span>
          </button>
        </Link>
      </span>
    </Tooltip>
  );
};

const ButtonCreateAds: React.FC<DomainInfoItem> = ({ dinfo, admin }) => {
  const cleanDomainName = getCleanDomainName(dinfo);

  return (
    <Tooltip
      title={!dinfo.available ? "Create ads for this domain" : ""}
      disableHoverListener={dinfo.available}
    >
      <span>
        <Link
          href={`/ads?domain=${encodeURIComponent(cleanDomainName)}`}
          passHref
        >
          <button className={buttonStyle} disabled={!dinfo.available}>
            <span className="flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z"
                  clipRule="evenodd"
                />
                <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
              </svg>
              Create Ads
            </span>
          </button>
        </Link>
      </span>
    </Tooltip>
  );
};

const TableDomain: React.FC<DomainInfoArray> = ({
  rows,
  admin,
  email,
  functionDomainFounded,
  cred,
  functionCred,
}) => {
  const [open, setOpen] = React.useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const context = useContext(SBRContext);
  if (!context) {
    throw new Error("SBRContext must be used within a SBRProvider");
  }
  const { subsTplan } = context;

  // Calcular opciones dinámicas para filas por página
  const rowsPerPageOptions = [5, 10, 25].filter(
    (option) => option <= rows.length
  );

  const handleChangePage = (
    event: any,
    newPage: React.SetStateAction<number>
  ) => {
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
              <TableCell align="left">
                {subsTplan === "CREATOR" || subsTplan === "STARTER" ? (
                  <p className="text-lg mr-4 flex-1 font-bold">
                    Top Domains Available Now:
                  </p>
                ) : (
                  <p className="text-lg font-bold mr-4 flex-1">
                    Best Possible Domains:
                  </p>
                )}
              </TableCell>
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
                {
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
                }
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
                    <section style={{ display: "flex", alignItems: "center" }}>
                      <CellDomain dinfo={row} admin={admin} />
                      <CellFavorite
                        domain={row}
                        domains={rows}
                        functiondf={functionDomainFounded}
                        email={email}
                      />
                      {subsTplan !== "CREATOR" && subsTplan !== "STARTER" && (
                        <SpanResultAvailability dinfo={row} />
                      )}
                    </section>
                    {row.available &&
                    (subsTplan === "CREATOR" || subsTplan === "STARTER") ? (
                      <>
                        <Box display="flex" justifyContent="flex-start">
                          <div style={{ marginRight: "16px" }}>
                            <ButtonCreateWebsite dinfo={row} admin={admin} />
                          </div>
                          <ButtonCreateAds dinfo={row} admin={admin} />
                        </Box>
                      </>
                    ) : (
                      <>
                        <ButtonCheckAvailability
                          domain={row}
                          domains={rows}
                          functiondf={functionDomainFounded}
                          plan={subsTplan}
                        />
                      </>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <CellRate dinfo={row} />
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
