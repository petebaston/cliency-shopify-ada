import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Page,
  Card,
  EmptyState,
  Button,
  Text,
  LegacyStack,
  Banner,
} from '@shopify/polaris';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // In production, send error to monitoring service
    if (process.env.REACT_APP_ENV === 'production') {
      // sendErrorToService(error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    
    // Reload the page
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Page title="Oops! Something went wrong">
          <Card sectioned>
            <EmptyState
              heading="An unexpected error occurred"
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              action={{
                content: 'Reload Page',
                onAction: this.handleReset,
              }}
              secondaryAction={{
                content: 'Go to Dashboard',
                onAction: () => window.location.href = '/',
              }}
            >
              <p>
                We're sorry for the inconvenience. The error has been logged and our team will look into it.
              </p>
              
              {process.env.REACT_APP_ENV === 'development' && this.state.error && (
                <div style={{ marginTop: '20px' }}>
                  <Banner status="critical" title="Error Details (Development Only)">
                    <LegacyStack vertical>
                      <Text variant="bodyMd" as="p">
                        <strong>Error:</strong> {this.state.error.message}
                      </Text>
                      {this.state.errorInfo && (
                        <details style={{ marginTop: '10px' }}>
                          <summary style={{ cursor: 'pointer' }}>Stack Trace</summary>
                          <pre style={{
                            marginTop: '10px',
                            padding: '10px',
                            background: '#f4f4f4',
                            borderRadius: '4px',
                            fontSize: '12px',
                            overflow: 'auto',
                          }}>
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </details>
                      )}
                    </LegacyStack>
                  </Banner>
                </div>
              )}
            </EmptyState>
          </Card>
        </Page>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;