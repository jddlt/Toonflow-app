/**
 * uni-media 供应商适配
 * @version 2.4
 */

// ============================================================
// 类型定义
// ============================================================

type VideoMode =
  | "singleImage"
  | "startEndRequired"
  | "endFrameOptional"
  | "startFrameOptional"
  | "text"
  | (`videoReference:${number}` | `imageReference:${number}` | `audioReference:${number}`)[];

interface TextModel {
  name: string;
  modelName: string;
  type: "text";
  think: boolean;
}

interface ImageModel {
  name: string;
  modelName: string;
  type: "image";
  mode: ("text" | "singleImage" | "multiReference")[];
  associationSkills?: string;
}

interface VideoModel {
  name: string;
  modelName: string;
  type: "video";
  mode: VideoMode[];
  associationSkills?: string;
  audio: "optional" | false | true;
  durationResolutionMap: { duration: number[]; resolution: string[] }[];
}

interface TTSModel {
  name: string;
  modelName: string;
  type: "tts";
  voices: { title: string; voice: string }[];
}

interface VendorConfig {
  id: string;
  version: string;
  name: string;
  author: string;
  description?: string;
  icon?: string;
  inputs: { key: string; label: string; type: "text" | "password" | "url"; required: boolean; placeholder?: string }[];
  inputValues: Record<string, string>;
  models: (TextModel | ImageModel | VideoModel | TTSModel)[];
}

type ReferenceList =
  | { type: "image"; sourceType: "base64"; base64: string }
  | { type: "audio"; sourceType: "base64"; base64: string }
  | { type: "video"; sourceType: "base64"; base64: string };

interface ImageConfig {
  prompt: string;
  referenceList?: Extract<ReferenceList, { type: "image" }>[];
  size: "1K" | "2K" | "4K";
  aspectRatio: `${number}:${number}`;
}

interface VideoConfig {
  duration: number;
  resolution: string;
  aspectRatio: "16:9" | "9:16";
  prompt: string;
  referenceList?: ReferenceList[];
  audio?: boolean;
  mode: VideoMode[];
}

interface TTSConfig {
  text: string;
  voice: string;
  speechRate: number;
  pitchRate: number;
  volume: number;
  referenceList?: Extract<ReferenceList, { type: "audio" }>[];
}

interface PollResult {
  completed: boolean;
  data?: string;
  error?: string;
}

// ============================================================
// 全局声明
// ============================================================

declare const axios: any;
declare const logger: (msg: string) => void;
declare const jsonwebtoken: any;
declare const zipImage: (base64: string, size: number) => Promise<string>;
declare const zipImageResolution: (base64: string, w: number, h: number) => Promise<string>;
declare const mergeImages: (base64Arr: string[], maxSize?: string) => Promise<string>;
declare const urlToBase64: (url: string) => Promise<string>;
declare const pollTask: (fn: () => Promise<PollResult>, interval?: number, timeout?: number) => Promise<PollResult>;
declare const createOpenAI: any;
declare const createDeepSeek: any;
declare const createZhipu: any;
declare const createQwen: any;
declare const createAnthropic: any;
declare const createOpenAICompatible: any;
declare const createXai: any;
declare const createMinimax: any;
declare const createGoogleGenerativeAI: any;
declare const exports: {
  vendor: VendorConfig;
  textRequest: (m: TextModel, t: boolean, tl: 0 | 1 | 2 | 3) => any;
  imageRequest: (c: ImageConfig, m: ImageModel) => Promise<string>;
  videoRequest: (c: VideoConfig, m: VideoModel) => Promise<string>;
  ttsRequest: (c: TTSConfig, m: TTSModel) => Promise<string>;
  checkForUpdates?: () => Promise<{ hasUpdate: boolean; latestVersion: string; notice: string }>;
  updateVendor?: () => Promise<string>;
};

// ============================================================
// 供应商配置
// ============================================================

const imageModel = (
  name: string,
  modelName: string,
  mode: ("text" | "singleImage" | "multiReference")[],
  supportedResolutions: string[],
  referenceImageLimits: { min: number; max: number },
  allowedInputTypes: string[],
  supportsImageEdit: boolean,
) => ({
  name,
  modelName,
  type: "image" as const,
  mode,
  supportedResolutions,
  referenceImageLimits,
  allowedInputTypes,
  supportsImageEdit,
});

