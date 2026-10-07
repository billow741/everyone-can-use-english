import {
  AppSettingsProviderContext,
  AISettingsProviderContext,
} from "@renderer/context";
import { useContext } from "react";
import { ChatMessageHistory, BufferMemory } from "langchain/memory";
import { ConversationChain } from "langchain/chains";
import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { type LLMResult } from "@langchain/core/outputs";
import { v4 } from "uuid";
import { useSpeech } from "./use-speech";

export const useConversation = () => {
  const { EnjoyApp, user, apiUrl } = useContext(AppSettingsProviderContext);
  const { openai } = useContext(AISettingsProviderContext);
  const { tts } = useSpeech();

  const pickLlm = (conversation: ConversationType) => {
    const {
      baseUrl,
      model,
      temperature,
      maxTokens,
      frequencyPenalty,
      presencePenalty,
      numberOfChoices,
    } = conversation.configuration;

    if (conversation.engine === "enjoyai") {
      return new ChatOpenAI({
        openAIApiKey: user.accessToken,
        configuration: {
          baseURL: `${apiUrl}/api/ai`,
        },
        maxRetries: 0,
        modelName: model,
        temperature,
        maxTokens,
        frequencyPenalty,
        presencePenalty,
        n: numberOfChoices,
      });
    } else if (conversation.engine === "openai") {
      if (!openai) throw new Error("OpenAI API key is required");

      return new ChatOpenAI({
        openAIApiKey: openai.key,
        configuration: {
          baseURL: baseUrl || openai.baseUrl,
        },
        maxRetries: 0,
        modelName: model,
        temperature,
        maxTokens,
        frequencyPenalty,
        presencePenalty,
        n: numberOfChoices,
      });
    } else if (conversation.engine === "ollama") {
      return new ChatOllama({
        baseUrl,
        model,
        temperature,
        frequencyPenalty,
        presencePenalty,
        maxRetries: 2,
      });
    }
  };

  const fetchChatHistory = async (conversation: ConversationType) => {
    const chatMessageHistory = new ChatMessageHistory();
    let limit = conversation.configuration.historyBufferSize;
    if (!limit || limit < 0) {
      limit = 0;
    }
    const _messages: MessageType[] = await EnjoyApp.messages.findAll({
      where: { conversationId: conversation.id },
      order: [["createdAt", "DESC"]],
      limit,
    });

    _messages
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() -
          new Date(b.createdAt).getTime()
      )
      .forEach((message) => {
        if (message.role === "user") {
          chatMessageHistory.addUserMessage(message.content);
        } else if (message.role === "assistant") {
          chatMessageHistory.addAIMessage(message.content);
        }
      });

    return chatMessageHistory;
  };

  const chat = async (
    message: Partial<MessageType>,
    params: {
      conversation: ConversationType;
    }
  ): Promise<Partial<MessageType>[]> => {
    const { conversation } = params;

    if (conversation.type === "gpt") {
      return askGPT(message, params);
    } else if (conversation.type === "tts") {
      return askTTS(message, params);
    } else {
      return [];
    }
  };

  /*
   * Ask GPT
   * chat with GPT conversation
   * Use LLM to generate response
   */
  const askGPT = async (
    message: Partial<MessageType>,
    params: {
      conversation: ConversationType;
    }
  ): Promise<Partial<MessageType>[]> => {
    const { conversation } = params;

    // Web Browser or Cloud Hub Mode: Route directly through /api/ai/chat
    const isWeb =
      typeof window !== "undefined" &&
      (!window.__ENJOY_APP__ ||
        window.__ENJOY_APP__.path === "browser-preview" ||
        window.__ENJOY_APP__.path === "browser-storage" ||
        !openai);

    if (isWeb) {
      const chatHistory = await fetchChatHistory(conversation);
      const historyMessages = await chatHistory.getMessages();
      const messagesForApi: Array<{ role: string; content: string }> = [];

      for (const m of historyMessages) {
        const textContent =
          typeof m.content === "string"
            ? m.content
            : (m as any).text || "";
        if (textContent) {
          messagesForApi.push({
            role: m._getType() === "human" ? "user" : "assistant",
            content: textContent,
          });
        }
      }
      if (message.content) {
        messagesForApi.push({
          role: "user",
          content: message.content,
        });
      }

      let replyContent = "";
      try {
        const resp = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: messagesForApi,
            message: message.content,
            conversationId: conversation.id,
          }),
        });
        const data = await resp.json();
        if (data.reply) {
          replyContent = data.reply;
        } else if (data.choices?.[0]?.message?.content) {
          replyContent = data.choices[0].message.content;
        } else if (data.replyEn) {
          replyContent = data.replyEn;
        }
      } catch (err: any) {
        console.error("Cloud AI Gateway error:", err);
      }

      if (replyContent) {
        // Guarantee pure English without Chinese translation
        replyContent = replyContent
          .replace(/\([^)]*[\u4e00-\u9fa5]+[^)]*\)/g, "")
          .replace(/（[^）]*[\u4e00-\u9fa5]+[^）]*）/g, "")
          .replace(/[\u4e00-\u9fa5]+/g, "")
          .trim();
      }

      if (!replyContent) {
        replyContent =
          "Hello my little friend! 🦁 Gangan is here! You are doing great! Let's talk in English! 🌟";
      }

      const reply: MessageType = {
        id: v4(),
        content: replyContent,
        role: "assistant" as MessageRoleEnum,
        conversationId: conversation.id,
      };

      message.role = "user" as MessageRoleEnum;
      message.conversationId = conversation.id;

      await EnjoyApp.messages.createInBatch([message, reply]);

      return [reply];
    }

    const chatHistory = await fetchChatHistory(conversation);
    const memory = new BufferMemory({
      chatHistory,
      memoryKey: "history",
      returnMessages: true,
    });
    const prompt = ChatPromptTemplate.fromMessages([
      ["system" as MessageRoleEnum, conversation.configuration.roleDefinition],
      new MessagesPlaceholder("history"),
      ["human", "{input}"],
    ]);

    const llm = pickLlm(conversation);
    const chain = new ConversationChain({
      llm: llm as any,
      memory,
      prompt: prompt as any,
      verbose: true,
    });
    let response: LLMResult["generations"][0] = [];
    await chain.call({ input: message.content }, [
      {
        handleLLMEnd: async (output) => {
          response = output.generations[0];
        },
      },
    ]);

    const replies = response.map((r) => {
      return {
        id: v4(),
        content: r.text,
        role: "assistant" as MessageRoleEnum,
        conversationId: conversation.id,
      };
    });

    message.role = "user" as MessageRoleEnum;
    message.conversationId = conversation.id;

    await EnjoyApp.messages.createInBatch([message, ...replies]);

    return replies;
  };

  /*
   * Ask TTS
   * chat with TTS conversation
   * It reply with the same text
   * and create speech using TTS
   */
  const askTTS = async (
    message: Partial<MessageType>,
    params: {
      conversation: ConversationType;
    }
  ): Promise<Partial<MessageType>[]> => {
    const { conversation } = params;
    const reply: MessageType = {
      id: v4(),
      content: message.content,
      role: "assistant" as MessageRoleEnum,
      conversationId: conversation.id,
      speeches: [],
    };
    message.role = "user" as MessageRoleEnum;
    message.conversationId = conversation.id;

    const speech = await tts({
      sourceType: "Message",
      sourceId: reply.id,
      text: reply.content,
      configuration: conversation.configuration.tts,
    });
    await EnjoyApp.messages.createInBatch([message, reply]);

    reply.speeches = [speech];

    return [reply];
  };

  return {
    chat,
  };
};
