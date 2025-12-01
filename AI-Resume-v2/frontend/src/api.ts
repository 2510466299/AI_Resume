import type {
  AnalyzePayload,
  FullAnalysisResult,
  HistoryItem,
  StreamEvent,
} from "./types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export function startAnalysisStream(
  payload: AnalyzePayload,
  onEvent: (eventName: string, event: StreamEvent) => void,
  onDone: () => void,
  onError: (err: Error) => void
) {
  const controller = new AbortController();
  (async () => {
    try {
      const response = await fetch(`${API_BASE}/analyze/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.body) {
        throw new Error("无法读取 SSE 响应流");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const segments = buffer.split("\n\n");
        buffer = segments.pop() ?? "";
        for (const segment of segments) {
          const lines = segment.split("\n");
          let eventName = "message";
          let dataStr = "";
          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventName = line.replace("event:", "").trim();
            }
            if (line.startsWith("data:")) {
              dataStr += line.replace("data:", "").trim();
            }
          }
          if (dataStr) {
            try {
              const evt = JSON.parse(dataStr) as StreamEvent;
              onEvent(eventName, evt);
            } catch (err) {
              console.error("解析 SSE 失败", err, dataStr);
            }
          }
        }
      }
      onDone();
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      onError(err as Error);
    }
  })();
  return controller;
}

export async function saveDraft(
  analysisId: string,
  payload: Partial<{
    learning_plan: FullAnalysisResult["learning_plan"];
    custom_resume_markdown: string;
  }>
) {
  await fetch(`${API_BASE}/analysis/${analysisId}/draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function fetchHistory(): Promise<HistoryItem[]> {
  const res = await fetch(`${API_BASE}/history`);
  if (!res.ok) throw new Error("获取历史失败");
  return res.json();
}

export async function fetchAnalysis(
  id: string
): Promise<{
  id: string;
  created_at: string;
  result: FullAnalysisResult;
  draft_learning_plan?: FullAnalysisResult["learning_plan"];
  draft_resume?: string | null;
}> {
  const res = await fetch(`${API_BASE}/analysis/${id}`);
  if (!res.ok) throw new Error("记录不存在");
  return res.json();
}

export async function regenerateResume(payload: {
  analysis_id?: string | null;
  resume_text: string;
  jd_text: string;
  base_url?: string;
  api_key?: string;
  model?: string;
}): Promise<string> {
  const res = await fetch(`${API_BASE}/resume/customize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("生成失败");
  const data = await res.json();
  return data.markdown as string;
}
