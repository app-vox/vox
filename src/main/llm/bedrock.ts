import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ConverseCommandOutput,
} from "@aws-sdk/client-bedrock-runtime";
import { fromIni } from "@aws-sdk/credential-provider-ini";
import { type LlmProvider } from "./provider";

export interface BedrockConfig {
  region: string;
  profile: string;
  accessKeyId: string;
  secretAccessKey: string;
  modelId: string;
  customPrompt: string;
}

export class BedrockProvider implements LlmProvider {
  private readonly client: BedrockRuntimeClient;
  private readonly modelId: string;
  private readonly customPrompt: string;

  constructor(config: BedrockConfig) {
    this.modelId = config.modelId;
    this.customPrompt = config.customPrompt;

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

  async correct(rawText: string): Promise<string> {
    const hasCustom = this.customPrompt.includes("ADDITIONAL CUSTOM INSTRUCTIONS");
    console.log("[BedrockProvider] Enhancing text, custom prompt:", hasCustom ? "YES" : "NO");

    const command = new ConverseCommand({
      modelId: this.modelId,
      system: [{ text: this.customPrompt }],
      messages: [
        {
          role: "user",
          content: [{ text: rawText }],
        },
      ],
      inferenceConfig: {
        temperature: 0.3,
        maxTokens: 4096,
      },
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
}
