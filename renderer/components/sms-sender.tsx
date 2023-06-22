import React, { useState, useEffect } from "react";
import DebugLogs from "./debug-logs";
import Connection from "./connection";
import GeneralMessageSettings from "./general-message-settings";
import Message from "./message";
import { count } from "sms-length";
import {
  Tab,
  Tabs,
  Box,
  Card,
  CardContent,
  tabScrollButtonClasses,
  Paper,
} from "@mui/material";
import smpp from "smpp";

const Sender = () => {
  const [sessionState, setSessionState] = useState("Unbound");
  const [session, setSession] = useState(null);
  const [bound, setBound] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);
  const [messageStats, setMessageStats] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [smsOptions, setSmsOptions] = useState({
    source_addr: "",
    destination_addr: "",
    source_addr_ton: 5,
    source_addr_npi: 0,
    dest_addr_ton: 1,
    dest_addr_npi: 1,
    data_coding: 0,
    esm_class: 64,
    short_message: "",
  });
  const [connection, setConnection] = useState({
    system_id: "",
    password: "",
    host: "localhost",
    port: 2775,
    connection_type: "trx",
  });

  useEffect(() => {
    setMessageStats(count(smsOptions.short_message));
  }, [smsOptions.short_message]);

  const handleBind = () => {
    const session = smpp.connect(
      {
        url: `smpp://${connection.host}:${connection.port}`,
        auto_enquire_link_period: 10000,
        debug: tabScrollButtonClasses,
        connectionType: connection.connection_type,
      },
      () => {
        session.bind_transceiver(
          {
            system_id: connection.system_id,
            password: connection.password,
          },

          (pdu) => {
            if (pdu.command_status === 0) {
              setSession(session);
              setBound(true);
              addDebugLog("session", "Session Bound", pdu);
              setSessionState("Session bound");
            } else {
              addDebugLog("session", "Connection Error", pdu);
            }
          }
        );

        session.on("deliver_sm", (pdu: any) => {
          const { short_message, ...rest } = pdu;
          const parsedPdu = { ...rest, short_message: short_message.message };
          addDebugLog("deliver_sm", "Deliver SM received", parsedPdu);
          session.send(pdu.response());
        });

        session.on("error", function (error) {
          addDebugLog("session", "Error", error);
        });

        session.on("enquire_link_resp", function (pdu) {
          addDebugLog("enquire_link_resp", "enquire_link_resp", pdu);
        });

        session.on("enquire_link", function (pdu) {
          addDebugLog("enquire_link", "enquire_link", pdu);
          session.send(pdu.response());
        });
      }
    );

    setSession(session);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleUnbind = () => {
    if (session) {
      session.unbind(() => {
        session.close();
        setSession(null);
        setBound(false);
        setSessionState("Unbinded");
      });
    }
  };

  const MAX_LOGS = 5;

  const addDebugLog = (type, msg, payload) => {
    setDebugLogs((prevLogs) => {
      const updatedLogs = [
        {
          type,
          msg,
          payload,
          timestamp: new Date().toLocaleString(),
        },
        ...prevLogs
          .filter(
            (log) =>
              log.type !== "socket.data.in" && log.type !== "socket.data.out"
          )
          .slice(0, MAX_LOGS - 1),
      ];
      return updatedLogs;
    });
  };

  const handleSendSMS = () => {
    if (!session || !bound) {
      addDebugLog("session", "Not Bound", "");
      return;
    }

    const {
      source_addr,
      destination_addr,
      source_addr_ton,
      source_addr_npi,
      dest_addr_ton,
      dest_addr_npi,
      data_coding,
      esm_class,
      short_message,
    } = smsOptions;

    const smsCount = count(short_message);

    if (smsCount.messages > 1) {
      const parts = divideIntoParts(
        short_message,
        smsCount.characterPerMessage
      );
      parts.forEach((part, index) => {
        const udh = Buffer.from([5, 0, 3, 68, parts.length, index + 1]);

        session.submit_sm(
          {
            source_addr,
            destination_addr,
            source_addr_ton,
            source_addr_npi,
            dest_addr_ton,
            dest_addr_npi,
            data_coding,
            esm_class: esm_class,
            short_message: {
              udh: udh,
              message: part,
            },
          },
          (pdu) => {
            addDebugLog("submit_sm", "Message submitted", pdu);
            if (pdu.command_status === 0) {
              addDebugLog(
                "submit_sm",
                `Message Part ${index + 1} of ${
                  parts.length
                } sent successfully`,
                pdu
              );
            } else {
              addDebugLog(
                "submit_sm",
                `Failed to send part ${index + 1} of ${parts.length}`,
                pdu
              );
            }
          }
        );
      });
    } else {
      session.submit_sm(
        {
          source_addr,
          destination_addr,
          source_addr_ton,
          source_addr_npi,
          dest_addr_ton,
          dest_addr_npi,
          data_coding,
          esm_class,
          short_message,
        },
        (pdu) => {
          addDebugLog("submit_sm", "Message submitted", pdu);
          if (pdu.command_status === 0) {
            addDebugLog("submit_sm", "Message sent success", pdu);
          } else {
            addDebugLog("submit_sm", "Failed to send message", pdu);
          }
        }
      );
    }
  };

  const divideIntoParts = (message, maxLength) => {
    const parts = [];
    let remaining = message;

    while (remaining.length > 0) {
      parts.push(remaining.substring(0, maxLength));
      remaining = remaining.substring(maxLength);
    }

    return parts;
  };

  const handleConnectionChange = (e) => {
    const { name, value } = e.target;
    setConnection((prevConnection) => ({
      ...prevConnection,
      [name]: value,
    }));
  };

  const handleSmsOptionChange = (e) => {
    const { name, value } = e.target;
    setSmsOptions((prevOptions) => ({
      ...prevOptions,
      [name]: value,
    }));
  };

  const tabs = [
    {
      label: "Message",
      component: (
        <Message
          smsOptions={smsOptions}
          handleSmsOptionChange={handleSmsOptionChange}
          handleSendSMS={handleSendSMS}
          messageStats={messageStats}
        />
      ),
    },
    {
      label: "Settings",
      component: (
        <Card style={{ display: "flex" }}>
          <Paper
            sx={{
              width: "50%",
              padding: "15px",
              margin: "15px",
              textAlign: "left",
            }}
          >
            <Connection
              connection={connection}
              handleConnectionChange={handleConnectionChange}
              handleUnbind={handleUnbind}
              handleBind={handleBind}
              sessionState={sessionState}
              bound={bound}
            />
          </Paper>
          <Paper
            sx={{
              width: "50%",
              padding: "15px",
              margin: "15px",
              textAlign: "left",
            }}
          >
            <GeneralMessageSettings
              smsOptions={smsOptions}
              handleSmsOptionChange={handleSmsOptionChange}
            />
          </Paper>
        </Card>
      ),
    },
  ];
  return (
    <div>
      <Box sx={{ width: "100%" }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            aria-label="basic tabs example"
          >
            {tabs.map((tab, index) => (
              <Tab key={index} label={tab.label} />
            ))}
          </Tabs>
        </Box>
        {tabs[currentTab].component}
      </Box>

      <div></div>

      <Card>
        <CardContent>
          <DebugLogs logs={debugLogs} />
        </CardContent>
      </Card>
    </div>
  );
};

export default Sender;
