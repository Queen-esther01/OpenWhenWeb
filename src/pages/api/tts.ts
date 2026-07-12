import type { NextApiRequest, NextApiResponse } from "next";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { Readable } from "node:stream";

type TtsErrorResponse = {
  error: string;
};

const apiKey = process.env.ELEVENLABS_API_KEY;

function getTextBody(req: NextApiRequest) {
  const { text, voiceId, modelId } = req.body ?? {};

  return {
    text: typeof text === "string" ? text.trim() : "",
    voiceId: typeof voiceId === "string" ? voiceId.trim() : "",
    modelId: typeof modelId === "string" && modelId.trim() ? modelId.trim() : "eleven_v3",
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TtsErrorResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!apiKey) {
    return res.status(500).json({
      error: "Missing ELEVENLABS_API_KEY environment variable.",
    });
  }

  const { text, voiceId, modelId } = getTextBody(req);

  if (!text) {
    return res.status(400).json({ error: "`text` is required." });
  }

  if (!voiceId) {
    return res.status(400).json({ error: "`voiceId` is required." });
  }

  const client = new ElevenLabsClient({ apiKey });

  try {
    const { data, rawResponse } = await client.textToSpeech
      .convert(voiceId, {
        text,
        modelId: modelId,
      })
      .withRawResponse();

    const contentType =
      rawResponse.headers.get("content-type") ?? "audio/mpeg";

    res.status(200);
    res.setHeader("Content-Type", contentType);

    const characterCost = rawResponse.headers.get("character-cost");
    const requestId = rawResponse.headers.get("request-id");
    const traceId = rawResponse.headers.get("x-trace-id");

    if (characterCost) {
      res.setHeader("character-cost", characterCost);
    }

    if (requestId) {
      res.setHeader("request-id", requestId);
    }

    if (traceId) {
      res.setHeader("x-trace-id", traceId);
    }

    (Readable.fromWeb as any)(data).pipe(res as any);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate speech.";
    return res.status(500).json({ error: message });
  }
}