const videoModel = (
  name: string,
  modelName: string,
  mode: VideoMode[],
  supportedResolutions: string[],
  supportedDurations: number[],
  referenceImageLimits: { min: number; max: number },
  allowedInputTypes: string[],
) => ({
  name,
  modelName,
  type: "video" as const,
  mode,
  audio: false as const,
  durationResolutionMap: [{ duration: supportedDurations, resolution: supportedResolutions }],
  supportedResolutions,
  supportedDurations,
  referenceImageLimits,
  allowedInputTypes,
});

const vendor: VendorConfig = {
  id: "uni-media",
  version: "2.4",
  author: "Toonflow",
  name: "uni-media",
  description: "## uni-media\n\n统一多媒体网关适配，当前支持图片生成、图片编辑、视频生成。该供应商不是通用文本模型供应商，因此不会提供文本模型。",
  inputs: [
    { key: "apiKey", label: "API密钥", type: "password", required: true },
    { key: "baseUrl", label: "请求地址", type: "url", required: true, placeholder: "示例：https://media.349000.xyz/v1" },
  ],
  inputValues: {
    apiKey: "",
    baseUrl: "https://media.349000.xyz/v1",
  },
  models: [
    imageModel(
      "Gemini 3.0 Pro Image",
      "gemini-3.0-pro-image",
      ["text", "singleImage", "multiReference"],
      ["1024x576", "576x1024", "1024x1024", "1024x768", "768x1024", "2048x1152", "1152x2048", "2048x2048", "2048x1536", "1536x2048", "4096x2304", "2304x4096", "4096x4096", "4096x3072", "3072x4096"],
      { min: 0, max: 14 },
      ["text", "image_url"],
      true,
    ),
    imageModel(
      "Gemini 3.1 Flash Image",
      "gemini-3.1-flash-image",
      ["text", "singleImage", "multiReference"],
      ["1024x576", "576x1024", "1024x1024", "1024x768", "768x1024", "2048x1152", "1152x2048", "2048x2048", "2048x1536", "1536x2048", "4096x2304", "2304x4096", "4096x4096", "4096x3072", "3072x4096"],
      { min: 0, max: 3 },
      ["text", "image_url"],
      true,
    ),
    imageModel(
      "Grok Image",
      "grok-image",
      ["text", "singleImage", "multiReference"],
      ["1792x1024", "1024x1792", "1024x1024", "1280x720", "720x1280"],
      { min: 0, max: 3 },
      ["text", "image_url"],
      true,
    ),
    imageModel(
      "Grok Image Fast",
      "grok-image-fast",
      ["text", "singleImage", "multiReference"],
      ["1792x1024", "1024x1792", "1024x1024", "1280x720", "720x1280"],
      { min: 0, max: 3 },
      ["text", "image_url"],
      true,
    ),
    imageModel(
      "Grok Image Pro",
      "grok-image-pro",
      ["text", "singleImage", "multiReference"],
      ["1792x1024", "1024x1792", "1024x1024", "1280x720", "720x1280"],
      { min: 0, max: 3 },
      ["text", "image_url"],
      true,
    ),
    imageModel(
      "Imagen 4.0",
      "imagen-4.0",
      ["text", "singleImage"],
      ["1024x576", "576x1024", "2048x1152", "1152x2048"],
      { min: 0, max: 1 },
      ["text", "image_url"],
      true,
    ),
    imageModel(
      "Qwen Image",
      "qwen-image",
      ["text"],
      ["1024x1024", "1024x768", "768x1024", "1024x576", "576x1024", "2048x2048", "2048x1536", "1536x2048", "2048x1152", "1152x2048"],
      { min: 0, max: 0 },
      ["text"],
      false,
    ),
    imageModel(
      "Qwen Image Edit",
      "qwen-image-edit",
      ["singleImage", "multiReference"],
      ["1024x1024", "1024x768", "768x1024", "1024x576", "576x1024", "2048x2048", "2048x1536", "1536x2048", "2048x1152", "1152x2048"],
      { min: 1, max: 4 },
      ["text", "image_url"],
      true,
    ),
    imageModel(
      "Z Image Turbo",
      "z-image-turbo",
      ["text"],
      ["1024x1024", "1024x768", "768x1024", "1024x576", "576x1024", "2048x2048", "2048x1536", "1536x2048", "2048x1152", "1152x2048"],
      { min: 0, max: 0 },
      ["text"],
      false,
    ),
    videoModel(
      "Grok Video",
      "grok-video",
      ["text", "singleImage"],
      ["1280x720", "720x1280", "720x720", "1080x720", "720x1080"],
      [6, 10, 12, 16, 20],
      { min: 0, max: 1 },
      ["text", "image_url"],
    ),
    videoModel(
      "Veo 3.1",
      "veo-3.1",
      ["text", "singleImage", "startEndRequired"],
      ["1280x720", "720x1280", "1920x1080", "1080x1920", "3840x2160", "2160x3840"],
      [8],
      { min: 0, max: 2 },
      ["text", "image_url"],
    ),
    videoModel(
      "Veo 3.1 Fast",
      "veo-3.1-fast",
      ["text", "singleImage", "startEndRequired"],
      ["1280x720", "720x1280", "1920x1080", "1080x1920", "3840x2160", "2160x3840"],
      [8],
      { min: 0, max: 2 },
      ["text", "image_url"],
    ),
    videoModel(
      "Veo 3.1 Lite",
      "veo-3.1-lite",
      ["text", "singleImage", "startEndRequired"],
      ["1280x720", "720x1280", "1920x1080", "1080x1920"],
      [8],
      { min: 0, max: 2 },
      ["text", "image_url"],
    ),
    videoModel(
      "Veo 3.1 R2V Fast",
      "veo-3.1-r2v-fast",
      ["singleImage", ["imageReference:6"]],
      ["1280x720", "720x1280", "1920x1080", "1080x1920", "3840x2160", "2160x3840"],
      [8],
      { min: 1, max: 6 },
      ["text", "image_url"],
    ),
  ],
};

