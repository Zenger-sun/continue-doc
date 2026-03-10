/**
 * Shared type definitions for aiDocExtra
 */

/** A chat message stored for documentation */
export interface DocMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  include: boolean;
  timestamp: number;
  model?: string;
}

/** YAML configuration schema */
export interface AiDocConfig {
  doc: {
    rules: string;
    output_dir: string;
    prompt_template?: string;
  };
  publish: {
    target: string;
    zhihu?: {
      cookie: string;
    };
    medium?: {
      api_token: string;
    };
    devto?: {
      api_token: string;
    };
  };
}

/** Publish result */
export interface PublishResult {
  success: boolean;
  url?: string;
  message: string;
}
