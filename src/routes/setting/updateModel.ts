import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    id: z.number(),
    type: z.enum(["text", "video", "image"]),
    model: z.string(),
    baseUrl: z.string(),
    modelType: z.string(),
    apiKey: z.string(),
    manufacturer: z.string(),
  }),
  async (req, res) => {
    const { id, type, model, baseUrl, apiKey, manufacturer, modelType } = req.body;
    const updateData: Record<string, any> = {
      type,
      model,
      baseUrl,
      manufacturer,
      modelType,
    };
    // 前端可能出于安全不回显 apiKey，提交为空时保留数据库原值
    if (apiKey != null && String(apiKey).trim() !== "") {
      updateData.apiKey = apiKey.trim();
    }
    await u.db("t_config").where("id", id).update(updateData);
    res.status(200).send(success("编辑成功"));
  },
);
