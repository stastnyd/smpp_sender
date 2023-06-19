import React, { useState, useEffect } from "react";
import DebugLogs from "./debug-logs";
import { count } from "sms-length";
import {
  Button,
  TextField,
  Card,
  CardContent,
  FormControl,
  Select,
  InputLabel,
  MenuItem,
  Paper,
  tabScrollButtonClasses,
} from "@mui/material";
import smpp from "smpp";

const Sender = () => {
  const [sessionState, setSessionState] = useState("Unbound");
  const [session, setSession] = useState(null);
  const [bound, setBound] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);
  const [messageStats, setMessageStats] = useState(null);

  const [connection, setConnection] = useState({
    system_id: "",
    password: "",
    host: "localhost",
    port: 2775,
    connection_type: "trx",
  });

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
              //TODO - Add to UI message status

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
  return (
    <div>
      <div style={{ display: "flex" }}>
        <Card sx={{ margin: "20px", flex: "1 1 50%", minWidth: 0 }}>
          <CardContent>
            <h2>Connection:</h2>

            <FormControl>
              {/* Connection section */}
              <div>
                <TextField
                  label="System ID"
                  name="system_id"
                  required
                  error={!connection.system_id}
                  helperText={!connection.system_id && "System ID is required"}
                  value={connection.system_id}
                  onChange={handleConnectionChange}
                  sx={{ marginBottom: "10px" }}
                />
              </div>

              <div>
                <TextField
                  label="Password"
                  name="password"
                  value={connection.password}
                  error={!connection.password}
                  helperText={!connection.password && "Password is required"}
                  required
                  onChange={handleConnectionChange}
                  sx={{ marginBottom: "10px" }}
                />
              </div>
              <div>
                <TextField
                  label="Host"
                  name="host"
                  value={connection.host}
                  error={!connection.host}
                  helperText={!connection.host && "Host is required"}
                  onChange={handleConnectionChange}
                  sx={{ marginBottom: "10px" }}
                />
              </div>
              <div>
                <TextField
                  label="Port"
                  name="port"
                  type="number"
                  value={connection.port}
                  error={!connection.port}
                  helperText={!connection.port && "Port is required"}
                  onChange={handleConnectionChange}
                  sx={{ marginBottom: "10px" }}
                />
              </div>
              <div>
                <FormControl fullWidth>
                  <InputLabel id="connection-type-label">
                    Connection Type
                  </InputLabel>
                  <Select
                    labelId="connection-type-label"
                    id="connection-type"
                    name="connection_type"
                    value={connection.connection_type || "trx"}
                    onChange={handleConnectionChange}
                    label="Connection type"
                    sx={{ marginBottom: "10px", color: "black" }}
                  >
                    <MenuItem value={"tx"}>TX</MenuItem>
                    <MenuItem value={"rx"}>RX</MenuItem>
                    <MenuItem value={"trx"}>TRX</MenuItem>
                  </Select>
                </FormControl>
              </div>
              {bound ? (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleUnbind}
                >
                  Unbind
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleBind}
                >
                  Bind
                </Button>
              )}
              {/* Session state */}
              <div>
                <h2>Session State:</h2>
                <p color="black">{sessionState}</p>
              </div>
            </FormControl>
          </CardContent>
        </Card>

        <Card sx={{ margin: "20px", flex: "1 1 50%", minWidth: 0 }}>
          <CardContent>
            <h2>General message settings:</h2>
            <form>
              <div>
                <div style={{ display: "flex" }}>
                  <CardContent>
                    <div>
                      <h2>Source:</h2>
                      <div>
                        <TextField
                          label="Source Address"
                          name="source_addr"
                          value={smsOptions.source_addr}
                          onChange={handleSmsOptionChange}
                          required
                          error={!smsOptions.source_addr}
                          helperText={
                            !smsOptions.source_addr &&
                            "Source Address is required"
                          }
                          sx={{ marginBottom: "10px" }}
                        />
                      </div>
                      <div>
                        <TextField
                          label="Source NPI"
                          name="source_addr_npi"
                          type="number"
                          value={smsOptions.source_addr_npi}
                          onChange={handleSmsOptionChange}
                          sx={{ marginBottom: "10px" }}
                        />
                      </div>
                      <div>
                        <TextField
                          label="Source TON"
                          name="source_addr_ton"
                          type="number"
                          value={smsOptions.source_addr_ton}
                          onChange={handleSmsOptionChange}
                        />
                      </div>
                    </div>
                    <div>
                      <h2>Destination:</h2>
                      <div>
                        <TextField
                          label="Destination Address"
                          name="destination_addr"
                          value={smsOptions.destination_addr}
                          required
                          error={!smsOptions.destination_addr}
                          helperText={
                            !smsOptions.destination_addr &&
                            "Source Address is required"
                          }
                          onChange={handleSmsOptionChange}
                          sx={{ marginBottom: "10px" }}
                        />
                      </div>
                      <div>
                        <TextField
                          label="Destination NPI"
                          name="dest_addr_npi"
                          type="number"
                          value={smsOptions.dest_addr_npi}
                          onChange={handleSmsOptionChange}
                          sx={{ marginBottom: "10px" }}
                        />
                      </div>
                      <div>
                        <TextField
                          label="Destination TON"
                          name="dest_addr_ton"
                          type="number"
                          value={smsOptions.dest_addr_ton}
                          onChange={handleSmsOptionChange}
                        />
                      </div>
                    </div>
                    <div>
                      <h2>Coding:</h2>
                      <div>
                        <TextField
                          label="Data Coding"
                          name="data_coding"
                          type="number"
                          value={smsOptions.data_coding}
                          onChange={handleSmsOptionChange}
                          sx={{ marginBottom: "10px" }}
                        />
                      </div>
                      <div>
                        <TextField
                          label="ESM Class"
                          name="esm_class"
                          type="number"
                          value={smsOptions.esm_class}
                          onChange={handleSmsOptionChange}
                          sx={{ marginBottom: "10px" }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      <Card
        variant="outlined"
        sx={{
          margin: "20px",
          overflow: "auto",
          padding: "5px",
          textAlign: "left",
          flex: "1 1 50%",
          minWidth: 0,
          display: "flex",
          width: "100%",
        }}
      >
        <CardContent
          sx={{
            width: "50%",
            paddingRight: "10px",
          }}
        >
          <TextField
            label="Message"
            name="short_message"
            value={smsOptions.short_message}
            onChange={handleSmsOptionChange}
            multiline
            rows={10}
            sx={{ marginBottom: "10px", width: "100%" }}
          />

          <Button variant="contained" color="primary" onClick={handleSendSMS}>
            Send SMS
          </Button>
        </CardContent>

        <Paper
          sx={{
            width: "50%",
            padding: "15px",
            margin: "15px",
            textAlign: "left",
            fontFamily: "monospace",
          }}
        >
          <p style={{ margin: "1px" }}>
            Encoding: {messageStats?.encoding || "N/A"}
          </p>
          <p style={{ margin: "1px" }}>
            Length: {messageStats?.length || "N/A"}
          </p>
          <p style={{ margin: "1px" }}>
            Characters per Message: {messageStats?.characterPerMessage || "N/A"}
          </p>
          <p style={{ margin: "1px" }}>
            In Current Message: {messageStats?.inCurrentMessage || "N/A"}
          </p>
          <p style={{ margin: "1px" }}>
            Remaining: {messageStats?.remaining || "N/A"}
          </p>
          <p style={{ margin: "1px" }}>
            Messages: {messageStats?.messages || "N/A"}
          </p>
        </Paper>
      </Card>

      <Card>
        <CardContent>
          <h2>Debug Logs:</h2>
          <DebugLogs logs={debugLogs} />
        </CardContent>
      </Card>
    </div>
  );
};

export default Sender;
