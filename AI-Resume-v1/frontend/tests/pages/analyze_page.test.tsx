import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AnalyzePage from "../../src/pages/AnalyzePage";
import { getCopy } from "../../src/i18n";
import { FullAnalysisResult, RunRecord } from "../../src/types";

const copy = getCopy("en");

describe("AnalyzePage", () => {
  beforeEach(() => {
    // 中文注释：为 /llm/config 预置假响应，避免真实网络请求
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        default_model: "deepseek-chat",
        default_api_base: "https://api.deepseek.com",
        has_default_key: false,
        masked_key: null,
      }),
    }) as unknown as typeof fetch;
  });

  it("渲染运行历史并可手动结束运行中的任务", async () => {
    const runs: RunRecord[] = [
      { id: "run-1", status: "running", startedAt: Date.now(), analysisId: null },
    ];

    const onResolveRunningRuns = vi.fn();

    render(
      <AnalyzePage
        analysisResult={null as FullAnalysisResult | null}
        analysisId={null}
        resumeText="r"
        jdText="j"
        onResumeTextChange={vi.fn()}
        onJdTextChange={vi.fn()}
        runs={runs}
        activeRunId={null}
        onStartRun={vi.fn()}
        onUpdateRun={vi.fn()}
        onResolveRunningRuns={onResolveRunningRuns}
        copy={copy}
        onAnalysisResult={vi.fn()}
      />
    );

    // 中文注释：有运行中任务时应出现“手动结束”按钮
    const stopButton = await screen.findByText("手动结束");
    await userEvent.click(stopButton);
    expect(onResolveRunningRuns).toHaveBeenCalledTimes(1);

    // 中文注释：fetch 配置接口应被调用一次
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
