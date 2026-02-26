import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { generateScript, Episode } from "@/utils/generateScript";
const router = express.Router();
interface NovelChapter {
  id: number;
  reel: string;
  chapter: string;
  chapterData: string;
  projectId: number;
}
function mergeNovelText(novelData: NovelChapter[]): string {
  if (!Array.isArray(novelData)) return "";
  return novelData
    .map((chap) => {
      return `${chap.chapter.trim()}\n\n${chap.chapterData.trim().replace(/\r?\n/g, "\n")}\n`;
    })
    .join("\n");
}

// 生成剧本
export default router.post(
  "/",
  validateFields({
    outlineId: z.number(),
    scriptId: z.number(),
  }),
  async (req, res) => {
    try {
      const { outlineId, scriptId } = req.body;
      const outlineData = await u.db("t_outline").where("id", outlineId).select("*").first();
      if (!outlineData) return res.status(500).send(success({ message: "大纲为空" }));

      let parameter: Episode;
      try {
        parameter = JSON.parse(outlineData.data!) as Episode;
      } catch (e: any) {
        return res
          .status(500)
          .send({ message: `大纲数据解析失败，请重新生成大纲：${e?.message || "JSON 解析错误"}` });
      }

      if (
        !parameter ||
        !Array.isArray(parameter.chapterRange) ||
        parameter.chapterRange.length === 0
      ) {
        return res
          .status(500)
          .send({ message: "大纲章节范围为空或格式错误，请返回大纲页为该集绑定章节后重试" });
      }

      const chapterRange = parameter.chapterRange
        .map((v) => Number(v))
        .filter((v) => Number.isFinite(v));

      if (chapterRange.length === 0) {
        return res
          .status(500)
          .send({ message: "大纲章节范围解析为空，请检查章节选择是否正确" });
      }

      const novelData = (await u
        .db("t_novel")
        .whereIn("chapterIndex", chapterRange)
        .where("projectId", outlineData.projectId)
        .select("*")) as NovelChapter[];

      if (novelData.length === 0)
        return res.status(500).send(success({ message: "原文为空" }));

      const result: string = mergeNovelText(novelData);

      const data = await generateScript(parameter, result ?? "");
      if (!data) return res.status(500).send({ message: "生成剧本失败：AI 返回内容为空" });

      await u.db("t_script").where("id", scriptId).update({
        content: data,
      });

      res.status(200).send(success({ message: "生成剧本成功" }));
    } catch (e: any) {
      console.error("generateScriptApi error", e);
      res
        .status(500)
        .send({ message: `生成剧本异常，请稍后重试：${e?.message || "未知错误"}` });
    }
  },
);