// ============================================================
// 辅助工具
// ============================================================

const getApiKey = () => {
  if (!vendor.inputValues.apiKey) throw new Error("缺少API Key");
  return vendor.inputValues.apiKey.replace(/^Bearer\s+/i, "");
};

const getBaseUrl = () => {
  const baseUrl = (vendor.inputValues.baseUrl || "").trim().replace(/\/+$/, "");
  if (!baseUrl) throw new Error("缺少请求地址");
  return baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl}/v1`;
};

const getHeaders = () => ({
  Authorization: `Bearer ${getApiKey()}`,
  "Content-Type": "application/json",
});

const getErrorMessage = (data: any, status?: number) => {
  if (data?.error?.message) {
    const segments = [data.error.message, data.error.code ? `code=${data.error.code}` : "", data.error.param ? `param=${data.error.param}` : ""]
      .filter(Boolean)
      .join(" | ");
    return segments;
  }
  if (typeof data === "string" && data.trim()) return data;
  if (data?.message) return data.message;
  return status ? `请求失败，状态码: ${status}` : "请求失败";
};

const requestJson = async (path: string, body: Record<string, any>) => {
  const response = await axios.post(`${getBaseUrl()}${path}`, body, {
    headers: getHeaders(),
    validateStatus: () => true,
  });
  if (response.status < 200 || response.status >= 300) {
    throw new Error(getErrorMessage(response.data, response.status));
  }
  return response.data;
};

const getModelMeta = (model: any) => model as any;

const getModes = (model: any) => (Array.isArray(getModelMeta(model).mode) ? getModelMeta(model).mode : []) as any[];

const hasImageReferenceMode = (model: any) => {
  const modes = getModes(model);
  return modes.some(
    (mode) =>
      mode === "singleImage" ||
      mode === "startEndRequired" ||
      mode === "endFrameOptional" ||
      mode === "startFrameOptional" ||
      mode === "multiReference" ||
      (Array.isArray(mode) && mode.some((item) => typeof item === "string" && item.startsWith("imageReference:"))),
  );
};

const allowsInputType = (model: any, inputType: string) => {
  const allowedInputTypes = (getModelMeta(model).allowedInputTypes ?? []) as string[];
  if (allowedInputTypes.includes(inputType)) return true;
  if (inputType === "image_url") return hasImageReferenceMode(model);
  if (inputType === "text") return getModes(model).includes("text");
  return false;
};

const getReferenceLimits = (model: any) => {
  const metaLimits = getModelMeta(model).referenceImageLimits;
  if (metaLimits && (metaLimits.min > 0 || metaLimits.max > 0 || !hasImageReferenceMode(model))) {
    return metaLimits;
  }

  const modes = getModes(model);
  const supportsText = modes.includes("text");
  const maxFromArray = modes.reduce((max, mode) => {
    if (!Array.isArray(mode)) return max;
    const imageLimit = mode
      .filter((item) => typeof item === "string" && item.startsWith("imageReference:"))
      .map((item) => Number(String(item).split(":")[1]))
      .filter((value) => Number.isFinite(value));
    return imageLimit.length > 0 ? Math.max(max, ...imageLimit) : max;
  }, 0);

  let max = 0;
  if (modes.includes("singleImage")) max = Math.max(max, 1);
  if (modes.includes("startEndRequired") || modes.includes("endFrameOptional") || modes.includes("startFrameOptional")) max = Math.max(max, 2);
  if (modes.includes("multiReference")) max = Math.max(max, 2);
  if (maxFromArray > 0) max = Math.max(max, maxFromArray);

  if (max === 0) return { min: 0, max: 0 };
  if (supportsText) return { min: 0, max };
  if (modes.includes("startEndRequired") && !modes.includes("singleImage")) return { min: 2, max };
  return { min: 1, max };
};

const parseResolution = (resolution: string) => {
  const match = resolution.match(/^(\d+)x(\d+)$/i);
  if (!match) throw new Error(`无效分辨率: ${resolution}`);
  const width = Number(match[1]);
  const height = Number(match[2]);
  return { width, height, ratio: width / height, maxEdge: Math.max(width, height) };
};

const aspectRatioToNumber = (aspectRatio: string) => {
  const [width, height] = aspectRatio.split(":").map((item) => Number(item));
  if (!width || !height) throw new Error(`无效比例: ${aspectRatio}`);
  return width / height;
};

const matchesAspectRatio = (resolution: string, aspectRatio: string) => {
  const target = aspectRatioToNumber(aspectRatio);
  const current = parseResolution(resolution).ratio;
  return Math.abs(current - target) <= 0.05;
};

const getSizeBucket = (resolution: string): ImageConfig["size"] => {
  const { maxEdge } = parseResolution(resolution);
  if (maxEdge <= 1280) return "1K";
  if (maxEdge <= 2048) return "2K";
  return "4K";
};

const pickImageResolution = (size: ImageConfig["size"], aspectRatio: string, model: any) => {
  const supportedResolutions = (getModelMeta(model).supportedResolutions ?? []) as string[];
  const matchedAspectRatio = supportedResolutions.filter((resolution) => matchesAspectRatio(resolution, aspectRatio));
  if (matchedAspectRatio.length === 0) {
    throw new Error(`模型 ${model.modelName} 不支持比例 ${aspectRatio}`);
  }
  const matchedSize = matchedAspectRatio.filter((resolution) => getSizeBucket(resolution) === size);
  if (matchedSize.length === 0) {
    throw new Error(`模型 ${model.modelName} 不支持尺寸档位 ${size} 与比例 ${aspectRatio} 的组合`);
  }
  return matchedSize.sort((a, b) => parseResolution(b).maxEdge - parseResolution(a).maxEdge)[0];
};

const pickVideoResolution = (resolution: string, model: any) => {
  const supportedResolutions = (getModelMeta(model).supportedResolutions ?? []) as string[];
  if (!supportedResolutions.includes(resolution)) {
    throw new Error(`模型 ${model.modelName} 不支持分辨率 ${resolution}`);
  }
  return resolution;
};

const ensureImageDataUrl = async (value: string) => {
  if (!value) return value;
  if (value.startsWith("data:")) return value;
  if (/^https?:\/\//i.test(value)) return await urlToBase64(value);
  return `data:image/png;base64,${value}`;
};

const normalizeImageReferences = async (referenceList: { base64: string }[] | undefined, model: any) => {
  const imageRefs = (await Promise.all((referenceList ?? []).map(async (item) => await ensureImageDataUrl(item.base64)))).filter(Boolean);
  if (imageRefs.length > 0 && !allowsInputType(model, "image_url")) {
    throw new Error(`模型 ${model.modelName} 不支持参考图输入`);
  }
  const limits = getReferenceLimits(model);
  if (imageRefs.length < limits.min) {
    throw new Error(`模型 ${model.modelName} 至少需要 ${limits.min} 张参考图`);
  }
  if (limits.max >= 0 && imageRefs.length > limits.max) {
    throw new Error(`模型 ${model.modelName} 最多支持 ${limits.max} 张参考图`);
  }
  return imageRefs;
};

const buildUserMessage = (prompt: string, imageRefs: string[]) => {
  const content: any[] = [];
  if (prompt.trim()) {
    content.push({ type: "text", text: prompt.trim() });
  }
  imageRefs.forEach((url) => {
    content.push({
      type: "image_url",
      image_url: { url },
    });
  });
  if (content.length === 0) {
    throw new Error("缺少有效输入内容");
  }
  return { role: "user", content };
};

const extractMediaResult = async (data: any, type: "image" | "video" | "audio") => {
  const value =
    type === "image"
      ? data?.media?.images?.[0]
      : type === "video"
        ? data?.media?.videos?.[0]
        : data?.media?.audios?.[0];
  if (!value || typeof value !== "string") {
    throw new Error(`未从 uni-media 响应中获取到${type === "image" ? "图片" : type === "video" ? "视频" : "音频"}结果`);
  }
  if (value.startsWith("data:")) return value;
  return await urlToBase64(value);
};

// ============================================================
// 适配器函数
// ============================================================

const textRequest = (model: TextModel, think: boolean, thinkLevel: 0 | 1 | 2 | 3) => {
  throw new Error("uni-media 不支持文本模型");
};

const imageRequest = async (config: ImageConfig, model: ImageModel): Promise<string> => {
  const meta = getModelMeta(model);
  const prompt = (config.prompt || "").trim();
  const imageRefs = await normalizeImageReferences(config.referenceList, meta);

  if (prompt && !allowsInputType(meta, "text")) {
    throw new Error(`模型 ${model.modelName} 不支持文本输入`);
  }
  if (!prompt && imageRefs.length === 0) {
    throw new Error("缺少图片生成提示词");
  }

  const body: Record<string, any> = {
    model: model.modelName,
    messages: [buildUserMessage(prompt, imageRefs)],
    stream: false,
    media_config: {
      resolution: pickImageResolution(config.size, config.aspectRatio, meta),
      output: { store_result: true },
    },
  };

  logger(`[uni-media] 提交图片任务，模型: ${model.modelName}`);
  const data = await requestJson("/chat/completions", body);
  return await extractMediaResult(data, "image");
};

const videoRequest = async (config: VideoConfig, model: VideoModel): Promise<string> => {
  const meta = getModelMeta(model);
  const prompt = (config.prompt || "").trim();
  if (!prompt) {
    throw new Error("缺少视频生成提示词");
  }
  if (!allowsInputType(meta, "text")) {
    throw new Error(`模型 ${model.modelName} 不支持文本输入`);
  }

  const nonImageRefs = (config.referenceList ?? []).filter((item) => item.type !== "image");
  if (nonImageRefs.length > 0) {
    throw new Error(`模型 ${model.modelName} 当前仅支持图片参考输入`);
  }
  const imageRefs = await normalizeImageReferences((config.referenceList ?? []).filter((item) => item.type === "image") as any, meta);

  if ((meta.supportedDurations ?? []).length > 0 && !meta.supportedDurations.includes(config.duration)) {
    throw new Error(`模型 ${model.modelName} 不支持时长 ${config.duration}`);
  }

  const body: Record<string, any> = {
    model: model.modelName,
    messages: [buildUserMessage(prompt, imageRefs)],
    stream: false,
    media_config: {
      resolution: pickVideoResolution(config.resolution, meta),
      duration: config.duration,
      output: { store_result: true },
    },
  };

  logger(`[uni-media] 提交视频任务，模型: ${model.modelName}`);
  const data = await requestJson("/chat/completions", body);
  return await extractMediaResult(data, "video");
};

const ttsRequest = async (config: TTSConfig, model: TTSModel): Promise<string> => {
  throw new Error("uni-media 当前未接入 TTS");
};

const checkForUpdates = async (): Promise<{ hasUpdate: boolean; latestVersion: string; notice: string }> => {
  return { hasUpdate: false, latestVersion: "2.4", notice: "" };
};

const updateVendor = async (): Promise<string> => {
  return "";
};

// ============================================================
// 导出
// ============================================================

exports.vendor = vendor;
exports.textRequest = textRequest;
exports.imageRequest = imageRequest;
exports.videoRequest = videoRequest;
exports.ttsRequest = ttsRequest;
exports.checkForUpdates = checkForUpdates;
exports.updateVendor = updateVendor;

export {};
