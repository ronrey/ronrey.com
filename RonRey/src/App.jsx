import React, { useState, useMemo, useEffect } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import Container from '@mui/material/Container'
import Header from './components/Header'
import Home from './pages/Home'
import GeodesicCalculators from './pages/GeodesicCalculators'
import GeodesicDomeCalculatorPage from './pages/GeodesicDomeCalculatorPage'
import GeodesicStrutCalculatorPage from './pages/GeodesicStrutCalculatorPage'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import getTheme from './theme'
import Box from '@mui/material/Box'

export default function App() {
  const [mode, setMode] = useState(() => {
    try {
      const saved = localStorage.getItem('rr:theme')
      if (saved === 'light' || saved === 'dark') return saved
    } catch (e) {
      /* ignore */
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light'
    }
    return 'dark'
  })

  useEffect(() => {
    try {
      localStorage.setItem('rr:theme', mode)
    } catch (e) {
      /* ignore write errors */
    }
  }, [mode])

  const theme = useMemo(() => getTheme(mode), [mode])

  const toggleMode = () => setMode((m) => (m === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', backgroundImage: theme.custom?.pageBackground }}>
        <BrowserRouter>
          <Header mode={mode} toggleMode={toggleMode} />
          <Container maxWidth="md" sx={{ mt: 4 }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/howto/geodesic-calculators" element={<GeodesicCalculators />} />
              <Route path="/howto/geodesic-calculators/dome" element={<GeodesicDomeCalculatorPage />} />
              <Route path="/howto/geodesic-calculators/strut" element={<GeodesicStrutCalculatorPage />} />
            </Routes>
          </Container>
        </BrowserRouter>
      </Box>
    </ThemeProvider>
  )
}
