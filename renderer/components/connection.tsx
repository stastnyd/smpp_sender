import React from "react";
import {
  CardContent,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Stack,
} from "@mui/material";

interface ConnectionProps {
  connection: any;
  handleConnectionChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  handleUnbind: () => void;
  handleBind: () => void;
  sessionState: string;
  bound: boolean;
}

const Connection: React.FC<ConnectionProps> = ({
  connection,
  handleConnectionChange,
  handleUnbind,
  handleBind,
  sessionState,
  bound,
}) => (
  <CardContent>
    <Stack spacing={2}>
      <FormControl>
        <TextField
          label="System ID"
          name="system_id"
          required
          error={!connection.system_id}
          helperText={!connection.system_id && "System ID is required"}
          value={connection.system_id}
          onChange={handleConnectionChange}
          sx={{ margin: "10px" }}
          size="small"
        />

        <TextField
          label="Password"
          name="password"
          value={connection.password}
          error={!connection.password}
          helperText={!connection.password && "Password is required"}
          required
          onChange={handleConnectionChange}
          sx={{ margin: "10px" }}
          size="small"
        />

        <TextField
          label="Host"
          name="host"
          value={connection.host}
          error={!connection.host}
          helperText={!connection.host && "Host is required"}
          onChange={handleConnectionChange}
          sx={{ margin: "10px" }}
          size="small"
        />

        <TextField
          label="Port"
          name="port"
          type="number"
          value={connection.port}
          error={!connection.port}
          helperText={!connection.port && "Port is required"}
          onChange={handleConnectionChange}
          sx={{ margin: "10px" }}
          size="small"
        />

        <FormControl fullWidth>
          <InputLabel id="connection-type-label">Connection Type</InputLabel>
          <Select
            labelId="connection-type-label"
            id="connection-type"
            name="connection_type"
            value={connection.connection_type || "trx"}
            onChange={handleConnectionChange}
            label="Connection type"
            sx={{ margin: "10px", color: "black" }}
            size="small"
          >
            <MenuItem value={"tx"}>TX</MenuItem>
            <MenuItem value={"rx"}>RX</MenuItem>
            <MenuItem value={"trx"}>TRX</MenuItem>
          </Select>
        </FormControl>

        {bound ? (
          <Button
            variant="contained"
            color="primary"
            onClick={handleUnbind}
            sx={{ margin: "10px" }}
          >
            Unbind
          </Button>
        ) : (
          <Button
            variant="contained"
            color="primary"
            onClick={handleBind}
            sx={{ margin: "10px" }}
          >
            Bind
          </Button>
        )}
      </FormControl>

      <Box
        sx={{
          width: "100%",
          padding: "15px",
          margin: "15px",
          textAlign: "left",
          fontFamily: "monospace",
          borderColor: "white",
          boxShadow: "none",
        }}
        component="fieldset"
      >
        <legend>Session State</legend>

        <p color="black">{sessionState}</p>
      </Box>
    </Stack>
  </CardContent>
);

export default Connection;
