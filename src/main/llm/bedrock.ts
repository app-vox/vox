import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ConverseCommandOutput,
} from "@aws-sdk/client-bedrock-runtime";
import { fromIni } from "@aws-sdk/credential-provider-ini";
import log from "electron-log/main";
import { BaseLlmProvider } from "./base-provider";

export interface BedrockConfig {
  region: string;
  profile: string;
  accessKeyId: string;
  secretAccessKey: string;
  modelId: string;
  customPrompt: string;
  hasCustomPrompt: boolean;
}

export class BedrockProvider extends BaseLlmProvider {
  protected readonly providerName = "Bedrock";
  private readonly client: BedrockRuntimeClient;
  private readonly modelId: string;
  private readonly customPromptText: string;
  private readonly customPromptEnabled: boolean;

  constructor(config: BedrockConfig) {
    super();
    this.modelId = config.modelId;
    this.customPromptText = config.customPrompt;
    this.customPromptEnabled = config.hasCustomPrompt;

    const clientConfig: Record<string, unknown> = {
      region: config.region,
    };

    if (config.accessKeyId && config.secretAccessKey) {
      // Explicit credentials take priority
      clientConfig.credentials = {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      };
    } else if (config.profile) {
      // Named profile from ~/.aws/credentials
      clientConfig.credentials = fromIni({ profile: config.profile });
    }
    // Otherwise the SDK uses the default credential chain

    this.client = new BedrockRuntimeClient(clientConfig);
  }

  protected async enhance(rawText: string): Promise<string> {
    const command = new ConverseCommand({
      modelId: this.modelId,
      system: [{ text: this.customPromptText }],
      messages: [
        {
          role: "user",
          content: [{ text: rawText }],
        },
      ],
      inferenceConfig: {
        temperature: 0.1,
        maxTokens: 4096,
      },
    });

    log.scope(this.providerName).debug("Bedrock request", {
      modelId: this.modelId,
      temperature: 0.1,
    });

    const response: ConverseCommandOutput = await this.client.send(command);

    const textBlock = response.output?.message?.content?.find(
      (block) => "text" in block,
    );

    if (!textBlock || !("text" in textBlock) || !textBlock.text) {
      throw new Error("LLM returned no text content");
    }

    return textBlock.text.trim();
  }

  protected hasCustomPrompt(): boolean {
    return this.customPromptEnabled;
  }

  protected getCustomPrompt(): string {
    return this.customPromptText;
  }
}
