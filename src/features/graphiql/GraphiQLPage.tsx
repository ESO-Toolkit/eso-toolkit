import { Container, AppBar, Toolbar, Typography, Box } from '@mui/material';
import { GraphiQL } from 'graphiql';
import 'graphiql/style.css';
import { buildSchema } from 'graphql';
import React, { useEffect, useState } from 'react';

const GRAPHQL_ENDPOINT = '/graphql'; // Change this to your actual endpoint if needed

const fetcher = async (graphQLParams: Record<string, unknown>) => {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(graphQLParams),
  });
  return response.json();
};

const GraphiQLPage: React.FC = () => {
  const [schema, setSchema] = useState<import('graphql').GraphQLSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/schema.graphql')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch schema.graphql');
        return res.text();
      })
      .then((schemaSource) => {
        setSchema(buildSchema(schemaSource));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div>Loading GraphQL schema...</div>;
  }
  if (error) {
    return <div>Error loading schema: {error}</div>;
  }

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
        <GraphiQL fetcher={fetcher} schema={schema} />
      </Box>
    </Container>
  );
};

export default GraphiQLPage;

