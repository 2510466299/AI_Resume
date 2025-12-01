# 流水线概览

1. **解析 (Parse)**：提取简历与 JD 的结构化画像（技能、经历）。
2. **差距分析 (Gap Analysis)**：计算 Importance × Attainability，输出优先级。
3. **映射矩阵 (Mapping)**：JD 要点覆盖度矩阵，标记 Full/Partial/None。
4. **规划 (Planning)**：生成多阶段学习计划（目标、时长、资源）。
5. **定制 (Customization)**：基于 JD 生成 Markdown 简历草稿。
6. **持久化**：结果与草稿保存到 SQLite（`analysis.db`），支持历史加载与二次编辑。
