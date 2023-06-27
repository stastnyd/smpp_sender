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
  TextField,
  Paper,
  Button,
  Table,
  TableContainer,
  TableRow,
  TableCell,
  TableBody,
  TableHead,
} from "@mui/material";
import smpp from "smpp";

interface TLV {
  tag: string;
  value: string;
  type: string;
  description: string;
}

const Sender = () => {
  const [sessionState, setSessionState] = useState("Unbound");
  const [session, setSession] = useState(null);
  const [bound, setBound] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);
  const [tlvs, setTlvs] = useState([]);
  const [tlvData, setTlvData] = useState({
    tag: "",
    value: "",
    type: "",
    description: "",
  });
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
              setSessionState(
                `Session bound, command status ${pdu.command_status}`
              );
            } else {
              setSessionState(
                `Connection error, command status ${pdu.command_status}`
              );
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

        session.on("unbind_resp", function (pdu) {
          setSessionState(
            `Session unbinded, command status ${pdu.command_status}`
          );
          addDebugLog("unbind_resp", "unbind_resp", pdu);
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
      console.log;
      session.unbind(() => {
        session.close();
        setSession(null);
        setBound(false);
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
            tlvs: tlvs,
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
          tlvs: tlvs,
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
  const handleAddTlv = () => {
    setTlvs((prevTlvs) => [...prevTlvs, tlvData]);
    console.log(tlvs);
    setTlvData({
      tag: "",
      value: "",
      type: "",
      description: "",
    });
  };
  const handleTlvFieldChange = (e) => {
    const { name, value } = e.target;

    setTlvData((prevTlvData) => ({
      ...prevTlvData,
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
              width: "30%",
              padding: "15px",
              margin: "15px",
              textAlign: "left",
              borderColor: "white",
              boxShadow: "none",
            }}
            component="fieldset"
          >
            <legend>Connection</legend>
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
              width: "40%",
              padding: "15px",
              margin: "15px",
              textAlign: "center",
              borderColor: "white",
              boxShadow: "none",
            }}
            component="fieldset"
          >
            <legend>Message Settings</legend>
            <GeneralMessageSettings
              smsOptions={smsOptions}
              handleSmsOptionChange={handleSmsOptionChange}
            />
          </Paper>
          <Box
            sx={{
              width: "40%",
              padding: "15px",
              margin: "15px",
              textAlign: "left",
              borderColor: "white",
              boxShadow: "none",
            }}
            component="fieldset"
          >
            <legend>TLV Settings</legend>
            <Box
              sx={{
                padding: "15px",
                margin: "15px",
                textAlign: "left",
                borderColor: "white",
                boxShadow: "none",
              }}
            >
              <div>
                <div>
                  <TextField
                    label="Tag"
                    name="tag"
                    value={tlvData.tag}
                    onChange={handleTlvFieldChange}
                    sx={{ marginBottom: "10px" }}
                  />
                </div>
                <div>
                  <TextField
                    label="Value"
                    name="value"
                    value={tlvData.value}
                    onChange={handleTlvFieldChange}
                    sx={{ marginBottom: "10px" }}
                  />
                </div>
                <div>
                  <TextField
                    label="Type"
                    name="type"
                    value={tlvData.type}
                    onChange={handleTlvFieldChange}
                    sx={{ marginBottom: "10px" }}
                  />
                </div>
                <div>
                  <TextField
                    label="Description"
                    name="description"
                    value={tlvData.description}
                    onChange={handleTlvFieldChange}
                    sx={{ marginBottom: "10px" }}
                  />
                </div>
              </div>

              <div>
                <h2>Added TLVs:</h2>
                <TableContainer component={Paper}>
                  <Table aria-label="simple table">
                    <TableHead>
                      <TableRow>
                        <TableCell>Tag</TableCell>
                        <TableCell align="right">Value</TableCell>
                        <TableCell align="right">Type</TableCell>
                        <TableCell align="right">Description</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tlvs.map((tlv, index) => (
                        <TableRow key={index}>
                          <TableCell component="th" scope="row">
                            {tlv.tag}
                          </TableCell>
                          <TableCell align="right">{tlv.value}</TableCell>
                          <TableCell align="right">{tlv.type}</TableCell>
                          <TableCell align="right">{tlv.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
            </Box>
            <Button variant="contained" color="primary" onClick={handleAddTlv}>
              Add TLV
            </Button>
          </Box>
        </Card>
      ),
    },
  ];
  return (
    <div>
      <Box>
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

      <Card>
        <CardContent>
          <DebugLogs logs={debugLogs} />
        </CardContent>
      </Card>
    </div>
  );
};

export default Sender;
