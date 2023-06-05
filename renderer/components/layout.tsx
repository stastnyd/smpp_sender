import React from "react";
import { Box, Skeleton } from "@mui/material";

const Layout = ({ children }) => {
  const companyLogo = null;

  return (
    <Box>
      <header>
        <Box
          display="flex"
          alignItems="center"
          mb={2}
          sx={{
            padding: "10px",
            boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
          }}
        >
          {companyLogo ? (
            <img
              src={companyLogo}
              alt="Company Logo"
              style={{ width: 50, height: 50, borderRadius: "50%" }}
            />
          ) : (
            <Skeleton variant="circular" width={50} height={50} />
          )}
        </Box>
      </header>
      {children}
    </Box>
  );
};

export default Layout;
