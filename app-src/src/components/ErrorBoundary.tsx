"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
  title?: string;
  onError?: (error: Error) => void;
}

interface State {
  error: Error | null;
}

/** Nunca deixa o usuário ver uma tela branca. */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[200px] items-center justify-center p-4">
          <Alert variant="destructive" className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{this.props.title ?? "Algo deu errado"}</AlertTitle>
            <AlertDescription className="mt-2">
              Não foi possível carregar esta área agora. Você pode tentar novamente.
            </AlertDescription>
            <div className="mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => this.setState({ error: null })}
              >
                <RefreshCw className="mr-1 h-3.5 w-3.5" /> Tentar novamente
              </Button>
            </div>
          </Alert>
        </div>
      );
    }
    return this.props.children;
  }
}
