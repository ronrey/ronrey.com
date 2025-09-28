import { createTheme } from "@mui/material/styles";

const darkBg = "linear-gradient(180deg,#071022 0%, #071026 40%, #07102a 100%)";
const lightBg = "linear-gradient(180deg,#ffffff 0%, #f2f6ff 40%, #eef4ff 100%)";

const getTheme = (mode = "dark") =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: "#4f46e5",
        contrastText: "#fff",
      },
      secondary: {
        main: mode === "dark" ? "#06b6d4" : "#0ea5a5",
      },
      background: {
        default: mode === "dark" ? "#071022" : "#f6fbff",
        paper: mode === "dark" ? "#06121a" : "#ffffff",
      },
      text: {
        primary: mode === "dark" ? "#e6eef8" : "#0b1b2b",
        secondary: mode === "dark" ? "#9fb0c8" : "#5b6b7c",
      },
    },
    typography: {
      fontFamily: ["Inter", "system-ui", "Arial", "sans-serif"].join(","),
      h4: { fontWeight: 700 },
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            transition: "background-color 200ms linear, color 200ms linear",
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backdropFilter: "saturate(120%) blur(6px)",
          },
        },
      },
    },
    custom: {
      pageBackground: mode === "dark" ? darkBg : lightBg,
    },
  });

export default getTheme;
