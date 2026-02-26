import u from "@/utils";

export default async function deleteOutline(id: number, projectId: number) {
  const targetOutlineData = await u.db("t_outline").where("id", id).select("data").first();
  if (!targetOutlineData) throw new Error("大纲不存在");

  // 筛选出该大纲特有的资产
  const allOutlineDataList = await u.db("t_outline").where("projectId", projectId).andWhere("id", "!=", id).select("data");

  // 找出目标ID大纲特有的资产名称
  const allOutlineData = allOutlineDataList
    .map((item) => {
      try {
        const data = JSON.parse(item?.data || "{}");
        const characters = Array.isArray((data as any).characters) ? (data as any).characters : [];
        const props = Array.isArray((data as any).props) ? (data as any).props : [];
        const scenes = Array.isArray((data as any).scenes) ? (data as any).scenes : [];
        return [...characters, ...props, ...scenes].map((it: any) => it.name);
      } catch {
        return [];
      }
    })
    .flat();

  let targetOutLineNames: any = {};
  try {
    targetOutLineNames = JSON.parse(targetOutlineData?.data || "{}");
  } catch {
    targetOutLineNames = {};
  }

  const targetCharacters = Array.isArray(targetOutLineNames.characters) ? targetOutLineNames.characters : [];
  const targetProps = Array.isArray(targetOutLineNames.props) ? targetOutLineNames.props : [];
  const targetScenes = Array.isArray(targetOutLineNames.scenes) ? targetOutLineNames.scenes : [];

  const targetNames = [...targetCharacters, ...targetProps, ...targetScenes].map((item: any) => item.name);

  const diffAssetsNames = targetNames.filter((item) => !allOutlineData.includes(item));

  // 无论是否有独占资产，都必须删除大纲本身以及关联剧本
  await u.db("t_outline").where("id", id).del();
  await u.db("t_script").where("outlineId", id).del();

  // 仅当存在独占资产时，才删除对应资产记录
  if (diffAssetsNames.length) {
    await u.db("t_assets").where("projectId", projectId).whereIn("name", diffAssetsNames).del();
  }
}
