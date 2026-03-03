import {
  GoogleGenerativeAI,
  type GenerateContentResult,
  type GenerationConfig,
  type Content,
} from "@google/generative-ai";
import { config } from "@/lib/config";
import { calculateCost, getImageCost } from "./models";

// ============================================================
// Singleton client
// ============================================================

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    if (!config.geminiApiKey) {
      throw new Error(
        "GEMINI_API_KEY is not set. Set it in .env.local or enable DEMO_MODE.",
      );
    }
    genAI = new GoogleGenerativeAI(config.geminiApiKey);
  }
  return genAI;
}

// ============================================================
// Response types
// ============================================================

export interface TextGenerationResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface StructuredGenerationResult<T> {
  parsed: T;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface ImageGenerationResult {
  imageBuffer: Buffer;
  costUsd: number;
}

export interface GenerateOptions {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}

// ============================================================
// Text generation
// ============================================================

function extractTokenCounts(result: GenerateContentResult): {
  inputTokens: number;
  outputTokens: number;
} {
  const usage = result.response.usageMetadata;
  return {
    inputTokens: usage?.promptTokenCount ?? 0,
    outputTokens: usage?.candidatesTokenCount ?? 0,
  };
}

/**
 * Generate text with a system prompt and user prompt.
 */
export async function generateText(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  options?: GenerateOptions,
): Promise<TextGenerationResult> {
  const client = getClient();
  const generativeModel = client.getGenerativeModel({
    model,
    systemInstruction: systemPrompt,
  });

  const generationConfig: GenerationConfig = {
    temperature: options?.temperature,
    maxOutputTokens: options?.maxOutputTokens,
    topP: options?.topP,
    topK: options?.topK,
  };

  const result = await generativeModel.generateContent({
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig,
  });

  const text = result.response.text();
  const { inputTokens, outputTokens } = extractTokenCounts(result);
  const costUsd = calculateCost(model, inputTokens, outputTokens);

  return { text, inputTokens, outputTokens, costUsd };
}

/**
 * Generate structured output using Gemini's responseSchema (JSON mode).
 */
export async function generateTextWithSchema<T>(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  responseSchema: GenerationConfig["responseSchema"],
  options?: GenerateOptions,
): Promise<StructuredGenerationResult<T>> {
  const client = getClient();
  const generativeModel = client.getGenerativeModel({
    model,
    systemInstruction: systemPrompt,
  });

  const generationConfig: GenerationConfig = {
    responseMimeType: "application/json",
    responseSchema: responseSchema,
    temperature: options?.temperature,
    maxOutputTokens: options?.maxOutputTokens,
    topP: options?.topP,
    topK: options?.topK,
  };

  const result = await generativeModel.generateContent({
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig,
  });

  const text = result.response.text();
  const parsed = JSON.parse(text) as T;
  const { inputTokens, outputTokens } = extractTokenCounts(result);
  const costUsd = calculateCost(model, inputTokens, outputTokens);

  return { parsed, inputTokens, outputTokens, costUsd };
}

/**
 * Generate text with vision (image input).
 */
export async function generateTextWithVision(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  image: { data: Buffer; mimeType: string },
  responseSchema?: GenerationConfig["responseSchema"],
  options?: GenerateOptions,
): Promise<StructuredGenerationResult<unknown> | TextGenerationResult> {
  const client = getClient();
  const generativeModel = client.getGenerativeModel({
    model,
    systemInstruction: systemPrompt,
  });

  const imagePart = {
    inlineData: {
      data: image.data.toString("base64"),
      mimeType: image.mimeType,
    },
  };

  const generationConfig: GenerationConfig = {
    temperature: options?.temperature,
    maxOutputTokens: options?.maxOutputTokens,
    topP: options?.topP,
    topK: options?.topK,
    ...(responseSchema
      ? { responseMimeType: "application/json", responseSchema }
      : {}),
  };

  const contents: Content[] = [
    {
      role: "user",
      parts: [imagePart, { text: userPrompt }],
    },
  ];

  const result = await generativeModel.generateContent({
    contents,
    generationConfig,
  });

  const text = result.response.text();
  const { inputTokens, outputTokens } = extractTokenCounts(result);
  const costUsd = calculateCost(model, inputTokens, outputTokens);

  if (responseSchema) {
    return { parsed: JSON.parse(text), inputTokens, outputTokens, costUsd };
  }

  return { text, inputTokens, outputTokens, costUsd };
}

/**
 * Generate an image using Gemini's image generation model.
 */
export async function generateImage(
  prompt: string,
  options?: { model?: string },
): Promise<ImageGenerationResult> {
  const client = getClient();
  const model = options?.model ?? config.geminiImageModel;
  const generativeModel = client.getGenerativeModel({ model });

  const result = await generativeModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "image/png",
    },
  });

  const response = result.response;
  const parts = response.candidates?.[0]?.content?.parts;

  if (!parts || parts.length === 0) {
    throw new Error("No image generated in response");
  }

  // Find the inline data part with image data
  for (const part of parts) {
    if (part.inlineData?.data) {
      const imageBuffer = Buffer.from(part.inlineData.data, "base64");
      return { imageBuffer, costUsd: getImageCost() };
    }
  }

  throw new Error("No image data found in response parts");
}
