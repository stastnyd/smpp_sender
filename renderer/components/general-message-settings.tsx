import React, { ChangeEvent } from "react";
import {
  TextField,
  FormControl,
  CardContent,
  Typography,
  Box,
} from "@mui/material";

interface GeneralMessageSettingsProps {
  smsOptions: {
    source_addr: string;
    source_addr_npi: number;
    source_addr_ton: number;
    destination_addr: string;
    dest_addr_npi: number;
    dest_addr_ton: number;
    data_coding: number;
    esm_class: number;
  };
  handleSmsOptionChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
}

const GeneralMessageSettings: React.FC<GeneralMessageSettingsProps> = ({
  smsOptions,
  handleSmsOptionChange,
}) => {
  return (
    <FormControl>
      <CardContent sx={{ display: "flex", width: "100%" }}>
        <Box>
          <TextField
            label="Source Address"
            name="source_addr"
            value={smsOptions.source_addr}
            onChange={handleSmsOptionChange}
            required
            error={!smsOptions.source_addr}
            helperText={!smsOptions.source_addr && "Source Address is required"}
            sx={{ margin: "10px" }}
            size="small"
          />

          <TextField
            label="Source NPI"
            name="source_addr_npi"
            type="number"
            value={smsOptions.source_addr_npi}
            onChange={handleSmsOptionChange}
            sx={{ margin: "10px" }}
            size="small"
          />

          <TextField
            label="Source TON"
            name="source_addr_ton"
            type="number"
            value={smsOptions.source_addr_ton}
            onChange={handleSmsOptionChange}
            size="small"
            sx={{ margin: "10px" }}
          />
        </Box>
        <Box>
          <TextField
            label="Destination Address"
            name="destination_addr"
            value={smsOptions.destination_addr}
            required
            error={!smsOptions.destination_addr}
            helperText={
              !smsOptions.destination_addr && "Source Address is required"
            }
            onChange={handleSmsOptionChange}
            sx={{ margin: "10px" }}
            size="small"
          />

          <TextField
            label="Destination NPI"
            name="dest_addr_npi"
            type="number"
            value={smsOptions.dest_addr_npi}
            onChange={handleSmsOptionChange}
            size="small"
            sx={{ margin: "10px" }}
          />
          <TextField
            label="Destination TON"
            name="dest_addr_ton"
            type="number"
            value={smsOptions.dest_addr_ton}
            onChange={handleSmsOptionChange}
            size="small"
            sx={{ margin: "10px" }}
          />
        </Box>
      </CardContent>

      <CardContent sx={{ width: "50%" }}>
        <TextField
          label="Data Coding"
          name="data_coding"
          type="number"
          value={smsOptions.data_coding}
          onChange={handleSmsOptionChange}
          sx={{ margin: "10px" }}
          size="small"
        />

        <TextField
          label="ESM Class"
          name="esm_class"
          type="number"
          value={smsOptions.esm_class}
          onChange={handleSmsOptionChange}
          sx={{ margin: "10px" }}
          size="small"
        />
      </CardContent>
    </FormControl>
  );
};

export default GeneralMessageSettings;
