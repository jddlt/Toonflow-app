import express from "express";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import u from "@/utils";
import { z } from "zod";
import { tool } from "ai";
const router = express.Router();

const sampleReferenceImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6p5wAAAABJRU5ErkJggg==";

const createImageReferences = (count: number) =>
  Array.from({ length: count }, () => ({
    type: "image" as const,
    sourceType: "base64" as const,
    base64: sampleReferenceImage,
  }));

const getRequiredImageCount = (selectedModel: any, activeMode?: any) => {
  const minByLimit = Number(selectedModel?.referenceImageLimits?.min ?? 0);
  const multiReferenceMinCount = Number(selectedModel?.multiReferenceMinCount ?? 1);
  const mode = activeMode;
  const modes = Array.isArray(selectedModel?.mode) ? selectedModel.mode : [];
  if (mode === "startEndRequired") return 2;
  if (mode === "endFrameOptional" || mode === "startFrameOptional") return 1;
  if (mode === "singleImage") return 1;
  if (Array.isArray(mode)) return Math.max(multiReferenceMinCount, minByLimit);
  if (mode === "text") return 0;
  if (modes.includes("startEndRequired")) return Math.max(2, minByLimit);
  if (modes.includes("endFrameOptional") || modes.includes("startFrameOptional")) return Math.max(1, minByLimit);
  if (modes.some((item: unknown) => Array.isArray(item))) return Math.max(multiReferenceMinCount, minByLimit);
  if (modes.includes("singleImage") || !modes.includes("text")) return Math.max(1, minByLimit);
  return minByLimit;
};

const getDefaultImageMode = (selectedModel: any) => {
  const modes = Array.isArray(selectedModel?.mode) ? selectedModel.mode : [];
  if (modes.includes("text")) return "text";
  if (modes.includes("singleImage")) return "singleImage";
  if (modes.includes("multiReference")) return "multiReference";
  return modes[0] ?? "text";
};

const getDefaultVideoMode = (selectedModel: any) => {
  const modes = Array.isArray(selectedModel?.mode) ? selectedModel.mode : [];
  if (modes.includes("text") && getRequiredImageCount(selectedModel, "text") === 0) return "text";
  if (modes.includes("singleImage") && getRequiredImageCount(selectedModel, "singleImage") <= 1) return "singleImage";
  if (modes.includes("startEndRequired")) return "startEndRequired";
  if (modes.includes("endFrameOptional")) return "endFrameOptional";
  if (modes.includes("startFrameOptional")) return "startFrameOptional";
  const referenceMode = modes.find((item: unknown) => Array.isArray(item));
  return referenceMode ?? (modes[0] ?? "text");
};

export default router.post(
  "/",
  validateFields({
    modelName: z.string(),
    type: z.enum(["text", "video", "image"]),
    id: z.string(),
    mode: z.any().optional(),
  }),
  async (req, res) => {
    const { modelName, type, id, mode } = req.body;

    try {
      const requestFn: Record<string, { fnName: string; modelData?: any }> = {
        text: { fnName: "textRequest" },
        image: {
          fnName: "imageRequest",
          modelData: {
            prompt:
              "一张16:9比例的图片，完美等分为2x2四宫格布局，各区域无缝衔接：\n左上宫格：一只可爱的猫，毛发蓬松，眼睛明亮，姿态俏皮\n右上宫格：一只友善的狗，金毛犬，表情愉悦，摇着尾巴\n左下宫格：一头健壮的牛，田园背景，目光温和，皮毛光泽\n右下宫格：一匹骏马，姿态优雅，鬃毛飘逸，肌肉健美\n风格要求：四个宫格风格统一，色彩鲜艳饱和，高清画质，细节清晰锐利，专业插画风格，线条干净，统一的左上方光源，柔和阴影，和谐配色，卡通/半写实风格，宫格间用白色或浅灰细线分隔",
            referenceList: [],
            size: "1K",
            aspectRatio: "16:9",
            mode: "text",
          },
        },
        video: { fnName: "videoRequest", modelData: {} },
      } as const;
      const vendorConfigData = await u.db("o_vendorConfig").where("id", id).first();

      if (!vendorConfigData) return res.status(500).send(error("未找到该供应商配置"));
      if (!vendorConfigData.models) return res.status(500).send(error("未找到模型列表"));

      const modelList = await u.vendor.getModelList(vendorConfigData.id!);
      const selectedModel = modelList.find((i: any) => i.modelName == modelName);
      if (!selectedModel) return res.status(500).send(error("未找到该模型"));

      const activeMode = mode ?? (type === "image" ? getDefaultImageMode(selectedModel) : getDefaultVideoMode(selectedModel));
      const imageReferenceList = createImageReferences(getRequiredImageCount(selectedModel, activeMode));
      if (type == "image") {
        requestFn["image"].modelData.referenceList = imageReferenceList;
        requestFn["image"].modelData.mode = activeMode;
      }
      if (type == "video") {
        requestFn["video"].modelData = {
          model: modelName,
          duration: selectedModel.durationResolutionMap[0].duration[0],
          resolution: selectedModel.durationResolutionMap[0].resolution[0],
          aspectRatio: "16:9",
          prompt:
            "A shirtless middle-aged man with a horse head is standing in a supermarket, carefully comparing two identical bottles of shampoo for 3 seconds, then suddenly bursts into tears, drops to his knees dramatically, a flock of pigeons explodes out of nowhere from behind him, the supermarket lights flicker, an old grandma nearby continues shopping completely unbothered, the horse head man instantly stops crying, puts both shampoo bottles back, and moonwalks away disappearing into the vegetable section. Security camera footage style, slightly grainy, 5 seconds.",
          referenceList: imageReferenceList,
          audio: false,
          mode: activeMode,
        };
      }
      const reqConfig = requestFn[type as "text" | "video" | "image"];

      const getWeatherTool = tool({
        description: "Get the weather in a location",
        inputSchema: z.object({
          location: z.string().describe("The location to get the weather for"),
        }),
        execute: async ({ location }) => {
          return {
            location,
            temperature: 72 + Math.floor(Math.random() * 21) - 10,
          };
        },
      });

      if (type == "text") {
        const { textStream } = await u.Ai.Text(`${id}:${modelName}`).stream({
          prompt: "请调用工具获取火星的天气，并回答我多少气温",
          tools: { getWeatherTool },
        });
        let fullResponse = "";
        for await (const chunk of textStream) {
          fullResponse += chunk;
        }
        if (!fullResponse) return res.status(500).send(error("模型未返回结果"));
        res.status(200).send(success(fullResponse));
      } else {
        const aiTypeFn = {
          image: "Image",
          video: "Video",
        } as const;
        const reqFn = await u.Ai[aiTypeFn[type as "image" | "video"]](`${id}:${modelName}`).run({
          ...reqConfig.modelData,
        });
        await reqFn.save(type == "video" ? "test.mp4" : "testImage.jpg");
        const resultUrl = await u.oss.getFileUrl(type == "video" ? "test.mp4" : "testImage.jpg");
        res.status(200).send(success(resultUrl));
      }
    } catch (err) {
      console.error(err);
      const msg = u.error(err).message;
      console.error(msg);
      res.status(500).send(error(msg));
    }
  },
);
