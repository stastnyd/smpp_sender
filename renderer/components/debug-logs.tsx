import React from "react";
import {
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

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
    <Accordion>
      <AccordionSummary
        aria-controls="panel1a-content"
        id="panel1a-header"
        expandIcon={<ExpandMoreIcon />}
      >
        <Typography>Debug Logs</Typography>
      </AccordionSummary>
      <AccordionDetails>
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
      </AccordionDetails>
    </Accordion>
  );
});

export default DebugLogs;
