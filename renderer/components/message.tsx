import React, { ChangeEvent } from "react";
import { TextField, Button, Card, CardContent, Paper } from "@mui/material";

interface MessageProps {
  smsOptions: {
    short_message: string;
  };
  handleSmsOptionChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  handleSendSMS: () => void;
  messageStats?: {
    encoding: string;
    length: string;
    characterPerMessage: string;
    inCurrentMessage: string;
    remaining: string;
    messages: string;
  };
}

const Message: React.FC<MessageProps> = ({
  smsOptions,
  handleSmsOptionChange,
  handleSendSMS,
  messageStats,
}) => {
  return (
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
        <p style={{ margin: "1px" }}>Length: {messageStats?.length || "N/A"}</p>
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
  );
};

export default Message;
