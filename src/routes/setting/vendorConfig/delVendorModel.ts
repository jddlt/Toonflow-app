import express from "express";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import u from "@/utils";
import { removeVendorModel, serializeStoredVendorModels } from "@/utils/vendorModelStore";
import { z } from "zod";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    id: z.string(),
    modelName: z.string(),
  }),
  async (req, res) => {
    const { id, modelName } = req.body;

    const vendorConfig = await u.db("o_vendorConfig").where("id", id).first("models");
    if (!vendorConfig) return res.status(404).send(error("未找到该供应商配置"));

    const nextModels = removeVendorModel(vendorConfig.models, modelName);
    await u
      .db("o_vendorConfig")
      .where("id", id)
      .update({
        models: serializeStoredVendorModels(nextModels),
      });

    res.status(200).send(success("更新成功"));
  },
);
