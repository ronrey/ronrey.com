import React from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import BoxIcon from '@mui/icons-material/AccountTree'
import DomeIcon from '@mui/icons-material/Architecture'
import { keyframes } from '@mui/system'
import Container from '@mui/material/Container'
import { Link as RouterLink } from 'react-router-dom'

export default function Home() {
  return (
    <Box sx={{
      minHeight: '68vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Container maxWidth="lg">
        <Box sx={{ position: 'relative', mb: 6 }}>
          <Box
            component="svg"
            viewBox="0 0 800 200"
            preserveAspectRatio="none"
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: -1,
              width: '100%',
              height: { xs: 160, md: 220 },
              opacity: 0.08,
            }}
          >
            <linearGradient id="g1" x1="0" x2="1">
              <stop offset="0" stopColor="#4f46e5" />
              <stop offset="1" stopColor="#06b6d4" />
            </linearGradient>
            <path d="M0,120 C150,200 350,40 800,120 L800,200 L0,200 Z" fill="url(#g1)" />
          </Box>

          <Typography variant="h3" component="h1" sx={{ fontWeight: 800, mb: 2 }}>
            Build with geometry in mind
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 3, maxWidth: 720 }}>
            Interactive geodesic calculators, visualization, and export tools to size struts and panels for domes and curved structures. Start with a calculator below and iterate quickly.
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: 'background.paper' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DomeIcon color="primary" />
                    <Typography variant="h5">Geodesic Dome Calculator</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Generate unique strut lengths and panel groupings from a target diameter and frequency. Includes a 3D canvas preview and CSV export.
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" component={RouterLink} to="/howto/geodesic-calculators/dome" variant="contained">
                    Open Dome Calculator
                  </Button>
                </CardActions>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: 'background.paper' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BoxIcon color="secondary" />
                    <Typography variant="h5">Geodesic Strut Layout</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Tune strut outer/inner lengths and bevels for wood or metal fabrication. Visualize inner/outer layers and export fabrication-ready tables.
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" component={RouterLink} to="/howto/geodesic-calculators/strut" variant="outlined">
                    Open Strut Calculator
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>Quick links</Typography>
          <Grid container spacing={1}>
            <Grid item>
              <Button component={RouterLink} to="/howto/geodesic-calculators" variant="text">All Geodesic Tools</Button>
            </Grid>
            <Grid item>
              <Button component={RouterLink} to="/howto/geodesic-calculators/dome" variant="text">Dome</Button>
            </Grid>
            <Grid item>
              <Button component={RouterLink} to="/howto/geodesic-calculators/strut" variant="text">Strut</Button>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  )
}
