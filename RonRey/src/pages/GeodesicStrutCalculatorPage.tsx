import { Button, Container, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import GeodesicStrutCalc from '../components/GeodesicStrutCalc';

export default function GeodesicStrutCalculatorPage() {
  return (
    <Container sx={{ py: 6 }}>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="h3">Geodesic Strut Layout Calculator</Typography>
          <Typography variant="body1" color="text.secondary">
            Fine-tune panel composition, dihedral angles, and strut groupings for precision fabrication workflows.
          </Typography>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button component={RouterLink} to="/howto/geodesic-calculators/dome" variant="outlined">
            Switch to Dome Calculator
          </Button>
          <Button component={RouterLink} to="/howto/geodesic-calculators" variant="text">
            Back to Geodesic Calculators
          </Button>
        </Stack>
        <GeodesicStrutCalc />
      </Stack>
    </Container>
  );
}
