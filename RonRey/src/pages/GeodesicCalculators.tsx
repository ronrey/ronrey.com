import {
  Button,
  Card,
  CardActions,
  CardContent,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export default function GeodesicCalculators() {
  return (
    <Container sx={{ py: 6 }}>
      <Stack spacing={4}>
        <Stack spacing={1}>
          <Typography variant="h3">Geodesic Calculators</Typography>
          <Typography variant="body1" color="text.secondary">
            Choose the calculator that matches your planning stage. Each tool opens in its own workspace so you can focus on the specific measurements you need.
          </Typography>
        </Stack>
        <Stack spacing={3} direction={{ xs: 'column', md: 'row' }}>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Geodesic Dome Calculator
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Generate strut lengths, panel groupings, and interactive visualization for domes based on diameter and frequency.
              </Typography>
            </CardContent>
            <CardActions sx={{ px: 2, pb: 2 }}>
              <Button
                component={RouterLink}
                to="/howto/geodesic-calculators/dome"
                variant="contained"
              >
                Open Dome Calculator
              </Button>
            </CardActions>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Geodesic Strut Layout Calculator
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Explore panel composition, dihedral angles, and fabrication-ready strut sets for custom greenhouse builds.
              </Typography>
            </CardContent>
            <CardActions sx={{ px: 2, pb: 2 }}>
              <Button
                component={RouterLink}
                to="/howto/geodesic-calculators/strut"
                variant="outlined"
              >
                Open Strut Calculator
              </Button>
            </CardActions>
          </Card>
        </Stack>
      </Stack>
    </Container>
  );
}
