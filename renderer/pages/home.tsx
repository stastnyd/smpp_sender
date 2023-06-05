import React from "react";
import Head from "next/head";
import SmsSender from "../components/sms-sender";


import { styled } from "@mui/material";

const Root = styled("div")(({ theme }) => {
  return {
    textAlign: "center",
    paddingTop: theme.spacing(4),
  };
});

function Home() {
  return (
    <React.Fragment>
      <Head>
        <title>SMPP Sender</title>
      </Head>
      <Root>
        <SmsSender />
      </Root>
    </React.Fragment>
  );
}

export default Home;
