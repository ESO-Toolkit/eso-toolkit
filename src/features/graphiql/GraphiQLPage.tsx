import React from 'react';
import { Container, AppBar, Toolbar, Typography, Box } from '@mui/material';
import { GraphiQL } from 'graphiql';
import 'graphiql/style.css';
import { buildSchema } from 'graphql';

// @ts-ignore
import schemaSource from './schema.graphql?raw';

const schema = buildSchema(schemaSource);

const GraphiQLPage: React.FC = () => {
  const dummyFetcher = async () => {
    // Always returns empty data
    return { data: {} };
  };

  return (
    <Container maxWidth="xl" disableGutters>
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            GraphiQL Explorer
          </Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ height: 'calc(100vh - 64px)', width: '100%' }}>
        <GraphiQL fetcher={dummyFetcher} schema={schema} />
      </Box>
    </Container>
  );
};

export default GraphiQLPage;
