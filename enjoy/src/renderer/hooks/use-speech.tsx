import {
  AppSettingsProviderContext,
  AISettingsProviderContext,
} from "@renderer/context";
import { useContext } from "react";
import OpenAI from "openai";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
let globalAudioInstance: HTMLAudioElement | null = null;

export const stopSpeech = () => {
  if (globalAudioInstance) {
    try {
      globalAudioInstance.pause();
      globalAudioInstance.currentTime = 0;
    } catch {}
    globalAudioInstance = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("sunnybridge-speech-change", {
        detail: { playing: false },
      })
    );
  }
};

export const useSpeech = () => {
  const { EnjoyApp, webApi, user, apiUrl, learningLanguage } = useContext(
    AppSettingsProviderContext
  );
  const { openai, ttsConfig } = useContext(AISettingsProviderContext);

  const tts = async (params: Partial<SpeechType>) => {
    const { configuration } = params;
    const { engine, model, voice } = configuration || ttsConfig;

    let buffer: ArrayBuffer;
    if (openai?.key && model?.match(/^(openai|tts-)/)) {
      buffer = await openaiTTS(params);
    } else if (model?.startsWith("azure") && webApi?.generateSpeechToken) {
      buffer = await azureTTS(params);
    } else {
      const resp = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: params.text,
          voice: voice || "en-US-AnaNeural",
          rate: "-10%",
        }),
      });
      if (resp.ok) {
        buffer = await resp.arrayBuffer();
      } else {
        throw new Error("Edge TTS synthesis failed");
      }
    }

    return EnjoyApp.speeches.create(
      {
        text: params.text,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        section: params.section,
        segment: params.segment,
        configuration: {
          engine: "edge-tts",
          model: "edge/en-US-AnaNeural",
          voice: voice || "en-US-AnaNeural",
        },
      },
      {
        type: "audio/mp3",
        arrayBuffer: buffer,
      }
    );
  };

  const openaiTTS = async (params: Partial<SpeechType>) => {
    const { configuration } = params;
    const {
      engine = ttsConfig.engine,
      model = ttsConfig.model,
      voice = ttsConfig.voice,
      baseUrl,
    } = configuration || {};

    let client: OpenAI;

    if (engine === "enjoyai") {
      client = new OpenAI({
        apiKey: user.accessToken,
        baseURL: `${apiUrl}/api/ai`,
        dangerouslyAllowBrowser: true,
        maxRetries: 1,
      });
    } else if (openai?.key) {
      client = new OpenAI({
        apiKey: openai.key,
        baseURL: baseUrl || openai.baseUrl,
        dangerouslyAllowBrowser: true,
        maxRetries: 1,
      });
    } else {
      throw new Error("尚未配置云端 TTS 语音密钥，已自动启用浏览器高保真朗读");
    }

    const file = await client.audio.speech.create({
      input: params.text,
      model: model.replace("openai/", ""),
      voice,
    });

    return file.arrayBuffer();
  };

  const azureTTS = async (
    params: Partial<SpeechType>
  ): Promise<ArrayBuffer> => {
    const { configuration = ttsConfig, text } = params;
    const { model, voice } = configuration;

    if (model !== "azure/speech") return;

    const { id, token, region } = await webApi.generateSpeechToken({
      purpose: "tts",
      input: text,
    });
    const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(token, region);
    speechConfig.speechRecognitionLanguage = learningLanguage;
    speechConfig.speechSynthesisVoiceName = voice;

    // const speechSynthesizer = new sdk.SpeechSynthesizer(speechConfig, sdk.AudioConfig.fromDefaultSpeakerOutput());
    // Do not playback audio when transcribed
    const speechSynthesizer = new sdk.SpeechSynthesizer(speechConfig, null);

    return new Promise((resolve, reject) => {
      speechSynthesizer.speakTextAsync(
        text,
        (result) => {
          speechSynthesizer.close();

          if (result && result.audioData) {
            webApi.consumeSpeechToken(id);
            resolve(result.audioData);
          } else {
            webApi.revokeSpeechToken(id);
            reject(result);
          }
        },
        (error) => {
          speechSynthesizer.close();
          webApi.revokeSpeechToken(id);
          reject(error);
        }
      );
    });
  };

  const fallbackBrowserSpeech = (
    cleanText: string,
    onStateChange?: (playing: boolean) => void
  ) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      if (onStateChange) onStateChange(false);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voices = window.speechSynthesis.getVoices();
      const enVoice =
        voices.find(
          (v) =>
            v.lang.startsWith("en") &&
            (v.name.includes("Natural") ||
              v.name.includes("Google") ||
              v.name.includes("Samantha") ||
              v.name.includes("Jenny") ||
              v.name.includes("US"))
        ) || voices.find((v) => v.lang.startsWith("en"));

      if (enVoice) utterance.voice = enVoice;
      utterance.lang = "en-US";
      utterance.rate = 0.88;
      utterance.pitch = 1.05;

      if (onStateChange) {
        utterance.onstart = () => onStateChange(true);
        utterance.onend = () => onStateChange(false);
        utterance.onerror = () => onStateChange(false);
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("speechSynthesis error:", err);
      if (onStateChange) onStateChange(false);
    }
  };

  const speak = (
    text: string,
    onStateChange?: (playing: boolean) => void
  ) => {
    stopSpeech();

    const cleanText = text
      .replace(/\([^)]*[\u4e00-\u9fa5]+[^)]*\)/g, "")
      .replace(/（[^）]*[\u4e00-\u9fa5]+[^）]*）/g, "")
      .replace(/[\u4e00-\u9fa5]+/g, "")
      .replace(
        /[\uD800-\uDBFF][\uDC00-\uDFFF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83D[\uDE80-\uDEFF]/g,
        ""
      )
      .replace(/[*_#`~]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) return false;

    const notifyState = (playing: boolean) => {
      if (onStateChange) onStateChange(playing);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("sunnybridge-speech-change", {
            detail: { text: cleanText, rawText: text, playing },
          })
        );
      }
    };

    // 1. Try Microsoft Edge Neural Voice (Ana) via /api/ai/tts
    try {
      const ttsUrl = `/api/ai/tts?text=${encodeURIComponent(cleanText)}&voice=en-US-AnaNeural`;
      const audio = new Audio(ttsUrl);
      globalAudioInstance = audio;

      audio.onplay = () => {
        notifyState(true);
      };

      audio.onended = () => {
        globalAudioInstance = null;
        notifyState(false);
      };

      audio.onerror = () => {
        globalAudioInstance = null;
        fallbackBrowserSpeech(cleanText, notifyState);
      };

      audio.play().catch(() => {
        globalAudioInstance = null;
        fallbackBrowserSpeech(cleanText, notifyState);
      });

      return true;
    } catch (e) {
      fallbackBrowserSpeech(cleanText, notifyState);
      return true;
    }
  };

  return {
    tts,
    speak,
    stop: stopSpeech,
  };
};
