import React, { useState, useEffect } from "react";
import { Button, TextField, Card, CardContent } from "@mui/material";
import smpp from "smpp";

type DebugLogsProps = {
  logs: Array<{
    type: string;
    msg: string;
    payload: Record<string, string | number>;
    timestamp: string;
  }>;
};

const DebugLogs: React.FC<DebugLogsProps> = React.memo(({ logs }) => {
  return (
    <Card
      variant="outlined"
      sx={{
        margin: "20px",
        overflow: "auto",
        padding: "5px",
        textAlign: "left",
      }}
    >
      <CardContent>
        {logs.map((log, index) => (
          <div
            key={index}
            style={{
              padding: "5px",
              borderBottom: "1px solid #ccc",
              borderRadius: "4px",
              marginTop: "5px",
              fontFamily: "monospace",
            }}
          >
            <p style={{ margin: "1px" }}>
              <strong>Timestamp:</strong> {log.timestamp}
            </p>{" "}
            <p style={{ margin: "1px" }}>
              <strong>Type:</strong> {log.type}
            </p>
            <p style={{ margin: "1px" }}>
              {" "}
              <strong>Message:</strong> {log.msg}
            </p>
            <strong>Payload:</strong>
            <ul style={{ listStyleType: "none", padding: 0, margin: 0 }}>
              {Object.entries(log.payload ?? {}).map(([key, value]) => (
                <li key={key}>
                  {key}: {String(value)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
});

const Sender = () => {
  const [sessionState, setSessionState] = useState("Unbound");
  const [systemId, setSystemId] = useState("");
  const [password, setPassword] = useState("");
  const [host, setHost] = useState("localhost");
  const [port, setPort] = useState(2775);
  const [session, setSession] = useState(null);
  const [bound, setBound] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);
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

  const handleBind = () => {
    const session = smpp.connect(
      {
        url: `smpp://${host}:${port}`,
        auto_enquire_link_period: 10000,
        debug: true,
      },
      () => {
        session.bind_transceiver(
          {
            system_id: systemId,
            password: password,
          },

          (pdu) => {
            if (pdu.command_status === 0) {
              setSession(session);
              setBound(true);
              setSessionState("Session bound");
            }
          }
        );

        session.on("debug", function (type, msg, payload) {
          addDebugLog(type, msg, payload);
        });

        session.on("deliver_sm", (pdu: any) => {
          const { short_message, ...rest } = pdu;
          const parsedPdu = { ...rest, short_message: short_message.message };
          addDebugLog("deliver_sm", "Deliver SM received", parsedPdu);
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

  const handleSmsOptionChange = (e) => {
    const { name, value } = e.target;
    setSmsOptions((prevOptions) => ({
      ...prevOptions,
      [name]: value,
    }));
  };

  const handleSendSMS = () => {
    if (!session || !bound) {
      console.log("Session is not bound");
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

    const maxMessageLength = 160;

    if (short_message.length > maxMessageLength) {
      const parts = divideIntoParts(short_message, maxMessageLength);

      parts.forEach((part, index) => {
        const udh = `050003${index + 1}${parts.length}`;

        session.submit_sm(
          {
            source_addr,
            destination_addr,
            source_addr_ton,
            source_addr_npi,
            dest_addr_ton,
            dest_addr_npi,
            data_coding,
            esm_class: esm_class | 0x40,
            short_message: part,
            message_payload: udh + part,
          },
          (pdu) => {
            if (pdu.command_status === 0) {
              console.log(
                `Part ${index + 1} of ${parts.length} sent successfully`
              );
            } else {
              console.log(
                `Failed to send part ${index + 1} of ${parts.length}:`,
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
          if (pdu.command_status === 0) {
            console.log("SMS message sent successfully");
          } else {
            console.log("Failed to send SMS message:", pdu);
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

  return (
    <div>
      <div style={{ display: "flex" }}>
        <Card sx={{ margin: "20px", flex: "1 1 50%", minWidth: 0 }}>
          <CardContent>
            <h2>Connection:</h2>

            <form>
              {/* Connection section */}
              <div>
                <TextField
                  label="System ID"
                  required
                  error={!systemId}
                  helperText={!systemId && "System ID is required"}
                  value={systemId}
                  onChange={(e) => setSystemId(e.target.value)}
                  sx={{ marginBottom: "10px" }}
                />
              </div>
              <div>
                <TextField
                  label="Password"
                  value={password}
                  error={!password}
                  helperText={!password && "Password is required"}
                  required
                  onChange={(e) => setPassword(e.target.value)}
                  sx={{ marginBottom: "10px" }}
                />
              </div>
              <div>
                <TextField
                  label="Host"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  sx={{ marginBottom: "10px" }}
                />
              </div>
              <div>
                <TextField
                  label="Port"
                  type="number"
                  value={port}
                  onChange={(e) => setPort(parseInt(e.target.value))}
                  sx={{ marginBottom: "10px" }}
                />
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
            </form>
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
      <Card>
        <CardContent>
          <div>
            <TextField
              label="Short Message"
              name="short_message"
              value={smsOptions.short_message}
              onChange={handleSmsOptionChange}
              multiline
              rows={4}
              sx={{ marginBottom: "10px", width: "100%" }}
            />
          </div>
          <Button variant="contained" color="primary" onClick={handleSendSMS}>
            Send SMS
          </Button>
        </CardContent>
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
