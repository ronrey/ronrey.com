import { Button, Container, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import GeodesicDomeCalculator from '../components/GeodesicDomeCalculator';

export default function GeodesicDomeCalculatorPage() {
  return (
    <Container sx={{ py: 6 }}>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="h3">Geodesic Dome Calculator</Typography>
          <Typography variant="body1" color="text.secondary">
            Determine dome strut lengths, panel groupings, and 3D visualization based on your target diameter and frequency.
          </Typography>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button
            component={RouterLink}
            to="/howto/geodesic-calculators/strut"
            variant="outlined"
          >
            Switch to Strut Layout Calculator
          </Button>
          <Button component={RouterLink} to="/howto/geodesic-calculators" variant="text">
            Back to Geodesic Calculators
          </Button>
        </Stack>
        <GeodesicDomeCalculator />
      </Stack>
    </Container>
  );
}
